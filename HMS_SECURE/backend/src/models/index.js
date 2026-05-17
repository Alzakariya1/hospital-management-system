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
    enabled_modules: { type: [String], default: ['dashboard', 'commandCenter', 'patients', 'doctors', 'appointments', 'emr', 'beds', 'lab', 'radiology', 'pharmacy', 'inventory', 'billing', 'compliance', 'integration', 'profile', 'operations', 'tenants'] },
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
const LabTestTemplate = makeModel("LabTestTemplate", "lab_test_templates", {
    hospital_id: { type: Number, default: 1, index: true },
    template_code: { type: String, trim: true, index: true },
    test_name: { type: String, trim: true, required: true, index: true },
    test_category: { type: String, default: "General", index: true },
    sample_type: { type: String, default: "Blood" },
    container: String,
    turnaround_hours: { type: Number, default: 24 },
    price: { type: Number, default: 0 },
    machine_code: String,
    loinc_code: String,
    method: String,
    parameters: { type: [Object], default: [] }, // name, unit, normal_range, min, max, input_type
    report_template: String,
    status: { type: String, default: "active", index: true },
});
LabTestTemplate.schema.index({ hospital_id: 1, test_name: 1 }, { name: "lab_template_hospital_test_lookup" });

const LabTest = makeModel("LabTest", "lab_tests", {
    hospital_id: { type: Number, default: 1, index: true },
    patient_id: { type: String, trim: true, index: true },
    doctor_id: { type: String, trim: true, index: true },
    appointment_id: Number,
    opd_id: Number,
    template_id: Number,
    test_name: String,
    test_category: String,
    sample_type: String,
    sample_barcode: { type: String, trim: true, index: true },
    accession_number: { type: String, trim: true, index: true },
    machine_order_id: String,
    priority: { type: String, default: "routine" },
    test_status: { type: String, default: "ordered", index: true },
    collected_by: String,
    sample_collected_at: Date,
    received_at: Date,
    processing_started_at: Date,
    completed_at: Date,
    approved_at: Date,
    approved_by: String,
    result_parameters: { type: [Object], default: [] },
    interpretation: String,
    report_file: String,
    report_pdf_url: String,
    report_notes: String,
    report_version: { type: Number, default: 1 },
    integration_payload: { type: Object, default: {} },
});
LabTest.schema.index({ hospital_id: 1, sample_barcode: 1 }, { name: "lab_sample_barcode_lookup" });
LabTest.schema.index({ hospital_id: 1, test_status: 1, created_at: -1 }, { name: "lab_status_recent_lookup" });

const RadiologyTest = makeModel("RadiologyTest", "radiology_tests", {
    hospital_id: { type: Number, default: 1, index: true },
    patient_id: { type: String, trim: true, index: true },
    doctor_id: { type: String, trim: true, index: true },
    appointment_id: Number,
    opd_id: Number,
    scan_name: String,
    scan_category: String,
    modality: { type: String, default: "XRAY", index: true },
    body_part: String,
    priority: { type: String, default: "routine" },
    status: { type: String, default: "ordered", index: true },
    accession_number: { type: String, trim: true, index: true },
    dicom_study_id: { type: String, trim: true, index: true },
    pacs_viewer_url: String,
    scheduled_at: Date,
    scanned_at: Date,
    reported_at: Date,
    approved_at: Date,
    radiologist_id: String,
    radiologist_name: String,
    technician_name: String,
    findings: String,
    impression: String,
    recommendation: String,
    image_file: String,
    report_file: String,
    report_pdf_url: String,
    report_notes: String,
    report_version: { type: Number, default: 1 },
    integration_payload: { type: Object, default: {} },
});
RadiologyTest.schema.index({ hospital_id: 1, dicom_study_id: 1 }, { name: "radiology_dicom_lookup" });
RadiologyTest.schema.index({ hospital_id: 1, status: 1, created_at: -1 }, { name: "radiology_status_recent_lookup" });
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


// V31 Enterprise Inventory + Purchase Order models
const Supplier = makeModel("Supplier", "suppliers", {
    hospital_id: { type: Number, default: 1, index: true },
    supplier_code: { type: String, trim: true, index: true },
    name: { type: String, trim: true, required: true, index: true },
    contact_person: String,
    phone: String,
    email: String,
    gst_number: String,
    address: String,
    payment_terms: String,
    status: { type: String, default: "active", index: true },
});
Supplier.schema.index({ hospital_id: 1, supplier_code: 1 }, { name: "supplier_hospital_code_lookup" });

const InventoryItem = makeModel("InventoryItem", "inventory_items", {
    hospital_id: { type: Number, default: 1, index: true },
    item_code: { type: String, trim: true, index: true },
    name: { type: String, trim: true, required: true, index: true },
    item_type: { type: String, default: "medicine", index: true }, // medicine, consumable, equipment, general
    category: String,
    unit: { type: String, default: "pcs" },
    barcode: { type: String, trim: true, index: true },
    sku: String,
    hsn_code: String,
    reorder_level: { type: Number, default: 10 },
    reorder_quantity: { type: Number, default: 0 },
    default_supplier_id: Number,
    location: String,
    status: { type: String, default: "active", index: true },
});
InventoryItem.schema.index({ hospital_id: 1, item_code: 1 }, { name: "inventory_item_hospital_code_lookup" });
InventoryItem.schema.index({ hospital_id: 1, barcode: 1 }, { name: "inventory_item_hospital_barcode_lookup" });

const InventoryBatch = makeModel("InventoryBatch", "inventory_batches", {
    hospital_id: { type: Number, default: 1, index: true },
    item_id: { type: Number, required: true, index: true },
    medicine_id: Number,
    item_name: String,
    batch_number: { type: String, trim: true, index: true },
    barcode: { type: String, trim: true, index: true },
    expiry_date: String,
    manufacture_date: String,
    quantity: { type: Number, default: 0 },
    received_quantity: { type: Number, default: 0 },
    cost_price: { type: Number, default: 0 },
    selling_price: { type: Number, default: 0 },
    supplier_id: Number,
    supplier_name: String,
    location: String,
    status: { type: String, default: "active", index: true },
});
InventoryBatch.schema.index({ hospital_id: 1, item_id: 1, batch_number: 1 }, { name: "inventory_batch_item_batch_lookup" });
InventoryBatch.schema.index({ hospital_id: 1, expiry_date: 1 }, { name: "inventory_batch_expiry_lookup" });

const PurchaseOrder = makeModel("PurchaseOrder", "purchase_orders", {
    hospital_id: { type: Number, default: 1, index: true },
    po_number: { type: String, index: true },
    supplier_id: { type: Number, index: true },
    supplier_name: String,
    order_date: String,
    expected_date: String,
    status: { type: String, default: "draft", index: true }, // draft, ordered, partially_received, received, cancelled
    subtotal: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    notes: String,
    items: { type: [Object], default: [] },
    created_by: Number,
});
PurchaseOrder.schema.index({ hospital_id: 1, po_number: 1 }, { unique: true, name: "po_hospital_number_unique" });

const SupplierBill = makeModel("SupplierBill", "supplier_bills", {
    hospital_id: { type: Number, default: 1, index: true },
    bill_number: { type: String, index: true },
    supplier_id: { type: Number, index: true },
    supplier_name: String,
    purchase_order_id: Number,
    invoice_number: String,
    invoice_date: String,
    due_date: String,
    amount: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    balance_amount: { type: Number, default: 0 },
    status: { type: String, default: "pending", index: true }, // pending, partial, paid, cancelled
    notes: String,
});
SupplierBill.schema.index({ hospital_id: 1, bill_number: 1 }, { unique: true, name: "supplier_bill_hospital_number_unique" });

const StockReceiving = makeModel("StockReceiving", "stock_receivings", {
    hospital_id: { type: Number, default: 1, index: true },
    receiving_number: { type: String, index: true },
    purchase_order_id: Number,
    supplier_id: Number,
    supplier_name: String,
    received_date: String,
    status: { type: String, default: "received", index: true },
    items: { type: [Object], default: [] },
    notes: String,
    received_by: Number,
});
StockReceiving.schema.index({ hospital_id: 1, receiving_number: 1 }, { unique: true, name: "stock_receiving_hospital_number_unique" });

const StockReturn = makeModel("StockReturn", "stock_returns", {
    hospital_id: { type: Number, default: 1, index: true },
    return_number: { type: String, index: true },
    supplier_id: Number,
    supplier_name: String,
    return_date: String,
    reason: String,
    status: { type: String, default: "returned", index: true },
    items: { type: [Object], default: [] },
    notes: String,
    returned_by: Number,
});
StockReturn.schema.index({ hospital_id: 1, return_number: 1 }, { unique: true, name: "stock_return_hospital_number_unique" });

const InventoryTransaction = makeModel("InventoryTransaction", "inventory_transactions", {
    hospital_id: { type: Number, default: 1, index: true },
    transaction_number: { type: String, index: true },
    transaction_type: { type: String, index: true }, // receive, return, dispense, adjustment
    item_id: Number,
    batch_id: Number,
    medicine_id: Number,
    item_name: String,
    batch_number: String,
    quantity: { type: Number, default: 0 },
    balance_after: { type: Number, default: 0 },
    reference_type: String,
    reference_id: Number,
    notes: String,
    performed_by: Number,
});
InventoryTransaction.schema.index({ hospital_id: 1, item_id: 1, created_at: -1 }, { name: "inventory_transaction_item_recent" });

const Billing = makeModel("Billing", "billing", { hospital_id: { type: Number, default: 1, index: true } });
const InsuranceClaim = makeModel("InsuranceClaim", "insurance_claims", {
    hospital_id: { type: Number, default: 1, index: true },
    patient_id: { type: String, trim: true, index: true },
    billing_id: { type: Number, index: true },
    invoice_number: String,
    insurance_provider: String,
    tpa_name: String,
    policy_number: String,
    claim_number: { type: String, index: true },
    claim_type: { type: String, default: "cashless" },
    claim_amount: { type: Number, default: 0 },
    approved_amount: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    balance_amount: { type: Number, default: 0 },
    status: { type: String, default: "draft", index: true },
    priority: { type: String, default: "normal" },
    admission_date: String,
    discharge_date: String,
    submitted_at: Date,
    approved_at: Date,
    settled_at: Date,
    rejection_reason: String,
    notes: String,
    documents: { type: [Object], default: [] },
    created_by: Number,
});
InsuranceClaim.schema.index({ hospital_id: 1, claim_number: 1 }, { unique: true, name: "insurance_claim_hospital_number_unique" });
InsuranceClaim.schema.index({ hospital_id: 1, status: 1, created_at: -1 }, { name: "insurance_claim_status_lookup" });
const Prescription = makeModel("Prescription", "prescriptions", {
    hospital_id: { type: Number, default: 1, index: true },
    patient_id: { type: String, trim: true, index: true },
    doctor_id: { type: String, trim: true, index: true },
    appointment_id: { type: Number, index: true },
    opd_id: { type: Number, index: true },
    prescription_number: { type: String, index: true },
    status: { type: String, default: "active" },
});

const ClinicalRecord = makeModel("ClinicalRecord", "clinical_records", {
    hospital_id: { type: Number, default: 1, index: true },
    patient_id: { type: String, trim: true, index: true },
    doctor_id: { type: String, trim: true, index: true },
    appointment_id: Number,
    opd_id: Number,
    record_type: { type: String, default: "clinical_note", index: true },
    title: String,
    chief_complaint: String,
    subjective: String,
    objective: String,
    assessment: String,
    plan: String,
    diagnosis: String,
    severity: String,
    onset_date: String,
    status: { type: String, default: "active", index: true },
    notes: String,
    vitals: { type: Object, default: {} },
    attachments: { type: [Object], default: [] },
    recorded_by: Number,
    record_date: { type: Date, default: Date.now, index: true },
});
ClinicalRecord.schema.index({ hospital_id: 1, patient_id: 1, record_date: -1 }, { name: "clinical_record_patient_timeline_lookup" });
ClinicalRecord.schema.index({ hospital_id: 1, record_type: 1, status: 1 }, { name: "clinical_record_type_status_lookup" });


const ConsentForm = makeModel("ConsentForm", "consent_forms", {
    hospital_id: { type: Number, default: 1, index: true },
    consent_number: { type: String, index: true },
    patient_id: { type: String, trim: true, index: true },
    patient_name: String,
    consent_type: { type: String, default: "general", index: true },
    title: String,
    form_text: String,
    language: { type: String, default: "English" },
    status: { type: String, default: "draft", index: true }, // draft, signed, revoked, expired
    signed_by: String,
    relationship: String,
    signed_at: Date,
    witness_name: String,
    doctor_id: String,
    doctor_name: String,
    valid_until: String,
    digital_signature: String,
    document_url: String,
    notes: String,
    created_by: Number,
});
ConsentForm.schema.index({ hospital_id: 1, consent_number: 1 }, { unique: true, name: "consent_hospital_number_unique" });
ConsentForm.schema.index({ hospital_id: 1, patient_id: 1, created_at: -1 }, { name: "consent_patient_recent_lookup" });

const IncidentReport = makeModel("IncidentReport", "incident_reports", {
    hospital_id: { type: Number, default: 1, index: true },
    incident_number: { type: String, index: true },
    incident_type: { type: String, default: "clinical", index: true },
    severity: { type: String, default: "medium", index: true },
    status: { type: String, default: "open", index: true }, // open, investigating, corrective_action, closed
    incident_date: String,
    department: String,
    location: String,
    patient_id: String,
    patient_name: String,
    reported_by: String,
    description: String,
    immediate_action: String,
    root_cause: String,
    corrective_action: String,
    preventive_action: String,
    closed_at: Date,
    attachments: { type: [Object], default: [] },
    created_by: Number,
});
IncidentReport.schema.index({ hospital_id: 1, incident_number: 1 }, { unique: true, name: "incident_hospital_number_unique" });
IncidentReport.schema.index({ hospital_id: 1, status: 1, severity: 1 }, { name: "incident_status_severity_lookup" });

const SopDocument = makeModel("SopDocument", "sop_documents", {
    hospital_id: { type: Number, default: 1, index: true },
    sop_number: { type: String, index: true },
    title: { type: String, required: true, index: true },
    department: String,
    category: { type: String, default: "general", index: true },
    version: { type: String, default: "1.0" },
    status: { type: String, default: "draft", index: true }, // draft, under_review, approved, retired
    effective_date: String,
    review_date: String,
    owner_name: String,
    approved_by: String,
    approved_at: Date,
    document_text: String,
    file_url: String,
    training_required: { type: Boolean, default: false },
    created_by: Number,
});
SopDocument.schema.index({ hospital_id: 1, sop_number: 1 }, { unique: true, name: "sop_hospital_number_unique" });
SopDocument.schema.index({ hospital_id: 1, department: 1, status: 1 }, { name: "sop_department_status_lookup" });

const ComplianceChecklist = makeModel("ComplianceChecklist", "compliance_checklists", {
    hospital_id: { type: Number, default: 1, index: true },
    checklist_code: { type: String, index: true },
    standard: { type: String, default: "NABH", index: true },
    title: { type: String, required: true },
    department: String,
    category: String,
    status: { type: String, default: "pending", index: true }, // pending, compliant, partial, non_compliant, not_applicable
    priority: { type: String, default: "medium" },
    due_date: String,
    evidence_url: String,
    evidence_notes: String,
    owner_name: String,
    last_reviewed_at: Date,
    reviewed_by: String,
    corrective_action: String,
    created_by: Number,
});
ComplianceChecklist.schema.index({ hospital_id: 1, checklist_code: 1 }, { unique: true, name: "compliance_checklist_hospital_code_unique" });
ComplianceChecklist.schema.index({ hospital_id: 1, standard: 1, status: 1 }, { name: "compliance_standard_status_lookup" });

const BackupVerification = makeModel("BackupVerification", "backup_verifications", {
    hospital_id: { type: Number, default: 1, index: true },
    verification_number: { type: String, index: true },
    backup_type: { type: String, default: "database" },
    backup_date: String,
    restore_test_date: String,
    status: { type: String, default: "pending", index: true }, // pending, passed, failed, partial
    storage_location: String,
    verified_by: String,
    restore_duration_minutes: Number,
    records_checked: Number,
    issue_found: String,
    action_taken: String,
    next_test_due: String,
    notes: String,
    created_by: Number,
});
BackupVerification.schema.index({ hospital_id: 1, verification_number: 1 }, { unique: true, name: "backup_verification_hospital_number_unique" });
BackupVerification.schema.index({ hospital_id: 1, status: 1, backup_date: -1 }, { name: "backup_verification_status_lookup" });

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



const SaaSInvoice = makeModel("SaaSInvoice", "saas_invoices", {
    hospital_id: { type: Number, required: true, index: true },
    hospital_name: String,
    plan: String,
    plan_name: String,
    invoice_number: { type: String, index: true },
    billing_cycle: { type: String, default: "monthly" },
    period_start: String,
    period_end: String,
    due_date: String,
    subtotal: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    balance_amount: { type: Number, default: 0 },
    status: { type: String, default: "pending", index: true }, // draft, pending, paid, partial, overdue, cancelled
    notes: String,
    created_by: Number,
});
SaaSInvoice.schema.index({ hospital_id: 1, invoice_number: 1 }, { unique: true, name: "saas_invoice_hospital_number_unique" });
SaaSInvoice.schema.index({ status: 1, due_date: 1 }, { name: "saas_invoice_status_due_lookup" });

const SaaSPayment = makeModel("SaaSPayment", "saas_payments", {
    hospital_id: { type: Number, required: true, index: true },
    invoice_id: { type: Number, required: true, index: true },
    invoice_number: String,
    payment_number: { type: String, index: true },
    amount: { type: Number, default: 0 },
    payment_date: String,
    payment_mode: { type: String, default: "manual" },
    transaction_id: String,
    received_by: Number,
    notes: String,
});
SaaSPayment.schema.index({ hospital_id: 1, invoice_id: 1, created_at: -1 }, { name: "saas_payment_invoice_lookup" });

const SaaSPaymentIntent = makeModel("SaaSPaymentIntent", "saas_payment_intents", {
    hospital_id: { type: Number, required: true, index: true },
    invoice_id: { type: Number, required: true, index: true },
    invoice_number: String,
    gateway: { type: String, default: "manual" },
    payment_link_id: String,
    payment_link_url: String,
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    status: { type: String, default: "created", index: true }, // created, pending, paid, expired, failed, cancelled
    expires_at: String,
    paid_at: String,
    transaction_id: String,
    customer_email: String,
    customer_phone: String,
    notes: String,
    created_by: Number,
});
SaaSPaymentIntent.schema.index({ hospital_id: 1, invoice_id: 1, status: 1 }, { name: "saas_payment_intent_invoice_lookup" });



const CommunicationLog = makeModel("CommunicationLog", "communication_logs", {
    hospital_id: { type: Number, default: 1, index: true },
    channel: { type: String, default: "in_app", index: true }, // in_app, email, sms, whatsapp
    recipient_type: { type: String, default: "patient" },
    recipient_id: String,
    recipient_name: String,
    recipient_contact: String,
    title: String,
    message: String,
    module: { type: String, default: "system", index: true },
    entity_type: String,
    entity_id: String,
    status: { type: String, default: "queued", index: true }, // queued, sent, failed, skipped
    provider: String,
    provider_message_id: String,
    error_message: String,
    scheduled_for: String,
    sent_at: Date,
    created_by: Number,
});
CommunicationLog.schema.index({ hospital_id: 1, created_at: -1 }, { name: "communication_hospital_recent_lookup" });
CommunicationLog.schema.index({ hospital_id: 1, channel: 1, status: 1 }, { name: "communication_channel_status_lookup" });

const ApiKey = makeModel("ApiKey", "api_keys", {
    hospital_id: { type: Number, default: 1, index: true },
    key_id: { type: String, index: true },
    name: String,
    key_hash: String,
    key_preview: String,
    scopes: { type: [String], default: [] },
    status: { type: String, default: "active", index: true },
    last_used_at: Date,
    expires_at: Date,
    created_by: Number,
});
ApiKey.schema.index({ hospital_id: 1, key_id: 1 }, { unique: true, name: "api_key_hospital_key_unique", partialFilterExpression: { key_id: { $type: "string" } } });

const IntegrationLog = makeModel("IntegrationLog", "integration_logs", {
    hospital_id: { type: Number, default: 1, index: true },
    direction: { type: String, default: "inbound", index: true },
    system: { type: String, default: "fhir", index: true },
    resource_type: String,
    resource_id: String,
    method: String,
    endpoint: String,
    status: { type: String, default: "success", index: true },
    status_code: Number,
    api_key_id: String,
    request_payload: Object,
    response_payload: Object,
    error_message: String,
    ip_address: String,
});
IntegrationLog.schema.index({ hospital_id: 1, created_at: -1 }, { name: "integration_recent_lookup" });

const WebhookSubscription = makeModel("WebhookSubscription", "webhook_subscriptions", {
    hospital_id: { type: Number, default: 1, index: true },
    name: String,
    target_url: String,
    events: { type: [String], default: [] },
    secret: String,
    status: { type: String, default: "active", index: true },
    last_triggered_at: Date,
    failure_count: { type: Number, default: 0 },
    created_by: Number,
});

const WebhookEvent = makeModel("WebhookEvent", "webhook_events", {
    hospital_id: { type: Number, default: 1, index: true },
    event_type: { type: String, index: true },
    resource_type: String,
    resource_id: String,
    payload: Object,
    delivery_status: { type: String, default: "queued", index: true },
    attempts: { type: Number, default: 0 },
    last_error: String,
});

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
    LabTestTemplate,
    LabTest,
    RadiologyTest,
    Medicine,
    PharmacySale,
    Billing,
    InsuranceClaim,
    Prescription,
    ClinicalRecord,
    AuditLog,
    LoginHistory,
    SecuritySetting,
    DynamicField,
    Template,
    Notification,
    SaaSInvoice,
    SaaSPayment,
    SaaSPaymentIntent,
    CommunicationLog,
    Supplier,
    InventoryItem,
    InventoryBatch,
    PurchaseOrder,
    SupplierBill,
    StockReceiving,
    StockReturn,
    InventoryTransaction,
    ConsentForm,
    IncidentReport,
    SopDocument,
    ComplianceChecklist,
    BackupVerification,
    ApiKey,
    IntegrationLog,
    WebhookSubscription,
    WebhookEvent,
};
