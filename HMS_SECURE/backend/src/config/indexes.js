async function ensureTenantIndexes(mongoose) {
  const db = mongoose.connection.db;
  if (!db) return;

  await ensureDoctorIndexes(db);
}

async function ensureDoctorIndexes(db) {
  const collection = db.collection('doctors');
  const indexes = await collection.indexes();

  const oldDoctorIdIndexes = indexes.filter((idx) => {
    const key = idx.key || {};
    return key.doctor_id === 1 && !key.hospital_id;
  });

  for (const idx of oldDoctorIdIndexes) {
    try {
      await collection.dropIndex(idx.name);
      console.log(`Dropped old doctors.${idx.name} index`);
    } catch (error) {
      console.warn(`Could not drop doctors.${idx.name} index:`, error.message);
    }
  }

  try {
    const result = await collection.updateMany(
      { $or: [{ hospital_id: { $exists: false } }, { hospital_id: null }] },
      { $set: { hospital_id: Number(process.env.DEFAULT_HOSPITAL_ID || 1) } }
    );
    if (result.modifiedCount) console.log(`Migrated ${result.modifiedCount} legacy doctor records to default hospital`);
  } catch (error) {
    console.warn('Could not migrate legacy doctor hospital_id:', error.message);
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
