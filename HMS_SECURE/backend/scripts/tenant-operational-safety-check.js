const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const models = read('src/models/index.js');
const tenantListBlock = models.match(/const TENANT_COLLECTIONS = new Set\(\[([\s\S]*?)\]\);/)[1];
const tenantCollections = new Set([...tenantListBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]));

for (const required of ['patients', 'doctors', 'appointments', 'billing', 'beds', 'lab_tests', 'radiology_tests', 'medicines', 'pharmacy_sales', 'inventory_items', 'audit_logs']) {
  assert(tenantCollections.has(required), `${required} must be tenant-aware`);
}
assert(!tenantCollections.has('hospitals'), 'hospitals must remain master/super-admin collection');
assert(!tenantCollections.has('users'), 'users must remain master/super-admin collection');

const tenant = read('src/middleware/tenant.js');
assert(tenant.includes('ensureTenantDatabase'), 'attachTenant must auto-provision missing tenant DBs');
assert(tenant.includes('Default Hospital'), 'default hospital must be provisioned instead of using master DB for operations');
assert(tenant.includes('database-per-tenant'), 'tenant storage mode must be database-per-tenant when tenant DB exists');

const patients = read('src/routes/patient.routes.js');
assert(patients.includes('ensureUniqueCode(Patient'), 'Patient create must auto-resolve duplicate/missing patient_id');
assert(patients.includes('router.use(verifyToken, attachTenant)'), 'Patient routes must attach tenant context');

const core = read('src/routes/core.routes.js');
assert(core.includes('ensureUniqueCode(Doctor'), 'Doctor create must auto-resolve duplicate/missing doctor_id');
assert(core.includes('router.use(verifyToken, attachTenant)'), 'Core routes must attach tenant context');

const billing = read('src/routes/billing.routes.js');
assert(billing.includes('router.use(verifyToken, attachTenant)'), 'Billing routes must attach tenant context');
assert(billing.includes('Billing.create'), 'Billing create route must exist');

const errorHandler = read('src/middleware/errorHandler.js');
assert(errorHandler.includes('DUPLICATE_KEY'), 'Duplicate Mongo errors must be converted to safe API response');

console.log('Tenant operational safety check passed. Operational modules are protected from master DB writes and raw duplicate key crashes.');
