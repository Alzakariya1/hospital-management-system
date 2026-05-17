const mongoose = require('mongoose');
const { AsyncLocalStorage } = require('async_hooks');
const { getMasterDbName, parseUriDatabaseName } = require('./db');

const tenantContext = new AsyncLocalStorage();
const connections = new Map();
const MAX_CACHE_SIZE = Number(process.env.TENANT_CONNECTION_CACHE_MAX || 100);

function tenantIsolationEnabled() {
  return String(process.env.TENANT_DB_ISOLATION || process.env.TENANT_DATABASE_MODE || 'hybrid').toLowerCase() !== 'off';
}

function sanitizeDbName(value) {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean.slice(0, 60);
}

function buildTenantDbName({ hospital_code, id, name, prefix } = {}) {
  const base = sanitizeDbName(hospital_code || name || `hospital_${id || Date.now()}`) || `hospital_${Date.now()}`;
  return `${sanitizeDbName(prefix || process.env.TENANT_DB_PREFIX || 'hms_tenant')}_${base}`;
}

function uriForDb(dbName) {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing');
  const safeDb = sanitizeDbName(dbName);
  if (!safeDb) throw new Error('Tenant database name is required');
  const qIndex = uri.indexOf('?');
  const query = qIndex >= 0 ? uri.slice(qIndex) : '';
  const base = qIndex >= 0 ? uri.slice(0, qIndex) : uri;
  const slash = base.lastIndexOf('/');
  if (slash < 0) return `${base}/${safeDb}${query}`;
  return `${base.slice(0, slash + 1)}${safeDb}${query}`;
}

function getTenantDbPrefix() {
  return sanitizeDbName(process.env.TENANT_DB_PREFIX || 'hms_tenant');
}

function getExpectedStructure() {
  return {
    master_db_name: getMasterDbName(),
    tenant_db_prefix: getTenantDbPrefix(),
    uri_db_name: parseUriDatabaseName(process.env.MONGODB_URI || '') || null,
    tenant_mode: process.env.TENANT_DATABASE_MODE || process.env.TENANT_DB_ISOLATION || 'hybrid',
  };
}

function getCurrentTenantDbName() {
  const store = tenantContext.getStore();
  return store?.tenant_db_name || null;
}

function runWithTenantDbName(tenant_db_name, fn) {
  return tenantContext.run({ tenant_db_name: sanitizeDbName(tenant_db_name) }, fn);
}

function getTenantConnection(dbName) {
  const safeDb = sanitizeDbName(dbName);
  if (!tenantIsolationEnabled() || !safeDb) return mongoose.connection;
  if (connections.has(safeDb)) return connections.get(safeDb);
  if (connections.size >= MAX_CACHE_SIZE) {
    const firstKey = connections.keys().next().value;
    const old = connections.get(firstKey);
    connections.delete(firstKey);
    old?.close?.().catch?.(() => {});
  }
  const conn = mongoose.createConnection(uriForDb(safeDb), {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
  });
  conn.on('error', (err) => console.error(`Tenant DB ${safeDb} error:`, err.message));
  connections.set(safeDb, conn);
  return conn;
}

function getTenantModel(modelName, schema, collectionName, dbName = getCurrentTenantDbName()) {
  if (!tenantIsolationEnabled() || !dbName) return null;
  const conn = getTenantConnection(dbName);
  return conn.models[modelName] || conn.model(modelName, schema, collectionName);
}

async function ensureTenantDatabase(dbName, meta = {}) {
  const safeDb = sanitizeDbName(dbName);
  if (!safeDb) throw new Error('Tenant database name is required');
  const conn = getTenantConnection(safeDb);
  await conn.asPromise?.();
  // Force DB creation without writing business data. This is safe and idempotent.
  await conn.db.collection('_tenant_meta').updateOne(
    { _id: 'tenant' },
    { $set: { db_name: safeDb, initialized_at: new Date(), last_verified_at: new Date(), architecture: 'database-per-tenant', ...meta } },
    { upsert: true },
  );
  return { db_name: safeDb, ready_state: conn.readyState };
}

async function listTenantConnectionStatus() {
  return Array.from(connections.entries()).map(([db_name, conn]) => ({ db_name, ready_state: conn.readyState }));
}

module.exports = {
  tenantIsolationEnabled,
  sanitizeDbName,
  buildTenantDbName,
  getTenantDbPrefix,
  getExpectedStructure,
  uriForDb,
  getCurrentTenantDbName,
  runWithTenantDbName,
  getTenantConnection,
  getTenantModel,
  ensureTenantDatabase,
  listTenantConnectionStatus,
};
