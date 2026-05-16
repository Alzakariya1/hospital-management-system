const express = require("express");
const { Patient, Appointment, OpdRecord, Prescription, Billing, LabTest, RadiologyTest, IpdAdmission } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { verifyToken, requirePermission } = require("../middleware/auth");
const { attachTenant, tenantFilter, tenantCreateData } = require("../middleware/tenant");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
router.use(verifyToken, attachTenant);
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

function patientIdentityFilter(patient) {
    const keys = [patient.patient_id, String(patient.id)].filter(Boolean);
    const numericIds = keys.map(Number).filter((n) => !Number.isNaN(n));
    return {
        $or: [
            { patient_id: { $in: keys } },
            { patient_id: { $in: numericIds } },
        ],
    };
}

function formatTimelineItem(type, title, date, payload = {}) {
    return {
        type,
        title,
        date: date || payload.created_at || payload.updated_at || new Date(0),
        status: payload.status || payload.payment_status || '',
        payload,
    };
}

async function buildPatientTimeline(req, patient) {
    const baseFilter = tenantFilter(req, patientIdentityFilter(patient));
    const [appointments, opdRecords, prescriptions, bills, labTests, radiologyTests, admissions] = await Promise.all([
        Appointment.find(baseFilter).sort({ appointment_date: -1, appointment_time: -1, id: -1 }).lean(),
        OpdRecord.find(baseFilter).sort({ visit_date: -1, id: -1 }).lean(),
        Prescription.find(baseFilter).sort({ visit_date: -1, id: -1 }).lean(),
        Billing.find(baseFilter).sort({ billing_date: -1, id: -1 }).lean(),
        LabTest.find(baseFilter).sort({ created_at: -1, id: -1 }).lean(),
        RadiologyTest.find(baseFilter).sort({ created_at: -1, id: -1 }).lean(),
        IpdAdmission.find(baseFilter).sort({ admission_date: -1, id: -1 }).lean(),
    ]);

    const documents = (patient.documents || []).map((doc, index) => formatTimelineItem(
        'document',
        doc.title || doc.file_name || `Document ${index + 1}`,
        doc.uploaded_at,
        { ...doc, id: index },
    ));

    const timeline = [
        ...appointments.map((a) => formatTimelineItem(
            'appointment',
            `${a.appointment_type || 'OPD'} appointment`,
            `${a.appointment_date || ''} ${a.appointment_time || ''}`.trim() || a.created_at,
            a,
        )),
        ...opdRecords.map((o) => formatTimelineItem('opd', 'OPD consultation', o.visit_date || o.created_at, o)),
        ...prescriptions.map((rx) => formatTimelineItem('prescription', rx.prescription_number || 'Prescription', rx.visit_date || rx.created_at, rx)),
        ...bills.map((b) => formatTimelineItem('billing', b.invoice_number || 'Billing record', b.billing_date || b.created_at, b)),
        ...labTests.map((l) => formatTimelineItem('lab', l.test_name || l.name || 'Lab test', l.created_at, l)),
        ...radiologyTests.map((r) => formatTimelineItem('radiology', r.scan_name || r.name || 'Radiology record', r.created_at, r)),
        ...admissions.map((i) => formatTimelineItem('ipd', 'IPD admission', i.admission_date || i.created_at, i)),
        ...documents,
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return {
        patient,
        summary: {
            appointments: appointments.length,
            consultations: opdRecords.length,
            prescriptions: prescriptions.length,
            bills: bills.length,
            labTests: labTests.length,
            radiologyTests: radiologyTests.length,
            admissions: admissions.length,
            documents: documents.length,
        },
        timeline,
        appointments,
        opdRecords,
        prescriptions,
        bills,
        labTests,
        radiologyTests,
        admissions,
        documents,
    };
}

router.get(
    "/",
    requirePermission("patient.view"),
    asyncHandler(async (req, res) =>
        res.json(await Patient.find(tenantFilter(req)).sort({ id: -1 })),
    ),
);

router.get(
    "/:id/timeline",
    requirePermission("patient.view"),
    asyncHandler(async (req, res) => {
        const patient = await Patient.findOne(tenantFilter(req, { id: Number(req.params.id) })).lean();
        if (!patient) return res.status(404).json({ message: "Patient not found" });
        res.json(await buildPatientTimeline(req, patient));
    }),
);
router.get(
    "/:id",
    requirePermission("patient.view"),
    asyncHandler(async (req, res) => {
        const r = await Patient.findOne(tenantFilter(req, { id: Number(req.params.id) }));
        if (!r) return res.status(404).json({ message: "Patient not found" });
        res.json(r);
    }),
);
router.post(
    "/",
    requirePermission("patient.create"),
    asyncHandler(async (req, res) => {
        const uid = req.body.patient_uid || `PAT-${Date.now()}`;
        const r = await Patient.create(tenantCreateData(req, { ...req.body, patient_uid: uid }));
        res
            .status(201)
            .json({ message: "Patient created", id: r.id, patient_uid: uid });
    }),
);
router.put(
    "/:id",
    requirePermission("patient.edit"),
    asyncHandler(async (req, res) => {
        const allowed = [
            "patient_id",
            "full_name",
            "age",
            "gender",
            "phone",
            "email",
            "address",
            "blood_group",
            "medical_notes",

            "emergency_contact_name",
            "emergency_contact_phone",
            "insurance_provider",
            "insurance_policy_number",

            "documents",
        ];
        const update = {};
        allowed.forEach((k) => {
            if (k in req.body) update[k] = req.body[k];
        });
        if (!Object.keys(update).length)
            return res.status(400).json({ message: "No valid fields to update" });
        await Patient.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: update });
        res.json({ message: "Patient updated" });
    }),
);
router.post(
    "/:id/documents",
    requirePermission("patient.document.manage"),
    upload.single("document"),
    asyncHandler(async (req, res) => {
        const patient = await Patient.findOne(tenantFilter(req, { id: Number(req.params.id) }));

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Document file is required" });
        }

        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "hms/patient-documents",
                    resource_type: "auto",
                },
                (error, uploadResult) => {
                    if (error) reject(error);
                    else resolve(uploadResult);
                },
            );

            stream.end(req.file.buffer);
        });

        const newDoc = {
            title: req.body.title || req.file.originalname,
            category: req.body.category || "medical",
            document_type: req.body.document_type || "Other",
            notes: req.body.notes || "",
            file_name: req.file.originalname,
            file_type: req.file.mimetype,
            file_size: req.file.size,
            file_url: result.secure_url,
            file_public_id: result.public_id,
            uploaded_at: new Date(),
        };

        patient.documents = patient.documents || [];
        patient.documents.push(newDoc);

        await patient.save();

        res.status(201).json({
            message: "Document uploaded successfully",
            document: newDoc,
            documents: patient.documents,
        });
    }),
);
router.post(
    "/:id/profile-image",
    requirePermission("patient.document.manage"),
    upload.single("profile_image"),
    asyncHandler(async (req, res) => {
        const patient = await Patient.findOne(tenantFilter(req, { id: Number(req.params.id) }));

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Profile image is required" });
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                message: "Only JPG, PNG, and WEBP images are allowed",
            });
        }

        if (patient.profile_image_public_id) {
            await cloudinary.uploader.destroy(patient.profile_image_public_id);
        }

        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "hms/patient-profile-images",
                    resource_type: "image",
                },
                (error, uploadResult) => {
                    if (error) reject(error);
                    else resolve(uploadResult);
                },
            );

            stream.end(req.file.buffer);
        });

        patient.profile_image_url = result.secure_url;
        patient.profile_image_public_id = result.public_id;

        await patient.save();

        res.json({
            message: "Patient profile image uploaded successfully",
            profile_image_url: patient.profile_image_url,
            profile_image_public_id: patient.profile_image_public_id,
        });
    }),
);
router.delete(
    "/:id/documents/:docIndex",
    requirePermission("patient.document.manage"),
    asyncHandler(async (req, res) => {
        const patient = await Patient.findOne(tenantFilter(req, { id: Number(req.params.id) }));

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        const docIndex = Number(req.params.docIndex);
        const doc = patient.documents?.[docIndex];

        if (!doc) {
            return res.status(404).json({ message: "Document not found" });
        }

        if (doc.file_public_id) {
            await cloudinary.uploader.destroy(doc.file_public_id, {
                resource_type: "auto",
            });
        }

        patient.documents.splice(docIndex, 1);
        await patient.save();

        res.json({
            message: "Document deleted successfully",
            documents: patient.documents,
        });
    }),
);
router.delete(
    "/:id",
    requirePermission("patient.delete"),
    asyncHandler(async (req, res) => {
        await Patient.deleteOne(tenantFilter(req, { id: Number(req.params.id) }));
        res.json({ message: "Patient deleted" });
    }),
);
module.exports = router;
