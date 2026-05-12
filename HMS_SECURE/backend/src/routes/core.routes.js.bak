const express = require('express'); const { Doctor, Department, Appointment, Patient, Bed, Billing, AuditLog } = require('../models'); const asyncHandler = require('../utils/asyncHandler'); const { verifyToken, allowRoles } = require('../middleware/auth'); const router = express.Router(); router.use(verifyToken);
async function withNames(rows) {
    const patientIds = [...new Set(rows.map(x => x.patient_id).filter(Boolean))];
    const doctorIds = [...new Set(rows.map(x => x.doctor_id).filter(Boolean))];

    const patients = await Patient.find({
        $or: [
            { id: { $in: patientIds.map(Number).filter(n => !Number.isNaN(n)) } },
            { patient_id: { $in: patientIds } }
        ]
    }).lean();

    const doctors = await Doctor.find({
        $or: [
            { id: { $in: doctorIds.map(Number).filter(n => !Number.isNaN(n)) } },
            { doctor_id: { $in: doctorIds } }
        ]
    }).lean();

    const pm = Object.fromEntries([
        ...patients.map(p => [String(p.id), p.full_name]),
        ...patients.map(p => [String(p.patient_id), p.full_name])
    ]);

    const dm = Object.fromEntries([
        ...doctors.map(d => [String(d.id), d.full_name]),
        ...doctors.map(d => [String(d.doctor_id), d.full_name])
    ]);

    return rows.map(x => {
        const obj = x.toJSON?.() || x;
        return {
            ...obj,
            patient_name: pm[String(obj.patient_id)] || "",
            doctor_name: dm[String(obj.doctor_id)] || ""
        };
    });
}
router.get('/doctors', asyncHandler(async (req, res) => { const rows = await Doctor.find().sort({ id: -1 }).lean(); const deps = await Department.find().lean(); const dm = Object.fromEntries(deps.map(d => [d.id, d.department_name])); res.json(rows.map(d => ({ ...d, department_name: dm[d.department_id] }))); }));
router.post('/doctors', allowRoles('super_admin', 'admin'), asyncHandler(async (req, res) => { const uid = req.body.doctor_uid || `DOC-${Date.now()}`; const r = await Doctor.create({ ...req.body, doctor_uid: uid, status: req.body.status || 'active' }); res.status(201).json({ message: 'Doctor created', id: r.id, doctor_uid: uid }); }));
router.put('/doctors/:id', allowRoles('super_admin', 'admin'), asyncHandler(async (req, res) => {
    const allowed = ['doctor_id', 'full_name', 'email', 'phone', 'specialization', 'qualification', 'consultation_fee'];
    const update = {}; allowed.forEach(k => { if (k in req.body) update[k] = req.body[k] }); if (!Object.keys(update).length) return res.status(400).json({ message: 'No valid fields' }); await Doctor.updateOne({ id: Number(req.params.id) }, { $set: update }); res.json({ message: 'Doctor updated' });
}));
router.get('/departments', asyncHandler(async (req, res) => res.json(await Department.find().sort({ department_name: 1 }))));
router.post('/departments', allowRoles('super_admin', 'admin'), asyncHandler(async (req, res) => { const r = await Department.create({ department_name: req.body.department_name, description: req.body.description || null }); res.status(201).json({ message: 'Department created', id: r.id }); }));
router.get('/appointments', asyncHandler(async (req, res) => res.json(await withNames(await Appointment.find().sort({ appointment_date: -1, appointment_time: -1 })))));
router.post('/appointments', allowRoles('super_admin', 'admin', 'receptionist'), asyncHandler(async (req, res) => { const uid = req.body.appointment_uid || `APT-${Date.now()}`; const r = await Appointment.create({ ...req.body, appointment_uid: uid, appointment_type: req.body.appointment_type || 'normal', status: req.body.status || 'pending' }); res.status(201).json({ message: 'Appointment created', id: r.id, appointment_uid: uid }); }));
router.patch('/appointments/:id/status', asyncHandler(async (req, res) => { await Appointment.updateOne({ id: Number(req.params.id) }, { $set: { status: req.body.status } }); res.json({ message: 'Appointment status updated' }); }));
router.get('/beds', asyncHandler(async (req, res) => res.json(await Bed.find().sort({ bed_number: 1 }))));
router.put('/appointments/:id', allowRoles('super_admin', 'admin', 'receptionist'), asyncHandler(async (req, res) => {
    const allowed = ['patient_id', 'doctor_id', 'appointment_date', 'appointment_time', 'status', 'notes', 'appointment_type'];
    const update = {};
    allowed.forEach(k => {
        if (k in req.body) update[k] = req.body[k];
    });

    if (!Object.keys(update).length) {
        return res.status(400).json({ message: 'No valid fields' });
    }

    await Appointment.updateOne({ id: Number(req.params.id) }, { $set: update });
    res.json({ message: 'Appointment updated' });
}));

router.delete('/appointments/:id', allowRoles('super_admin', 'admin', 'receptionist'), asyncHandler(async (req, res) => {
    await Appointment.deleteOne({ id: Number(req.params.id) });
    res.json({ message: 'Appointment deleted' });
}));
router.post('/beds', allowRoles('super_admin', 'admin'), asyncHandler(async (req, res) => { const r = await Bed.create({ ...req.body, status: req.body.status || 'available' }); res.status(201).json({ message: 'Bed created', id: r.id }); }));
router.patch('/beds/:id/status', asyncHandler(async (req, res) => { await Bed.updateOne({ id: Number(req.params.id) }, { $set: { status: req.body.status } }); res.json({ message: 'Bed status updated' }); }));
router.get('/dashboard/stats', asyncHandler(async (req, res) => { const today = new Date().toISOString().slice(0, 10); const [totalPatients, totalDoctors, appointmentsToday, availableBeds, bills, activity] = await Promise.all([Patient.countDocuments(), Doctor.countDocuments(), Appointment.countDocuments({ appointment_date: today }), Bed.countDocuments({ status: 'available' }), Billing.find({ billing_date: { $gte: new Date(today) } }).lean(), AuditLog.find().sort({ id: -1 }).limit(10).lean()]); res.json({ totalPatients, totalDoctors, appointmentsToday, availableBeds, dailyRevenue: bills.reduce((s, b) => s + Number(b.paid_amount || 0), 0), recentActivity: activity }); })); module.exports = router;
