require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB } = require('../src/config/db');
const { User, Hospital, Department, Bed, Medicine, SecuritySetting } = require('../src/models');
const { buildTenantDbName, ensureTenantDatabase, runWithTenantDbName } = require('../src/config/tenantDb');

(async () => {
  await connectDB();
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@hospital.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin12345';
  const hashed = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));
  await User.findOneAndUpdate(
    { email },
    { $set: { full_name: 'System Admin', email, password: hashed, role: 'super_admin', phone: '9999999999', status: 'active', hospital_id: null, permissions: ['*'], password_changed_at: new Date() } },
    { upsert: true, new: true }
  );

  const defaultHospital = await Hospital.findOneAndUpdate(
    { id: Number(process.env.DEFAULT_HOSPITAL_ID || 1) },
    {
      $setOnInsert: {
        id: Number(process.env.DEFAULT_HOSPITAL_ID || 1),
        hospital_code: process.env.DEFAULT_HOSPITAL_CODE || 'DEFAULT',
        name: process.env.DEFAULT_HOSPITAL_NAME || 'Default Hospital',
        type: 'hospital',
        status: 'active',
        plan: 'enterprise',
      },
    },
    { upsert: true, new: true }
  );
  const tenantDbName = defaultHospital.tenant_db_name || buildTenantDbName({ id: defaultHospital.id, hospital_code: defaultHospital.hospital_code, name: defaultHospital.name });
  await ensureTenantDatabase(tenantDbName);
  await Hospital.updateOne({ id: defaultHospital.id }, { $set: { tenant_db_name: tenantDbName, tenant_db_status: 'active', tenant_db_created_at: defaultHospital.tenant_db_created_at || new Date() } });
  await runWithTenantDbName(tenantDbName, async () => {
    const departments = [
      { hospital_id: defaultHospital.id, department_name: 'General Medicine', description: 'Primary care and general OPD' },
      { hospital_id: defaultHospital.id, department_name: 'Cardiology', description: 'Heart care department' },
      { hospital_id: defaultHospital.id, department_name: 'Pathology', description: 'Lab and diagnostics' }
    ];
    for (const dep of departments) await Department.findOneAndUpdate({ department_name: dep.department_name }, { $setOnInsert: dep }, { upsert: true });
    for (let i = 1; i <= 10; i++) await Bed.findOneAndUpdate({ bed_number: `B-${i}` }, { $setOnInsert: { hospital_id: defaultHospital.id, bed_number: `B-${i}`, bed_type: i <= 2 ? 'ICU' : 'General', status: 'available', floor_number: i <= 5 ? '1' : '2' } }, { upsert: true });
    await Medicine.findOneAndUpdate({ name: 'Paracetamol 500mg', batch_number: 'DEFAULT-001' }, { $setOnInsert: { hospital_id: defaultHospital.id, name: 'Paracetamol 500mg', medicine_name: 'Paracetamol 500mg', batch_number: 'DEFAULT-001', quantity: 100, purchase_price: 1, selling_price: 2, supplier_name: 'Default Supplier' } }, { upsert: true });
    const settings = { password_min_length: process.env.PASSWORD_MIN_LENGTH || '8', session_timeout_minutes: '480', audit_retention_days: '365', backup_frequency: 'Atlas automated backup' };
    for (const [setting_key, setting_value] of Object.entries(settings)) await SecuritySetting.findOneAndUpdate({ setting_key }, { $set: { hospital_id: defaultHospital.id, setting_value } }, { upsert: true });
  });
  console.log(`Secure admin ready: ${email} / ${password}`);
  console.log(`Default hospital tenant DB ready: ${tenantDbName}`);
  console.log('Change this password after first login.');
  process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
