require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/db');

async function dropIfExists(collection, name) {
  try {
    await mongoose.connection.db.collection(collection).dropIndex(name);
    console.log(`Dropped ${collection}.${name}`);
  } catch (err) {
    if (!String(err.message).includes('index not found')) console.log(`Skip ${collection}.${name}: ${err.message}`);
  }
}

async function main() {
  await connectDB();
  await dropIfExists('patients', 'patient_id_1');
  await dropIfExists('doctors', 'doctor_id_1');
  await dropIfExists('appointments', 'appointment_uid_1');
  await dropIfExists('billings', 'invoice_number_1');
  await mongoose.connection.db.collection('patients').createIndex(
    { hospital_id: 1, patient_id: 1 },
    { unique: true, name: 'patient_hospital_patient_id_unique', partialFilterExpression: { patient_id: { $type: 'string' } } }
  );
  await mongoose.connection.db.collection('doctors').createIndex(
    { hospital_id: 1, doctor_id: 1 },
    { unique: true, name: 'doctor_hospital_doctor_id_unique', partialFilterExpression: { doctor_id: { $type: 'string' } } }
  );
  console.log('Tenant-safe indexes are ready. Patient/doctor IDs are now unique per hospital, not global.');
}
main().then(()=>process.exit(0)).catch((err)=>{ console.error(err); process.exit(1); });
