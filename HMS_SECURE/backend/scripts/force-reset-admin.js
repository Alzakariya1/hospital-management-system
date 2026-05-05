require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('../src/models');

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI missing');

    await mongoose.connect(uri);

    const hash = await bcrypt.hash('admin12345', 12);

    const user = await User.findOneAndUpdate(
      { email: 'admin@hospital.com' },
      {
        $set: {
          full_name: 'System Admin',
          email: 'admin@hospital.com',
          password: hash,
          role: 'super_admin',
          status: 'active',
          phone: '9999999999',
          password_changed_at: new Date()
        }
      },
      { new: true, upsert: true }
    );

    const ok = await bcrypt.compare('admin12345', user.password);

    console.log('Admin reset done:', user.email);
    console.log('Password check:', ok);
    console.log('DB:', mongoose.connection.name);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();