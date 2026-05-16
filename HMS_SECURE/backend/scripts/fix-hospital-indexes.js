require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/db');
const { Hospital, Counter } = require('../src/models');

(async () => {
  try {
    await connectDB();
    const collection = Hospital.collection;

    const hospitals = await Hospital.find().sort({ created_at: 1, _id: 1 });
    let maxId = 0;
    const usedIds = new Set();
    const usedCodes = new Set();

    for (const hospital of hospitals) {
      const update = {};

      // Keep the default hospital as numeric id 1 when possible.
      let nextId = Number(hospital.id || 0);
      if (!nextId || usedIds.has(nextId)) {
        maxId = Math.max(maxId, ...Array.from(usedIds).map(Number), 0);
        nextId = maxId + 1;
        update.id = nextId;
      }
      usedIds.add(nextId);
      maxId = Math.max(maxId, nextId);

      const code = String(hospital.hospital_code || '').trim().toUpperCase();
      if (!code) {
        update.$unset = { ...(update.$unset || {}), hospital_code: '' };
      } else if (usedCodes.has(code)) {
        update.hospital_code = `${code}-${nextId}`;
        usedCodes.add(update.hospital_code);
      } else {
        update.hospital_code = code;
        usedCodes.add(code);
      }

      if (Object.keys(update).length) {
        const set = { ...update };
        delete set.$unset;
        const op = {};
        if (Object.keys(set).length) op.$set = set;
        if (update.$unset) op.$unset = update.$unset;
        await Hospital.updateOne({ _id: hospital._id }, op);
      }
    }

    await Counter.findByIdAndUpdate('hospitals', { $max: { seq: maxId } }, { upsert: true });

    try { await collection.dropIndex('hospital_code_1'); } catch (_) {}
    await collection.createIndex(
      { hospital_code: 1 },
      {
        unique: true,
        sparse: true,
        name: 'hospital_code_1',
        partialFilterExpression: { hospital_code: { $type: 'string' } },
      }
    );
    await collection.createIndex({ id: 1 }, { name: 'hospital_numeric_id_lookup' });

    console.log(`Hospital index repair complete. Max hospital id: ${maxId}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Hospital index repair failed:', err);
    try { await mongoose.connection.close(); } catch (_) {}
    process.exit(1);
  }
})();
