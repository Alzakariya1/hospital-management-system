require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/db');
const { getExpectedStructure } = require('../src/config/tenantDb');

async function dropIfExists(db, collection, name) {
  try {
    await db.collection(collection).dropIndex(name);
    console.log(`Dropped ${db.databaseName}.${collection}.${name}`);
  } catch (err) {
    const msg = String(err.message || '');
    if (!msg.includes('index not found') && !msg.includes('ns not found')) console.log(`Skip ${db.databaseName}.${collection}.${name}: ${msg}`);
  }
}

async function ensureTenantSafeIndexes(db) {
  await dropIfExists(db, 'patients', 'patient_id_1');
  await dropIfExists(db, 'doctors', 'doctor_id_1');
  await dropIfExists(db, 'appointments', 'appointment_uid_1');
  await dropIfExists(db, 'billings', 'invoice_number_1');
  await db.collection('patients').createIndex(
    { hospital_id: 1, patient_id: 1 },
    { unique: true, name: 'patient_hospital_patient_id_unique', partialFilterExpression: { patient_id: { $type: 'string' } } }
  );
  await db.collection('doctors').createIndex(
    { hospital_id: 1, doctor_id: 1 },
    { unique: true, name: 'doctor_hospital_doctor_id_unique', partialFilterExpression: { doctor_id: { $type: 'string' } } }
  );
}

async function main() {
  await connectDB();
  const expected = getExpectedStructure();
  const listed = await mongoose.connection.db.admin().listDatabases();
  const dbNames = [mongoose.connection.name, ...listed.databases.map((d) => d.name).filter((name) => name.startsWith(`${expected.tenant_db_prefix}_`))];
  for (const name of [...new Set(dbNames)]) {
    await ensureTenantSafeIndexes(mongoose.connection.client.db(name));
  }
  console.log('Tenant-safe indexes are ready in master/legacy DB and visible tenant DBs. Patient/doctor IDs are unique per hospital or per tenant DB, not globally.');
  await mongoose.disconnect();
}
main().then(()=>process.exit(0)).catch((err)=>{ console.error(err); process.exit(1); });
