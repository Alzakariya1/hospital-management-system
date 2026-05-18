require('dotenv').config();
const assert = require('assert');
const { getMasterDbName } = require('../src/config/db');
const { buildTenantDbName, sanitizeDbName, uriForDb } = require('../src/config/tenantDb');

function main() {
  const masterDb = getMasterDbName();
  assert(masterDb && masterDb !== 'test', 'Master DB must not be empty or test');

  const tenantDb = buildTenantDbName({ name: 'City Care Hospital', hospital_code: 'CCH', id: 27 });
  assert(tenantDb.includes('city_care_hospital'), 'Tenant DB should include hospital name');
  assert(tenantDb.includes('cch'), 'Tenant DB should include hospital code');
  assert(tenantDb.includes('27'), 'Tenant DB should include hospital id');
  assert(tenantDb !== masterDb, 'Tenant DB must be different from master DB');

  const originalUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb+srv://user:pass@example.mongodb.net/test?retryWrites=true&w=majority';
  const tenantUri = uriForDb(tenantDb);
  assert(tenantUri.includes(`/${tenantDb}?`), 'Tenant URI must target tenant DB, not test DB');
  process.env.MONGODB_URI = originalUri;

  console.log('Tenant architecture verification passed');
  console.log(`Master DB: ${masterDb}`);
  console.log(`Sample tenant DB: ${tenantDb}`);
}

main();
