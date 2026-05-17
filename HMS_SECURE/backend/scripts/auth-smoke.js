require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB, mongoose } = require('../src/config/db');
const { User, Hospital } = require('../src/models');

(async () => {
  await connectDB();
  const email = String(process.env.SEED_ADMIN_EMAIL || 'admin@hospital.com').trim().toLowerCase();
  const password = String(process.env.SEED_ADMIN_PASSWORD || 'admin12345');
  const user = await User.findOne({ email });
  if (!user) throw new Error(`Admin user not found: ${email}. Run npm run seed.`);
  if (user.status !== 'active') throw new Error(`Admin user is not active: ${user.status}`);
  const ok = await bcrypt.compare(password, user.password || '');
  if (!ok) throw new Error(`Admin password check failed for ${email}. Run npm run seed to reset it.`);
  const hospital = await Hospital.findOne({ id: Number(user.hospital_id || process.env.DEFAULT_HOSPITAL_ID || 1) });
  if (!hospital) throw new Error(`Hospital not found for admin hospital_id=${user.hospital_id}`);
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, hospital_id: Number(user.hospital_id || 1) }, secret, { expiresIn: '5m' });
  jwt.verify(token, secret);
  console.log('AUTH SMOKE OK');
  console.log(`email=${email}`);
  console.log(`role=${user.role}`);
  console.log(`hospital_id=${user.hospital_id}`);
  console.log(`tenant=${hospital.tenant_db_name || 'none'}`);
  console.log(`jwt_secret_configured=${Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET !== 'dev_secret_change_me')}`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => { console.error('AUTH SMOKE FAILED:', err.message); process.exit(1); });
