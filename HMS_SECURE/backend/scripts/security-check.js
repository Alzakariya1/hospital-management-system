require('dotenv').config();
const required = ['MONGODB_URI', 'JWT_SECRET', 'FRONTEND_URL'];
const weakValues = new Set(['dev_secret_change_me', 'change_this_to_a_long_random_secret_before_production', 'admin12345', 'password']);
let failed = false;
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`);
    failed = true;
  }
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || weakValues.has(process.env.JWT_SECRET)) {
  console.error('JWT_SECRET must be a strong random value of at least 32 characters.');
  failed = true;
}
if (process.env.NODE_ENV === 'production' && String(process.env.FRONTEND_URL || '').includes('localhost')) {
  console.error('FRONTEND_URL must not be localhost in production.');
  failed = true;
}
if (process.env.SEED_ADMIN_PASSWORD && weakValues.has(process.env.SEED_ADMIN_PASSWORD)) {
  console.error('SEED_ADMIN_PASSWORD is weak. Change before production seeding.');
  failed = true;
}
if (failed) process.exit(1);
console.log('Security environment check passed.');
