require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/db');
const { Hospital } = require('../src/models');

(async () => {
  await connectDB();
  const hospitals = await Hospital.find().sort({ created_at: 1, _id: 1 });
  const used = new Set();
  let next = Math.max(1, ...hospitals.map((h) => Number(h.id || 0)).filter(Boolean));
  let changed = 0;
  for (const h of hospitals) {
    const current = Number(h.id || 0);
    if (current > 0 && !used.has(current)) { used.add(current); continue; }
    do { next += 1; } while (used.has(next));
    console.log(`Fixing duplicate/missing hospital id: ${h.name} ${current || '(missing)'} -> ${next}`);
    h.id = next;
    used.add(next);
    changed += 1;
    await h.save();
  }
  const Counter = mongoose.connection.model('Counter');
  await Counter.findByIdAndUpdate('hospitals', { $set: { seq: Math.max(...Array.from(used), 1) } }, { upsert: true });
  console.log(`Hospital ID fix complete. Changed: ${changed}. Max id: ${Math.max(...Array.from(used), 1)}`);
  await mongoose.disconnect();
})().catch((err) => { console.error('Hospital ID fix failed:', err.message); process.exit(1); });
