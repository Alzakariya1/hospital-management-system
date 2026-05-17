# V44.2 — Hospital Onboarding Tenant Provision Fix

## What changed

- New hospital/clinic/diagnostic-center/lab onboarding now provisions a tenant database immediately.
- Tenant database name uses the stable pattern `hms_tenant_<hospital_code>`, for example `hms_tenant_001`.
- Provisioned hospitals now store:
  - `tenant_db_name`
  - `tenant_db_status: "provisioned"`
  - `tenant_provisioned_at`
  - backward-compatible `tenant_db_created_at`
- `ensureTenantDatabase()` writes `_tenant_meta` immediately so the tenant DB is visible in MongoDB Atlas.
- Patient, doctor, appointment, billing, inventory, lab, radiology, and other tenant collections continue to use the tenant-aware model proxy and `attachTenant`, so requests with a provisioned hospital are routed to that hospital's tenant DB.
- Existing shared hospitals can be fixed through API/UI provision and verify buttons.
- Hospital ID generation now checks the existing maximum collection ID before incrementing the counter, preventing Default Hospital and new hospitals from both receiving `id: 1`.
- Added a `fix-hospital-ids` script to repair existing duplicate/missing hospital IDs without deleting data.
- Updated tenant-safe index script to remove old global `patient_id_1` / `doctor_id_1` indexes from master and visible tenant DBs, then create compound per-hospital indexes.

## Important APIs

- `POST /api/tenant-databases/:hospitalId/provision`
- `POST /api/tenant-databases/:hospitalId/verify-provision`
- `GET /api/tenant-databases/structure-check`
- `POST /api/tenants/:id/provision-tenant-db`
- `POST /api/tenants/:id/verify-tenant-db`

## Scripts

Run from `backend/` after setting Render/local `.env` with `MONGODB_URI` pointing to `hms_master`.

```bash
npm run db:structure
npm run fix-hospital-ids
npm run fix-tenant-indexes
npm run tenant:provision-shared
npm run tenant:verify-provision
npm run tenant:audit
```

For one hospital only:

```bash
node scripts/provision-tenant-db.js 001
node scripts/verify-tenant-provision.js 001
```

## Deployment notes

1. Keep `MONGODB_URI` pointed at `hms_master`, not `test`, `hms_db`, or `hms_secure`.
2. Deploy backend first.
3. Run scripts in Render Shell or locally with the same Atlas URI:
   - `npm run fix-hospital-ids`
   - `npm run fix-tenant-indexes`
   - `npm run tenant:provision-shared`
   - `npm run tenant:verify-provision`
4. Deploy frontend.
5. In SaaS Control, use **DB structure check**, **Provision DB**, and **Verify DB**.

## Verification completed in this package

- Backend route load: passed.
- Backend QA smoke: passed.
- Backend JS syntax check for `src/**/*.js` and `scripts/*.js`: passed.
- Frontend Vite production build: passed with existing chunk-size warnings only.

No `.env`, `node_modules`, or `dist` should be included in the final zip.
