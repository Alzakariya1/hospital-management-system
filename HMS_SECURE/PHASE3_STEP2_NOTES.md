# Phase 3 Step 2 - Permission Middleware Applied

This patch keeps the existing role system compatible while adding permission checks to critical backend routes.

## Protected with permissions

- Patients: view, create, edit, delete, document management
- Doctors: view, create, edit, delete
- Appointments: view, create, edit, delete, status update
- Beds: view, create, status update
- Billing: view, create
- Pharmacy: view, create, stock management
- Lab/Radiology: view, create/report actions
- Admin users: manage users
- Audit/Security: audit view and security manage

## Compatibility

Existing users are not migrated. Their permissions come from their role mapping in `backend/src/config/permissions.js`.

Super admin keeps wildcard access with `*`.
