const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const routesDir = path.join(ROOT, 'src', 'routes');

const tenantRequiredRoutes = [
  'patient.routes.js',
  'core.routes.js',
  'opd-ipd.routes.js',
  'lab-radiology.routes.js',
  'pharmacy.routes.js',
  'inventory.routes.js',
  'billing.routes.js',
  'insurance-tpa.routes.js',
  'notification.routes.js',
  'communication.routes.js',
  'portal.routes.js',
  'emr.routes.js',
  'audit-security.routes.js',
  'compliance.routes.js',
  'integration.routes.js',
  'command-center.routes.js',
  'operations.routes.js',
  'configuration.routes.js',
  'template.routes.js',
  'legal-security.routes.js',
  'pilot.routes.js',
];

const masterOnlyRoutes = [
  'auth.routes.js',
  'tenant.routes.js',
  'tenant-database.routes.js',
  'saas.routes.js',
  'saas-billing.routes.js',
  'saas-business.routes.js',
  'sales.routes.js',
  'subscription.routes.js',
];

const failures = [];
for (const file of tenantRequiredRoutes) {
  const full = path.join(routesDir, file);
  if (!fs.existsSync(full)) {
    failures.push(`${file}: missing route file`);
    continue;
  }
  const source = fs.readFileSync(full, 'utf8');
  if (!source.includes('attachTenant')) failures.push(`${file}: missing attachTenant middleware`);
  if (!source.includes('tenantFilter') && !source.includes('tenantCreateData') && !source.includes('withTenantCreate')) {
    failures.push(`${file}: no tenant filter/create helper usage detected`);
  }
}

for (const file of masterOnlyRoutes) {
  const full = path.join(routesDir, file);
  if (!fs.existsSync(full)) continue;
  const source = fs.readFileSync(full, 'utf8');
  if (source.includes('attachTenant') && !['tenant-database.routes.js'].includes(file)) {
    console.warn(`Note: ${file} uses attachTenant although it is normally master-level.`);
  }
}

const modelsSource = fs.readFileSync(path.join(ROOT, 'src', 'models', 'index.js'), 'utf8');
const tenantCollections = [
  'patients', 'doctors', 'appointments', 'billing', 'medicines', 'pharmacy_sales',
  'lab_tests', 'radiology_tests', 'inventory_items', 'inventory_batches', 'purchase_orders',
  'consent_forms', 'incident_reports', 'audit_logs', 'dynamic_fields', 'templates',
  'data_requests', 'security_incidents', 'pilot_deployments', 'pilot_tasks'
];
for (const collection of tenantCollections) {
  if (!modelsSource.includes(`"${collection}"`)) failures.push(`models/index.js: ${collection} missing from tenant-aware collection list`);
}

if (failures.length) {
  console.error('Tenant isolation audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Tenant isolation audit passed. Tenant-required routes and collections are wired for tenant context.');
