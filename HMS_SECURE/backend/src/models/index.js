const { mongoose } = require("../config/db");
const opts = {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: false,
    versionKey: false,
};
const counterSchema = new mongoose.Schema(
    { _id: String, seq: { type: Number, default: 0 } },
    { versionKey: false },
);
const Counter = mongoose.model("Counter", counterSchema);
async function nextId(name) {
    const c = await Counter.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { upsert: true, new: true },
    );
    return c.seq;
}
function makeModel(name, collection, extra = {}) {
    const schema = new mongoose.Schema({ id: { type: Number }, ...extra }, opts);
    schema.pre("validate", async function (next) {
        if (this.isNew && !this.id) this.id = await nextId(collection);
        next();
    });
    schema.set("toJSON", {
        transform: (_, ret) => {
            delete ret._id;
            return ret;
        },
    });
    return mongoose.model(name, schema, collection);
}
const User = makeModel("User", "users", {
    email: { type: String, unique: true, index: true },
    hospital_id: { type: Number, default: 1, index: true },
    role: { type: String, default: "receptionist" },
    status: { type: String, default: "active" },
    permissions: { type: [String], default: [] },
});
const Hospital = makeModel("Hospital", "hospitals", {
    hospital_code: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, default: "Default Hospital" },
    type: { type: String, default: "hospital" },
    status: { type: String, default: "active" },
    plan: { type: String, default: "enterprise" },
    enabled_modules: { type: [String], default: ['dashboard', 'patients', 'doctors', 'appointments', 'beds', 'lab', 'radiology', 'pharmacy', 'billing', 'profile', 'tenants'] },
    feature_flags: {
        type: Object,
        default: {
            fhir: false,
            hl7: false,
            pacs: false,
            biometric: false,
            insurance_tpa: false,
            erp: false,
            whatsapp_sms: false,
            abdm_abha: false,
            two_factor_auth: false,
            audit_compliance: true,
        },
    },
    branding: { type: Object, default: {} },
    settings: { type: Object, default: {} },
});
const Department = makeModel("Department", "departments", { hospital_id: { type: Number, default: 1, index: true } });

const Patient = makeModel("Patient", "patients", {
    hospital_id: { type: Number, default: 1, index: true },
    patient_id: { type: String, unique: true, index: true },

    full_name: String,
    age: Number,
    gender: String,
    phone: String,
    email: String,
    address: String,
    blood_group: String,
    medical_notes: String,

    profile_image_url: String,
    profile_image_public_id: String,

    emergency_contact_name: String,
    emergency_contact_phone: String,
    insurance_provider: String,
    insurance_policy_number: String,

    documents: [
        {
            title: String,
            category: String,
            document_type: String,
            notes: String,
            file_name: String,
            file_type: String,
            file_size: Number,
            file_url: String,
            file_public_id: String,
            uploaded_at: {
                type: Date,
                default: Date.now,
            },
        },
    ],
});

const Doctor = makeModel("Doctor", "doctors", {
    hospital_id: { type: Number, default: 1, index: true },
    doctor_id: { type: String, unique: true, index: true },
    full_name: String,
    email: String,
    phone: String,
    gender: String,
    specialization: String,
    qualification: String,
    consultation_fee: String,
    experience_years: String,
    department: String,
    registration_number: String,
    license_number: String,
    address: String,
    availability: String,
    bio: String,
    status: { type: String, default: "active" },
    profile_image_url: String,
    profile_image_public_id: String,
    documents: [
        {
            title: String,
            category: String,
            document_type: String,
            notes: String,
            file_name: String,
            file_type: String,
            file_size: Number,
            file_url: String,
            file_public_id: String,
            uploaded_at: {
                type: Date,
                default: Date.now,
            },
        },
    ],
});
const Appointment = makeModel("Appointment", "appointments", {
    hospital_id: { type: Number, default: 1, index: true },
    patient_id: String,
    doctor_id: String,
    appointment_date: String,
    appointment_time: String,
    status: String,
    notes: String,
});
const Bed = makeModel("Bed", "beds", { hospital_id: { type: Number, default: 1, index: true } });
const OpdRecord = makeModel("OpdRecord", "opd_records", { hospital_id: { type: Number, default: 1, index: true } });
const IpdAdmission = makeModel("IpdAdmission", "ipd_admissions", { hospital_id: { type: Number, default: 1, index: true } });
const NursingNote = makeModel("NursingNote", "nursing_notes", { hospital_id: { type: Number, default: 1, index: true } });
const LabTest = makeModel("LabTest", "lab_tests", { hospital_id: { type: Number, default: 1, index: true } });
const RadiologyTest = makeModel("RadiologyTest", "radiology_tests", { hospital_id: { type: Number, default: 1, index: true } });
const Medicine = makeModel("Medicine", "medicines", { hospital_id: { type: Number, default: 1, index: true } });
const PharmacySale = makeModel("PharmacySale", "pharmacy_sales", { hospital_id: { type: Number, default: 1, index: true } });
const Billing = makeModel("Billing", "billing", { hospital_id: { type: Number, default: 1, index: true } });
const AuditLog = makeModel("AuditLog", "audit_logs", { hospital_id: { type: Number, default: 1, index: true } });
const SecuritySetting = makeModel("SecuritySetting", "security_settings", {
    hospital_id: { type: Number, default: 1, index: true },
    setting_key: { type: String, unique: true, index: true },
});
module.exports = {
    Counter,
    User,
    Hospital,
    Department,
    Patient,
    Doctor,
    Appointment,
    Bed,
    OpdRecord,
    IpdAdmission,
    NursingNote,
    LabTest,
    RadiologyTest,
    Medicine,
    PharmacySale,
    Billing,
    AuditLog,
    SecuritySetting,
};
