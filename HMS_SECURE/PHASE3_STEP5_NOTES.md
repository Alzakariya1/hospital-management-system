# Phase 3 Step 5 - Tenant-Aware Data Filtering

## What changed
- Added reusable tenant helpers in `backend/src/middleware/tenant.js`:
  - `tenantFilter(req, extra)`
  - `tenantCreateData(req, data)`
- Major backend modules now scope reads/writes by `hospital_id`.
- Existing records without `hospital_id` remain visible for the default hospital only (`DEFAULT_HOSPITAL_ID=1`).

## Scoped modules
- Patients
- Doctors
- Departments
- Appointments
- Beds
- Dashboard stats
- Billing
- Pharmacy
- Lab
- Radiology
- OPD/IPD
- Audit logs
- Security settings
- Admin users

## Safety
- No `.env` files included.
- Existing default single-hospital deployment remains supported.
- Existing old records are not hidden for default hospital.
- No frontend UI changes.
