const express = require("express");
const { Patient } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { verifyToken, allowRoles } = require("../middleware/auth");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
router.use(verifyToken);
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});
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
router.post(
    "/:id/documents",
    allowRoles("super_admin", "admin", "receptionist"),
    upload.single("document"),
    asyncHandler(async (req, res) => {
        const patient = await Patient.findOne({ id: Number(req.params.id) });

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
    allowRoles("super_admin", "admin", "receptionist"),
    upload.single("profile_image"),
    asyncHandler(async (req, res) => {
        const patient = await Patient.findOne({ id: Number(req.params.id) });

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
    allowRoles("super_admin", "admin", "receptionist"),
    asyncHandler(async (req, res) => {
        const patient = await Patient.findOne({ id: Number(req.params.id) });

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
    allowRoles("super_admin", "admin"),
    asyncHandler(async (req, res) => {
        await Patient.deleteOne({ id: Number(req.params.id) });
        res.json({ message: "Patient deleted" });
    }),
);
module.exports = router;
