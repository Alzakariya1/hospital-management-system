const mongoose = require('mongoose');
require('dotenv').config();

let connectionPromise = null;

function sanitizeDbName(value) {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean.slice(0, 60);
}

function getMasterDbName() {
  // Critical SaaS rule: platform/super-admin data must never silently fall back to MongoDB's default `test` DB.
  // If Render/Atlas only has MONGODB_URI and the URI path is blank or `/test`, this forces a real master DB.
  return sanitizeDbName(process.env.MONGODB_MASTER_DB_NAME || process.env.MONGODB_DB_NAME || 'hms_super_admin');
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing. Add MongoDB Atlas connection string in Render environment variables.');
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: getMasterDbName(),
      autoIndex: true,
      serverSelectionTimeoutMS: 15000,
    });
  }
  return connectionPromise;
}

module.exports = { connectDB, mongoose, getMasterDbName };
