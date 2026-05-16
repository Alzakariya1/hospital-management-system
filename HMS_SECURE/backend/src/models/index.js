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
    plan_limits: { type: Object, default: {} },
    subscription: {
        type: Object,
        default: {
            status: "active",
            billing_cycle: "monthly",
            renewal_date: null,
            next_billing_date: null,
            trial_start_date: null,
            trial_end_date: null,
            cancelled_at: null,
            suspended_at: null,
            notes: "",
        },
    },
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
    profile_image_storage: String,

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
            storage: String,
            uploaded_at: {
                type: Date,
                default: Date.now,
            },
        },
    ],
});

const Doctor = makeModel("Doctor", "doctors", {
    hospital_id: { type: Number, default: 1, index: true },
    // Keep doctor_id unique per hospital through the compound index below.
    // Do not mark this field globally unique, otherwise different hospitals cannot use the same doctor_id.
    doctor_id: { type: String, trim: true },

    full_name: String,
    email: String,
    phone: String,
    specialization: String,
    qualification: String,
    consultation_fee: Number,
    department_id: Number,
    status: { type: String, default: "active" },

    // Reserved for the next doctor-profile phase. Keeping these schema fields now is backward compatible
    // because strict:false already allowed them, but defining them documents the intended structure.
    profile_image_url: String,
    profile_image_public_id: String,
    profile_image_storage: String,
    license_number: String,
    registration_number: String,
    certificates: [
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
Doctor.schema.index(
    { hospital_id: 1, doctor_id: 1 },
    {
        unique: true,
        name: "doctor_hospital_doctor_id_unique",
        partialFilterExpression: { doctor_id: { $type: "string" } },
    },
);
const DoctorSchedule = makeModel("DoctorSchedule", "doctor_schedules", {
    hospital_id: { type: Number, default: 1, index: true },
    doctor_ref_id: Number,
    doctor_id: { type: String, trim: true },
    working_days: { type: [String], default: [] },
    start_time: String,
    end_time: String,
    break_start: String,
    break_end: String,
    slot_duration: { type: Number, default: 15 },
    max_patients_per_day: { type: Number, default: 0 },
    unavailable_dates: { type: [String], default: [] },
    notes: String,
    status: { type: String, default: "active" },
});
DoctorSchedule.schema.index(
    { hospital_id: 1, doctor_ref_id: 1 },
    { name: "doctor_schedule_hospital_doctor_lookup" },
);

const Appointment = makeModel("Appointment", "appointments", {
    hospital_id: { type: Number, default: 1, index: true },
    patient_id: { type: String, trim: true },
    doctor_id: { type: String, trim: true },
    appointment_uid: String,
    appointment_date: String,
    appointment_time: String,
    appointment_type: { type: String, default: "opd" },
    status: { type: String, default: "scheduled" },
    token_number: String,
    checked_in_at: Date,
    consultation_started_at: Date,
    completed_at: Date,
    cancelled_at: Date,
    cancellation_reason: String,
    notes: String,
});
Appointment.schema.index(
    { hospital_id: 1, doctor_id: 1, appointment_date: 1, appointment_time: 1 },
    { name: "appointment_doctor_slot_lookup" },
);
const Bed = makeModel("Bed", "beds", { hospital_id: { type: Number, default: 1, index: true } });
const OpdRecord = makeModel("OpdRecord", "opd_records", { hospital_id: { type: Number, default: 1, index: true } });
const IpdAdmission = makeModel("IpdAdmission", "ipd_admissions", { hospital_id: { type: Number, default: 1, index: true } });
const NursingNote = makeModel("NursingNote", "nursing_notes", { hospital_id: { type: Number, default: 1, index: true } });
const LabTest = makeModel("LabTest", "lab_tests", {
    hospital_id: { type: Number, default: 1, index: true },
    patient_id: { type: String, trim: true, index: true },
    doctor_id: { type: String, trim: true, index: true },
    appointment_id: Number,
    opd_id: Number,
    test_name: String,
    test_category: String,
    priority: { type: String, default: "routine" },
    test_status: { type: String, default: "ordered" },
    sample_collected_at: Date,
    completed_at: Date,
    report_file: String,
    report_notes: String,
});
const RadiologyTest = makeModel("RadiologyTest", "radiology_tests", {
    hospital_id: { type: Number, default: 1, index: true },
    patient_id: { type: String, trim: true, index: true },
    doctor_id: { type: String, trim: true, index: true },
    appointment_id: Number,
    opd_id: Number,
    scan_name: String,
    scan_category: String,
    priority: { type: String, default: "routine" },
    status: { type: String, default: "ordered" },
    scheduled_at: Date,
    scanned_at: Date,
    reported_at: Date,
    image_file: String,
    report_file: String,
    report_notes: String,
});
const Medicine = makeModel("Medicine", "medicines", {
    hospital_id: { type: Number, default: 1, index: true },
    name: { type: String, trim: true, index: true },
    generic_name: String,
    category: String,
    batch_number: String,
    vendor: String,
    expiry_date: String,
    quantity: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    low_stock_threshold: { type: Number, default: 10 },
    cost_price: { type: Number, default: 0 },
    selling_price: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    unit: { type: String, default: 'pcs' },
    status: { type: String, default: 'active' },
});
Medicine.schema.index({ hospital_id: 1, name: 1, batch_number: 1 }, { name: 'medicine_hospital_name_batch_lookup' });
const PharmacySale = makeModel("PharmacySale", "pharmacy_sales", {
    hospital_id: { type: Number, default: 1, index: true },
    sale_number: { type: String, index: true },
    medicine_id: Number,
    medicine_name: String,
    prescription_id: Number,
    patient_id: String,
    doctor_id: String,
    quantity: Number,
    selling_price: Number,
    total_amount: Number,
    payment_status: { type: String, default: 'paid' },
    sale_type: { type: String, default: 'direct' },
    sold_at: { type: Date, default: Date.now },
});
const Billing = makeModel("Billing", "billing", { hospital_id: { type: Number, default: 1, index: true } });
const Prescription = makeModel("Prescription", "prescriptions", {
    hospital_id: { type: Number, default: 1, index: true },
    patient_id: { type: String, trim: true, index: true },
    doctor_id: { type: String, trim: true, index: true },
    appointment_id: { type: Number, index: true },
    opd_id: { type: Number, index: true },
    prescription_number: { type: String, index: true },
    status: { type: String, default: "active" },
});
const AuditLog = makeModel("AuditLog", "audit_logs", {
    hospital_id: { type: Number, default: 1, index: true },
    user_id: { type: Number, index: true },
    user_role: String,
    action: { type: String, index: true },
    module_name: { type: String, index: true },
    entity_type: String,
    entity_id: String,
    old_value: Object,
    new_value: Object,
    status: { type: String, default: "success", index: true },
    severity: { type: String, default: "info" },
    ip_address: String,
    user_agent: String,
    method: String,
    path: String,
});
AuditLog.schema.index({ hospital_id: 1, created_at: -1 }, { name: "audit_hospital_recent_lookup" });
AuditLog.schema.index({ hospital_id: 1, module_name: 1, status: 1 }, { name: "audit_hospital_module_status_lookup" });
const LoginHistory = makeModel("LoginHistory", "login_history", {
    hospital_id: { type: Number, default: 1, index: true },
    user_id: { type: Number, index: true },
    email: { type: String, index: true },
    role: String,
    status: { type: String, default: "success", index: true },
    reason: String,
    ip_address: String,
    user_agent: String,
    method: String,
    path: String,
    logged_at: { type: Date, default: Date.now, index: true },
});
LoginHistory.schema.index({ hospital_id: 1, logged_at: -1 }, { name: "login_history_hospital_recent_lookup" });
const SecuritySetting = makeModel("SecuritySetting", "security_settings", {
    hospital_id: { type: Number, default: 1, index: true },
    setting_key: { type: String, trim: true, index: true },
    setting_value: String,
    description: String,
    category: { type: String, default: "general" },
    updated_by: Number,
});
SecuritySetting.schema.index(
    { hospital_id: 1, setting_key: 1 },
    { unique: true, name: "security_setting_hospital_key_unique" },
);

const DynamicField = makeModel("DynamicField", "dynamic_fields", {
    hospital_id: { type: Number, default: 1, index: true },
    target_module: { type: String, trim: true, index: true }, // patients, doctors, appointments, billing, lab, radiology
    field_key: { type: String, trim: true, index: true },
    label: String,
    field_type: { type: String, default: "text" }, // text, number, date, select, textarea, checkbox
    placeholder: String,
    section: { type: String, default: "Additional Details" },
    help_text: String,
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    default_value: String,
    display_order: { type: Number, default: 100 },
    is_active: { type: Boolean, default: true },
});
DynamicField.schema.index(
    { hospital_id: 1, target_module: 1, field_key: 1 },
    { unique: true, name: "dynamic_field_hospital_module_key_unique" },
);


const Template = makeModel("Template", "templates", {
    hospital_id: { type: Number, default: 1, index: true },
    template_type: { type: String, index: true },
    name: String,
    header_text: String,
    footer_text: String,
    body_template: String,
    paper_size: { type: String, default: "A4" },
    orientation: { type: String, default: "portrait" },
    logo_position: { type: String, default: "left" },
    show_hospital_logo: { type: Boolean, default: true },
    show_patient_details: { type: Boolean, default: true },
    show_doctor_signature: { type: Boolean, default: true },
    is_default: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
});
Template.schema.index({ hospital_id: 1, template_type: 1, name: 1 }, { unique: true, name: "template_hospital_type_name_unique" });

const Notification = makeModel("Notification", "notifications", {
    hospital_id: { type: Number, default: 1, index: true },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    type: { type: String, default: "system", index: true },
    severity: { type: String, default: "info" },
    module: { type: String, default: "system", index: true },
    entity_type: String,
    entity_id: String,
    target_path: String,
    user_id: Number,
    role: String,
    read_by: { type: [Number], default: [] },
    is_active: { type: Boolean, default: true },
});
Notification.schema.index({ hospital_id: 1, created_at: -1 }, { name: "notification_hospital_recent_lookup" });
module.exports = {
    Counter,
    User,
    Hospital,
    Department,
    Patient,
    Doctor,
    DoctorSchedule,
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
    Prescription,
    AuditLog,
    LoginHistory,
    SecuritySetting,
    DynamicField,
    Template,
    Notification,
};
