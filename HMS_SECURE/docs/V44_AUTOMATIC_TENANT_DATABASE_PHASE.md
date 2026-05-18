# V44 Automatic Tenant Database Phase

## Goal
Stop hospital data conflict by keeping platform/super-admin records in a master database and hospital business records in one isolated MongoDB database per hospital.

## What changed

- Master database is now documented as `hms_master` in `backend/.env.example`.
- New hospital creation now automatically provisions a tenant database before the API returns success.
- Tenant database names are deterministic and readable:

```text
<TENANT_DB_PREFIX>_<hospital-name>_<hospital-code>_<hospital-id>
```

Example:

```text
hms_tenant_city_care_001_12
```

- If a tenant DB cannot be created, the hospital creation is rolled back so the system does not keep a broken hospital entry.
- Login tokens already include `tenant_db_name`; tenant-aware routes use that DB for patient, doctor, appointment, lab, pharmacy, billing, inventory, EMR, compliance, and other hospital data.
- Super-admin/platform collections such as users, hospitals, SaaS billing, tenant backups, and subscriptions remain in the master DB.

## Deployment environment

Use a master database in the MongoDB URI/DB name:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/hms_master?retryWrites=true&w=majority
MONGODB_DB_NAME=hms_master
TENANT_DATABASE_MODE=hybrid
TENANT_DB_ISOLATION=hybrid
TENANT_DB_PREFIX=hms_tenant
```

## Existing hospitals

Existing hospitals that were created before this phase may still show `tenant_db_status: shared`. Provision them from the Tenant Database page/API or run:

```bash
npm run tenant:provision -- <hospital_code_or_id>
```

For moving old shared records into a new tenant DB, use the existing migration script carefully after backup:

```bash
npm run tenant:migrate -- <hospital_code_or_id>
```

## Validation performed

- Backend route load check passed.
- Tenant isolation audit passed.
- Frontend production build passed.

