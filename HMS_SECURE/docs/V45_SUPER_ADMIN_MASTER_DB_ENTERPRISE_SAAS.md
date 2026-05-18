# V45 Super Admin Master DB + Enterprise SaaS Tenant Architecture

## What was fixed

- Platform/super-admin data now has a hard master DB fallback: `hms_super_admin`.
- The backend no longer silently saves hospital registry data to MongoDB's default `test` DB when `MONGODB_URI` contains `/test` or has no DB path.
- New hospital creation continues to create a separate tenant database automatically using hospital name + code + id, for example: `hms_tenant_city_care_hospital_cch_27`.
- Super-admin routes can list hospitals, view tenant DB status, queue backups, list backup records, and access tenant data summaries.

## Correct production database layout

### Master / platform database

Use this DB for SaaS control-plane data only:

- `users`
- `hospitals`
- `tenant_backups`
- `subscriptions`
- platform audit and control-plane records

Recommended name:

```env
MONGODB_MASTER_DB_NAME=hms_super_admin
MONGODB_DB_NAME=hms_super_admin
```

### Tenant / hospital databases

Each hospital gets its own business-data database:

- `patients`
- `doctors`
- `appointments`
- `beds`
- `opd_records`
- `ipd_admissions`
- `lab_tests`
- `radiology_tests`
- `medicines`
- `billings`
- inventory, pharmacy, compliance, and clinical records

Example:

```text
hms_tenant_city_care_hospital_cch_27
```

## Important Render/Atlas environment setup

Use a URI without `/test` and set the master DB explicitly:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_MASTER_DB_NAME=hms_super_admin
MONGODB_DB_NAME=hms_super_admin
TENANT_DATABASE_MODE=hybrid
TENANT_DB_ISOLATION=hybrid
TENANT_DB_PREFIX=hms_tenant
```

If your URI still contains `/test`, the code now overrides the active database using `dbName: hms_super_admin`, but production should still avoid `/test` to reduce confusion in MongoDB Atlas.

## Super-admin tenant access endpoints

- `GET /api/tenant-databases/overview`
- `POST /api/tenant-databases/:hospitalId/provision`
- `POST /api/tenant-databases/:hospitalId/backup`
- `GET /api/tenant-databases/backups`
- `GET /api/tenant-databases/:hospitalId/data-summary`

All require `hospital.manage` permission.

## Validation commands

```bash
cd backend
npm run tenant:verify-architecture
npm run check-routes
npm run tenant:audit
```

Frontend:

```bash
cd frontend
npm run build
```

## Enterprise SaaS recommendation

For HMS, use a hybrid database-per-tenant model:

1. Master DB for super-admin, tenant registry, subscriptions, billing, backup records, and support access.
2. Separate DB per hospital for patient, doctor, EMR, lab, pharmacy, billing, and audit data.
3. Tenant-aware middleware must resolve hospital from JWT/header, then switch Mongoose models to the tenant DB.
4. Super-admin support tools should never directly mix tenant records in master DB. They should query tenant DBs through controlled endpoints.
5. Backups must be per-tenant so one hospital can be restored without affecting others.
6. For very large enterprise hospitals, move their tenant DB to a dedicated cluster later while keeping the same master registry pattern.
