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
    status: { type: String, default: "active" },
});
const Department = makeModel("Department", "departments");

const Patient = makeModel("Patient", "patients", {
    patient_id: { type: String, unique: true, index: true },

    full_name: String,
    age: Number,
    gender: String,
    phone: String,
    email: String,
    address: String,
    blood_group: String,
    medical_notes: String,

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
            uploaded_at: {
                type: Date,
                default: Date.now,
            },
        },
    ],
});

const Doctor = makeModel("Doctor", "doctors", {
    doctor_id: { type: String, unique: true, index: true },
});
const Appointment = makeModel("Appointment", "appointments", {
    patient_id: String,
    doctor_id: String,
    appointment_date: String,
    appointment_time: String,
    status: String,
    notes: String,
});
const Bed = makeModel("Bed", "beds");
const OpdRecord = makeModel("OpdRecord", "opd_records");
const IpdAdmission = makeModel("IpdAdmission", "ipd_admissions");
const NursingNote = makeModel("NursingNote", "nursing_notes");
const LabTest = makeModel("LabTest", "lab_tests");
const RadiologyTest = makeModel("RadiologyTest", "radiology_tests");
const Medicine = makeModel("Medicine", "medicines");
const PharmacySale = makeModel("PharmacySale", "pharmacy_sales");
const Billing = makeModel("Billing", "billing");
const AuditLog = makeModel("AuditLog", "audit_logs");
const SecuritySetting = makeModel("SecuritySetting", "security_settings", {
    setting_key: { type: String, unique: true, index: true },
});
module.exports = {
    Counter,
    User,
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
