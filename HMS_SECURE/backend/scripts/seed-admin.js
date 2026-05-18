require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB } = require('../src/config/db');
const { User, Department, Bed, Medicine, SecuritySetting } = require('../src/models');

(async () => {
  await connectDB();
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@hospital.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin12345';
  const hashed = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));
  await User.findOneAndUpdate(
    { email },
    { $set: { full_name: 'System Admin', email, password: hashed, role: 'super_admin', phone: '9999999999', status: 'active', password_changed_at: new Date() } },
    { upsert: true, new: true }
  );
  const departments = [
    { department_name: 'General Medicine', description: 'Primary care and general OPD' },
    { department_name: 'Cardiology', description: 'Heart care department' },
    { department_name: 'Pathology', description: 'Lab and diagnostics' }
  ];
  for (const dep of departments) await Department.findOneAndUpdate({ department_name: dep.department_name }, { $setOnInsert: dep }, { upsert: true });
  for (let i = 1; i <= 10; i++) await Bed.findOneAndUpdate({ bed_number: `B-${i}` }, { $setOnInsert: { bed_number: `B-${i}`, bed_type: i <= 2 ? 'ICU' : 'General', status: 'available', floor_number: i <= 5 ? '1' : '2' } }, { upsert: true });
  await Medicine.findOneAndUpdate({ medicine_name: 'Paracetamol 500mg', batch_number: 'DEFAULT-001' }, { $setOnInsert: { medicine_name: 'Paracetamol 500mg', batch_number: 'DEFAULT-001', quantity: 100, purchase_price: 1, selling_price: 2, supplier_name: 'Default Supplier' } }, { upsert: true });
  const settings = { password_min_length: process.env.PASSWORD_MIN_LENGTH || '8', session_timeout_minutes: '480', audit_retention_days: '365', backup_frequency: 'Atlas automated backup' };
  for (const [setting_key, setting_value] of Object.entries(settings)) await SecuritySetting.findOneAndUpdate({ setting_key }, { $set: { setting_value } }, { upsert: true });
  console.log(`Secure admin ready: ${email} / ${password}`);
  console.log('Change this password after first login.');
  process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
