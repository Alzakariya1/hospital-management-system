async function ensureTenantIndexes(mongoose) {
  const db = mongoose.connection.db;
  if (!db) return;

  await ensureDoctorIndexes(db);
}

async function ensureDoctorIndexes(db) {
  const collection = db.collection('doctors');
  const indexes = await collection.indexes();

  const globalDoctorIdIndex = indexes.find((idx) => idx.name === 'doctor_id_1' && idx.unique);
  if (globalDoctorIdIndex) {
    try {
      await collection.dropIndex('doctor_id_1');
      console.log('Dropped global doctors.doctor_id_1 unique index');
    } catch (error) {
      console.warn('Could not drop doctors.doctor_id_1 index:', error.message);
    }
  }

  try {
    await collection.createIndex(
      { hospital_id: 1, doctor_id: 1 },
      {
        unique: true,
        sparse: true,
        name: 'hospital_id_1_doctor_id_1_unique',
      }
    );
  } catch (error) {
    console.warn('Could not create tenant doctor_id unique index:', error.message);
  }
}

module.exports = { ensureTenantIndexes };
