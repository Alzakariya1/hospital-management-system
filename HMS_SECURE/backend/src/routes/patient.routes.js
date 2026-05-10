const express = require("express");
const { Patient } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { verifyToken, allowRoles } = require("../middleware/auth");
const router = express.Router();
router.use(verifyToken);
router.get(
    "/",
    asyncHandler(async (req, res) =>
        res.json(await Patient.find().sort({ id: -1 })),
    ),
);
router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const r = await Patient.findOne({ id: Number(req.params.id) });
        if (!r) return res.status(404).json({ message: "Patient not found" });
        res.json(r);
    }),
);
router.post(
    "/",
    allowRoles("super_admin", "admin", "receptionist"),
    asyncHandler(async (req, res) => {
        const uid = req.body.patient_uid || `PAT-${Date.now()}`;
        const r = await Patient.create({ ...req.body, patient_uid: uid });
        res
            .status(201)
            .json({ message: "Patient created", id: r.id, patient_uid: uid });
    }),
);
router.put(
    "/:id",
    allowRoles("super_admin", "admin", "receptionist"),
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
        await Patient.updateOne({ id: Number(req.params.id) }, { $set: update });
        res.json({ message: "Patient updated" });
    }),
);
router.delete(
    "/:id",
    allowRoles("super_admin", "admin"),
    asyncHandler(async (req, res) => {
        await Patient.deleteOne({ id: Number(req.params.id) });
        res.json({ message: "Patient deleted" });
    }),
);
module.exports = router;
