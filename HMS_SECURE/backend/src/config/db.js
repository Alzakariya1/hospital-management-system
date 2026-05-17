const mongoose = require('mongoose');
require('dotenv').config();

let connectionPromise = null;

function parseUriDatabaseName(uri = '') {
  const clean = String(uri || '').split('?')[0].replace(/\/+$/, '');
  const last = clean.slice(clean.lastIndexOf('/') + 1);
  if (!last || last.includes('@') || last.includes(':')) return '';
  return last;
}

function getMasterDbName() {
  const explicit = String(process.env.MASTER_DB_NAME || process.env.MONGODB_DB_NAME || '').trim();
  if (explicit) return explicit;
  // Never allow Mongoose to silently fall back to MongoDB's default `test` DB.
  // hms_master stores SaaS control data; tenant DBs store hospital/clinic/lab operational data.
  return 'hms_master';
}

function getMongoDbStructureWarnings() {
  const uriDb = parseUriDatabaseName(process.env.MONGODB_URI || '');
  const masterDb = getMasterDbName();
  const warnings = [];
  if (!process.env.MONGODB_URI) warnings.push('MONGODB_URI is missing.');
  if (!uriDb) warnings.push('MONGODB_URI has no database path; MASTER_DB_NAME will be used to avoid default test DB.');
  if (uriDb === 'test') warnings.push('MONGODB_URI points to /test. MASTER_DB_NAME override should be hms_master for production.');
  if (['admin', 'local', 'config'].includes(masterDb)) warnings.push(`MASTER_DB_NAME cannot be a system DB: ${masterDb}`);
  if (masterDb === 'test') warnings.push('MASTER_DB_NAME is test. Use hms_master for production SaaS control data.');
  return { uri_db_name: uriDb || null, master_db_name: masterDb, warnings };
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing. Add MongoDB Atlas connection string in Render environment variables.');
  const masterDbName = getMasterDbName();
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: masterDbName,
      autoIndex: true,
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 15000),
    });
  }
  return connectionPromise;
}

module.exports = { connectDB, mongoose, getMasterDbName, getMongoDbStructureWarnings, parseUriDatabaseName };
