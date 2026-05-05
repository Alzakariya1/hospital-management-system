require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/db');
const { User } = require('../src/models');
(async () => {
  await connectDB();
  const users = await User.find({}, 'id full_name email role status last_login_at').lean();
  console.log('MongoDB OK:', mongoose.connection.name);
  console.table(users);
  process.exit(0);
})().catch((err) => { console.error('DB check failed:', err.message); process.exit(1); });
