# V47 Tenant Operational Module Fix

## Main fixes

- Operational module data is forced into hospital tenant databases, not `hms_super_admin`.
- Default Hospital now also gets a tenant database automatically.
- Missing tenant database metadata is auto-provisioned at request time through `attachTenant`.
- `billing` collection is now tenant-aware. Earlier it was listed as `billings`, which could allow billing records to stay in master DB.
- Patient create now auto-resolves duplicate or missing `patient_id` values instead of throwing raw E11000 errors.
- Doctor create now auto-resolves duplicate or missing `doctor_id` values instead of throwing raw E11000 errors.
- Global duplicate-key errors now return a safe 409 JSON response instead of raw MongoDB stack/error text.
- Seed script now seeds operational default data inside the Default Hospital tenant DB, not master DB.
- Fresh reset now creates:
  - master DB: `hms_super_admin`
  - super-admin user
  - Default Hospital record in master DB
  - Default Hospital tenant DB
  - tenant indexes for patients/doctors/billing

## New validation command

```bash
npm run tenant:safety-check
```

This checks that patients, doctors, appointments, billing, beds, lab, radiology, pharmacy, inventory, and audit collections are tenant-aware and protected from master DB writes.

## Commands tested

```bash
npm run tenant:safety-check
npm run check-routes
npm run tenant:verify-architecture
npm run tenant:audit
```

Frontend production build also passed.
