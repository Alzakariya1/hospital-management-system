require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/db');
const { Doctor } = require('../src/models');

(async () => {
  try {
    await connectDB();
    const collection = Doctor.collection;
    const indexes = await collection.indexes();

    const legacyGlobalDoctorIdIndexes = indexes.filter((idx) => {
      const key = idx.key || {};
      return idx.unique === true
        && Object.keys(key).length === 1
        && key.doctor_id === 1;
    });

    for (const idx of legacyGlobalDoctorIdIndexes) {
      console.log(`Dropping legacy global doctor_id index: ${idx.name}`);
      await collection.dropIndex(idx.name);
    }

    const defaultHospitalId = Number(process.env.DEFAULT_HOSPITAL_ID || 1);
    const legacyTenantResult = await collection.updateMany(
      { $or: [{ hospital_id: { $exists: false } }, { hospital_id: null }] },
      { $set: { hospital_id: defaultHospitalId } },
    );
    if (legacyTenantResult.modifiedCount) {
      console.log(`Assigned hospital_id=${defaultHospitalId} to ${legacyTenantResult.modifiedCount} legacy doctor records.`);
    }

    const currentIndexes = await collection.indexes();
    const hasCompoundIndex = currentIndexes.some((idx) => {
      const key = idx.key || {};
      return idx.unique === true
        && key.hospital_id === 1
        && key.doctor_id === 1;
    });

    if (!hasCompoundIndex) {
      console.log('Creating compound unique index: { hospital_id: 1, doctor_id: 1 }');
      await collection.createIndex(
        { hospital_id: 1, doctor_id: 1 },
        {
          unique: true,
          name: 'doctor_hospital_doctor_id_unique',
          partialFilterExpression: { doctor_id: { $type: 'string' } },
        },
      );
    } else {
      console.log('Compound doctor index already exists.');
    }

    console.log('Doctor index migration completed safely.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Doctor index migration failed:', error.message);
    if (error?.code === 11000) {
      console.error('Duplicate doctor_id values already exist in the same hospital. Resolve duplicates first, then rerun this script.');
    }
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
})();
