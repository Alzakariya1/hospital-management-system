require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, mongoose } = require('../src/config/db');
const { User, Hospital, Department, Bed, Medicine, SecuritySetting } = require('../src/models');
const { provisionHospitalTenant } = require('../src/utils/tenantProvisioning');

const DEFAULT_EMAIL = 'admin@hospital.com';
const DEFAULT_PASSWORD = 'admin12345';
const DEFAULT_HOSPITAL_ID = Number(process.env.DEFAULT_HOSPITAL_ID || 1);

async function ensureDefaultHospital() {
  let hospital = await Hospital.findOne({ hospital_code: 'DEFAULT' });
  if (!hospital) hospital = await Hospital.findOne({ id: DEFAULT_HOSPITAL_ID, hospital_code: { $in: ['DEFAULT', null, undefined] } });
  if (!hospital) {
    hospital = await Hospital.create({
      id: DEFAULT_HOSPITAL_ID,
      hospital_code: 'DEFAULT',
      name: process.env.DEFAULT_HOSPITAL_NAME || 'Default Hospital',
      type: 'hospital',
      status: 'active',
      plan: 'enterprise',
      enabled_modules: ['dashboard', 'commandCenter', 'patients', 'doctors', 'appointments', 'beds', 'lab', 'radiology', 'pharmacy', 'billing', 'profile', 'tenants'],
      feature_flags: { audit_compliance: true },
    });
  }
  if (!hospital.tenant_db_name || hospital.tenant_db_status !== 'provisioned') {
    hospital = await provisionHospitalTenant(hospital, { source: 'seed_admin_default_hospital' });
  }
  return hospital;
}

(async () => {
  await connectDB();
  const email = String(process.env.SEED_ADMIN_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const password = String(process.env.SEED_ADMIN_PASSWORD || DEFAULT_PASSWORD);
  const hospital = await ensureDefaultHospital();
  const hashed = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));

  const admin = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        full_name: process.env.SEED_ADMIN_NAME || 'System Admin',
        email,
        password: hashed,
        role: 'super_admin',
        hospital_id: hospital.id || DEFAULT_HOSPITAL_ID,
        tenant_db_name: hospital.tenant_db_name || null,
        phone: process.env.SEED_ADMIN_PHONE || '9999999999',
        status: 'active',
        password_changed_at: new Date(),
      },
      $setOnInsert: { permissions: [] },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const departments = [
    { department_name: 'General Medicine', description: 'Primary care and general OPD' },
    { department_name: 'Cardiology', description: 'Heart care department' },
    { department_name: 'Pathology', description: 'Lab and diagnostics' },
  ];
  for (const dep of departments) await Department.findOneAndUpdate({ department_name: dep.department_name }, { $setOnInsert: { ...dep, hospital_id: hospital.id } }, { upsert: true });
  for (let i = 1; i <= 10; i++) await Bed.findOneAndUpdate({ bed_number: `B-${i}` }, { $setOnInsert: { hospital_id: hospital.id, bed_number: `B-${i}`, bed_type: i <= 2 ? 'ICU' : 'General', status: 'available', floor_number: i <= 5 ? '1' : '2' } }, { upsert: true });
  await Medicine.findOneAndUpdate({ medicine_name: 'Paracetamol 500mg', batch_number: 'DEFAULT-001' }, { $setOnInsert: { hospital_id: hospital.id, medicine_name: 'Paracetamol 500mg', batch_number: 'DEFAULT-001', quantity: 100, purchase_price: 1, selling_price: 2, supplier_name: 'Default Supplier' } }, { upsert: true });
  const settings = { password_min_length: process.env.PASSWORD_MIN_LENGTH || '8', session_timeout_minutes: '480', audit_retention_days: '365', backup_frequency: 'Atlas automated backup' };
  for (const [setting_key, setting_value] of Object.entries(settings)) await SecuritySetting.findOneAndUpdate({ setting_key }, { $set: { setting_value, hospital_id: hospital.id } }, { upsert: true });

  console.log(`Secure admin ready: ${email} / ${password}`);
  console.log(`Admin user id: ${admin.id}, hospital_id: ${admin.hospital_id}, tenant: ${hospital.tenant_db_name || 'not provisioned'}`);
  console.log('Deploy note: run this script on Render Shell after changing MONGODB_URI/JWT_SECRET or when login fails.');
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
