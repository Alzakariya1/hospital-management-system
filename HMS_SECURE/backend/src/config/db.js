const mongoose = require('mongoose');
require('dotenv').config();
let connectionPromise = null;
async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing. Add MongoDB Atlas connection string in Render environment variables.');
  if (!connectionPromise) connectionPromise = mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || undefined, autoIndex: true, serverSelectionTimeoutMS: 15000 });
  return connectionPromise;
}
module.exports = { connectDB, mongoose };
