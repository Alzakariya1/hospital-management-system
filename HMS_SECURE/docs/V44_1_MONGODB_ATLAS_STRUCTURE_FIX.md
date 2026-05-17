# V44.1 MongoDB Atlas Structure Fix + Tenant Provision Verification

## Goal

This phase prevents HMS from silently writing production data into MongoDB's default `test` database and verifies the expected SaaS database layout:

```txt
hms_master
hms_tenant_<hospital_code>
hms_tenant_<clinic_code>
hms_tenant_<lab_code>
```

## Correct Atlas structure

### Master DB: `hms_master`
Stores SaaS/control-plane data only:

- hospitals
- users
- saas_plans
- subscriptions
- tenant_backups
- tenant_migrations
- tenant provision logs / global settings

### Tenant DBs: `hms_tenant_*`
Store hospital/clinic/lab operational data:

- patients
- doctors
- appointments
- billings/payments
- pharmacy
- inventory
- lab/radiology
- compliance
- templates/dynamic_fields
- tenant audit logs

## Important Render env values

Use these in Render backend environment:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/hms_master?retryWrites=true&w=majority
MASTER_DB_NAME=hms_master
MONGODB_DB_NAME=hms_master
TENANT_DATABASE_MODE=hybrid
TENANT_DB_ISOLATION=hybrid
TENANT_DB_PREFIX=hms_tenant
```

Do not use `/test` for production. If the database name is missing from `MONGODB_URI`, V44.1 forces `hms_master` through `MASTER_DB_NAME` to avoid defaulting to `test`.

## New commands

```bash
cd backend
npm run db:structure
npm run tenant:verify-provision -- HOSPITAL_CODE_OR_ID
```

## New API checks

```txt
GET  /api/tenant-databases/structure-check
POST /api/tenant-databases/:hospitalId/verify-provision
```

## How to verify after deploy

1. Update Render env to use `hms_master`.
2. Redeploy backend.
3. Open `/api/health`; confirm `database_name` is `hms_master`.
4. In SaaS Control Center, provision/verify a tenant DB for a hospital.
5. Check MongoDB Atlas. You should see a DB like `hms_tenant_hosp001` with `_tenant_meta`.
6. Add Patient `001` in Hospital A and Patient `001` in Hospital B. They should not conflict.

## Existing `test`, `hms_db`, `hms_secure`

Do not delete these immediately. They may contain legacy/shared data. First:

1. Run backup.
2. Run migration preview.
3. Copy data to tenant DBs.
4. Verify counts and app screens.
5. Only then plan cleanup.
