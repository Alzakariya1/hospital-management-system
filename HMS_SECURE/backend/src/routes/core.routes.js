const express = require('express');
const { Doctor, Department, Appointment, Patient, Bed, Billing, AuditLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { attachTenant, tenantFilter, tenantCreateData } = require('../middleware/tenant');
const multer = require('multer');
const { cloudinary, hasCloudinaryConfig } = require('../config/cloudinary');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
});

function fileToDataUrl(file) {
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

async function uploadBufferToCloudinary(file, options) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, uploadResult) => {
            if (error) reject(error);
            else resolve(uploadResult);
        });
        stream.end(file.buffer);
    });
}

async function safelyDestroyCloudinary(publicId, resourceType = 'auto') {
    if (!publicId || !hasCloudinaryConfig()) return;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
        console.warn('Cloudinary cleanup skipped:', error?.message || error);
    }
}
router.use(verifyToken, attachTenant);

async function withNames(req, rows) {
    const plainRows = rows.map(x => x.toJSON?.() || x);
    const patientIds = [...new Set(plainRows.map(x => x.patient_id).filter(Boolean))];
    const doctorIds = [...new Set(plainRows.map(x => x.doctor_id).filter(Boolean))];

    const patients = await Patient.find(tenantFilter(req, {
        $or: [
            { id: { $in: patientIds.map(Number).filter(n => !Number.isNaN(n)) } },
            { patient_id: { $in: patientIds } }
        ]
    })).lean();

    const doctors = await Doctor.find(tenantFilter(req, {
        $or: [
            { id: { $in: doctorIds.map(Number).filter(n => !Number.isNaN(n)) } },
            { doctor_id: { $in: doctorIds } }
        ]
    })).lean();

    const pm = Object.fromEntries([
        ...patients.map(p => [String(p.id), p.full_name]),
        ...patients.map(p => [String(p.patient_id), p.full_name])
    ]);

    const dm = Object.fromEntries([
        ...doctors.map(d => [String(d.id), d.full_name]),
        ...doctors.map(d => [String(d.doctor_id), d.full_name])
    ]);

    return plainRows.map(obj => ({
        ...obj,
        patient_name: pm[String(obj.patient_id)] || '',
        doctor_name: dm[String(obj.doctor_id)] || ''
    }));
}

router.get('/doctors', requirePermission('doctor.view'), asyncHandler(async (req, res) => {
    const rows = await Doctor.find(tenantFilter(req)).sort({ id: -1 }).lean();
    const deps = await Department.find(tenantFilter(req)).lean();
    const dm = Object.fromEntries(deps.map(d => [d.id, d.department_name]));
    res.json(rows.map(d => ({ ...d, department_name: dm[d.department_id] })));
}));


router.get('/doctors/:id', requirePermission('doctor.view'), asyncHandler(async (req, res) => {
    const doctorNumericId = Number(req.params.id);
    if (!Number.isFinite(doctorNumericId)) {
        return res.status(400).json({ message: 'Invalid doctor id' });
    }

    const doctor = await Doctor.findOne(tenantFilter(req, { id: doctorNumericId })).lean();
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    let departmentName = '';
    if (doctor.department_id) {
        const department = await Department.findOne(tenantFilter(req, { id: Number(doctor.department_id) })).lean();
        departmentName = department?.department_name || '';
    }

    const doctorAppointments = await Appointment.find(tenantFilter(req, {
        $or: [
            { doctor_id: String(doctor.doctor_id || '') },
            { doctor_id: String(doctor.id || '') },
            { doctor_id: doctor.doctor_id },
            { doctor_id: doctor.id },
        ],
    })).sort({ appointment_date: -1, appointment_time: -1 }).limit(20).lean();

    res.json({ ...doctor, department_name: departmentName, appointments: doctorAppointments });
}));

router.post('/doctors', requirePermission('doctor.create'), asyncHandler(async (req, res) => {
    const uid = req.body.doctor_uid || `DOC-${Date.now()}`;
    const r = await Doctor.create(tenantCreateData(req, { ...req.body, doctor_uid: uid, status: req.body.status || 'active' }));
    res.status(201).json({ message: 'Doctor created', id: r.id, doctor_uid: uid });
}));

router.put('/doctors/:id', requirePermission('doctor.edit'), asyncHandler(async (req, res) => {
    const doctorNumericId = Number(req.params.id);
    if (!Number.isFinite(doctorNumericId)) {
        return res.status(400).json({ message: 'Invalid doctor id' });
    }

    const allowed = [
        'doctor_id',
        'full_name',
        'email',
        'phone',
        'specialization',
        'qualification',
        'consultation_fee',
        'department_id',
        'status',
        'license_number',
        'registration_number',
    ];
    const update = {};
    allowed.forEach(k => {
        if (k in req.body) update[k] = typeof req.body[k] === 'string' ? req.body[k].trim() : req.body[k];
    });

    if (!Object.keys(update).length) return res.status(400).json({ message: 'No valid fields' });

    const existingDoctor = await Doctor.findOne(tenantFilter(req, { id: doctorNumericId })).lean();
    if (!existingDoctor) return res.status(404).json({ message: 'Doctor not found' });

    if (Object.prototype.hasOwnProperty.call(update, 'doctor_id') && update.doctor_id) {
        const duplicateDoctor = await Doctor.findOne(tenantFilter(req, {
            doctor_id: update.doctor_id,
            id: { $ne: doctorNumericId },
        })).lean();

        if (duplicateDoctor) {
            return res.status(409).json({
                message: `Doctor ID already exists for ${duplicateDoctor.full_name || 'another doctor'}: ${update.doctor_id}`,
            });
        }
    }

    try {
        const updated = await Doctor.findOneAndUpdate(
            tenantFilter(req, { id: doctorNumericId }),
            { $set: update },
            { new: true, runValidators: true },
        ).lean();
        res.json({ message: 'Doctor updated', doctor: updated });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                message: 'Doctor ID already exists in this hospital. Please use a different Doctor ID.',
            });
        }
        throw error;
    }
}));


router.post('/doctors/:id/profile-image', requirePermission('doctor.edit'), upload.single('profile_image'), asyncHandler(async (req, res) => {
    const doctorNumericId = Number(req.params.id);
    if (!Number.isFinite(doctorNumericId)) {
        return res.status(400).json({ message: 'Invalid doctor id' });
    }

    const doctor = await Doctor.findOne(tenantFilter(req, { id: doctorNumericId }));
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    if (!req.file) {
        return res.status(400).json({ message: 'Profile image is required' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'Only JPG, PNG, and WEBP images are allowed' });
    }

    try {
        await safelyDestroyCloudinary(doctor.profile_image_public_id, 'image');

        let profileImageUrl;
        let profileImagePublicId = '';
        let profileImageStorage = 'database';

        if (hasCloudinaryConfig()) {
            const result = await uploadBufferToCloudinary(req.file, {
                folder: 'hms/doctor-profile-images',
                resource_type: 'image',
            });
            profileImageUrl = result.secure_url;
            profileImagePublicId = result.public_id;
            profileImageStorage = 'cloudinary';
        } else {
            profileImageUrl = fileToDataUrl(req.file);
        }

        doctor.profile_image_url = profileImageUrl;
        doctor.profile_image_public_id = profileImagePublicId;
        doctor.profile_image_storage = profileImageStorage;
        await doctor.save();

        res.json({
            message: profileImageStorage === 'cloudinary'
                ? 'Doctor profile image uploaded successfully'
                : 'Doctor profile image saved successfully. Cloudinary is not configured, so the file was stored in MongoDB.',
            profile_image_url: doctor.profile_image_url,
            profile_image_public_id: doctor.profile_image_public_id,
            storage: profileImageStorage,
            doctor: doctor.toJSON(),
        });
    } catch (error) {
        console.error('Doctor profile image upload failed:', error);
        res.status(500).json({ message: error?.message || 'Doctor profile image upload failed' });
    }
}));


router.post('/doctors/:id/documents', requirePermission('doctor.document.manage'), upload.single('document'), asyncHandler(async (req, res) => {
    const doctorNumericId = Number(req.params.id);
    if (!Number.isFinite(doctorNumericId)) {
        return res.status(400).json({ message: 'Invalid doctor id' });
    }

    const doctor = await Doctor.findOne(tenantFilter(req, { id: doctorNumericId }));
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    if (!req.file) {
        return res.status(400).json({ message: 'Document file is required' });
    }

    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'Only PDF, DOC, DOCX, JPG, PNG, and WEBP files are allowed' });
    }

    try {
        let fileUrl;
        let filePublicId = '';
        let storage = 'database';

        if (hasCloudinaryConfig()) {
            const result = await uploadBufferToCloudinary(req.file, {
                folder: 'hms/doctor-documents',
                resource_type: 'auto',
            });
            fileUrl = result.secure_url;
            filePublicId = result.public_id;
            storage = 'cloudinary';
        } else {
            fileUrl = fileToDataUrl(req.file);
        }

        const newDoc = {
            title: req.body.title || req.file.originalname,
            category: req.body.category || 'credential',
            document_type: req.body.document_type || 'Certificate',
            notes: req.body.notes || '',
            file_name: req.file.originalname,
            file_type: req.file.mimetype,
            file_size: req.file.size,
            file_url: fileUrl,
            file_public_id: filePublicId,
            storage,
            uploaded_at: new Date(),
        };

        doctor.certificates = doctor.certificates || [];
        doctor.certificates.push(newDoc);
        await doctor.save();

        res.status(201).json({
            message: storage === 'cloudinary' ? 'Doctor document uploaded successfully' : 'Doctor document saved successfully. Cloudinary is not configured, so the file was stored in MongoDB.',
            document: newDoc,
            certificates: doctor.certificates,
            doctor: doctor.toJSON(),
        });
    } catch (error) {
        console.error('Doctor document upload failed:', error);
        res.status(500).json({ message: error?.message || 'Doctor document upload failed' });
    }
}));

router.delete('/doctors/:id/documents/:docIndex', requirePermission('doctor.document.manage'), asyncHandler(async (req, res) => {
    const doctorNumericId = Number(req.params.id);
    const docIndex = Number(req.params.docIndex);

    if (!Number.isFinite(doctorNumericId) || !Number.isInteger(docIndex) || docIndex < 0) {
        return res.status(400).json({ message: 'Invalid doctor document request' });
    }

    const doctor = await Doctor.findOne(tenantFilter(req, { id: doctorNumericId }));
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const doc = doctor.certificates?.[docIndex];
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    try {
        await safelyDestroyCloudinary(doc.file_public_id, 'auto');

        doctor.certificates.splice(docIndex, 1);
        await doctor.save();

        res.json({
            message: 'Doctor document deleted successfully',
            certificates: doctor.certificates,
            doctor: doctor.toJSON(),
        });
    } catch (error) {
        console.error('Doctor document delete failed:', error);
        res.status(500).json({ message: 'Doctor document delete failed' });
    }
}));

router.delete('/doctors/:id', requirePermission('doctor.delete'), asyncHandler(async (req, res) => {
    const result = await Doctor.deleteOne(tenantFilter(req, { id: Number(req.params.id) }));
    if (!result.deletedCount) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: 'Doctor deleted' });
}));

router.get('/departments', requirePermission('dashboard.view'), asyncHandler(async (req, res) => {
    res.json(await Department.find(tenantFilter(req)).sort({ department_name: 1 }));
}));

router.post('/departments', requirePermission('doctor.create'), asyncHandler(async (req, res) => {
    const r = await Department.create(tenantCreateData(req, { department_name: req.body.department_name, description: req.body.description || null }));
    res.status(201).json({ message: 'Department created', id: r.id });
}));

router.get('/appointments', requirePermission('appointment.view'), asyncHandler(async (req, res) => {
    res.json(await withNames(req, await Appointment.find(tenantFilter(req)).sort({ appointment_date: -1, appointment_time: -1 })));
}));

router.post('/appointments', requirePermission('appointment.create'), asyncHandler(async (req, res) => {
    const uid = req.body.appointment_uid || `APT-${Date.now()}`;
    const r = await Appointment.create(tenantCreateData(req, { ...req.body, appointment_uid: uid, appointment_type: req.body.appointment_type || 'normal', status: req.body.status || 'pending' }));
    res.status(201).json({ message: 'Appointment created', id: r.id, appointment_uid: uid });
}));

router.patch('/appointments/:id/status', requirePermission('appointment.status.update'), asyncHandler(async (req, res) => {
    await Appointment.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: { status: req.body.status } });
    res.json({ message: 'Appointment status updated' });
}));

router.put('/appointments/:id', requirePermission('appointment.edit'), asyncHandler(async (req, res) => {
    const allowed = ['patient_id', 'doctor_id', 'appointment_date', 'appointment_time', 'status', 'notes', 'appointment_type'];
    const update = {};
    allowed.forEach(k => { if (k in req.body) update[k] = req.body[k]; });
    if (!Object.keys(update).length) return res.status(400).json({ message: 'No valid fields' });
    await Appointment.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: update });
    res.json({ message: 'Appointment updated' });
}));

router.delete('/appointments/:id', requirePermission('appointment.delete'), asyncHandler(async (req, res) => {
    await Appointment.deleteOne(tenantFilter(req, { id: Number(req.params.id) }));
    res.json({ message: 'Appointment deleted' });
}));

router.get('/beds', requirePermission('bed.view'), asyncHandler(async (req, res) => {
    res.json(await Bed.find(tenantFilter(req)).sort({ bed_number: 1 }));
}));

router.post('/beds', requirePermission('bed.create'), asyncHandler(async (req, res) => {
    const r = await Bed.create(tenantCreateData(req, { ...req.body, status: req.body.status || 'available' }));
    res.status(201).json({ message: 'Bed created', id: r.id });
}));

router.patch('/beds/:id/status', requirePermission('bed.status.update'), asyncHandler(async (req, res) => {
    await Bed.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: { status: req.body.status } });
    res.json({ message: 'Bed status updated' });
}));

router.get('/dashboard/stats', requirePermission('dashboard.view'), asyncHandler(async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const [totalPatients, totalDoctors, appointmentsToday, availableBeds, bills, activity] = await Promise.all([
        Patient.countDocuments(tenantFilter(req)),
        Doctor.countDocuments(tenantFilter(req)),
        Appointment.countDocuments(tenantFilter(req, { appointment_date: today })),
        Bed.countDocuments(tenantFilter(req, { status: 'available' })),
        Billing.find(tenantFilter(req, { billing_date: { $gte: new Date(today) } })).lean(),
        AuditLog.find(tenantFilter(req)).sort({ id: -1 }).limit(10).lean()
    ]);
    res.json({
        totalPatients,
        totalDoctors,
        appointmentsToday,
        availableBeds,
        dailyRevenue: bills.reduce((s, b) => s + Number(b.paid_amount || 0), 0),
        recentActivity: activity
    });
}));

module.exports = router;
