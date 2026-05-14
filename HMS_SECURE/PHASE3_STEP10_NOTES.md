# Phase 3 Step 10 - Hospital Details, Branding, Three-Dot Actions

## Added
- Hospital details/settings fields in Hospitals panel.
- Hospital branding fields: primary and secondary colors.
- Prefix settings: UHID, bill, prescription, and lab report prefixes.
- Hospital logo file upload using existing Cloudinary setup.
- Hospital details modal.
- Hospital admin users modal.
- Three-dot row actions:
  - View Details
  - Edit Hospital
  - Upload Logo
  - Manage Modules
  - Manage Features
  - Manage Admin Users
  - Disable/Enable
  - Archive Hospital
- Safe archive endpoint instead of hard delete.

## Safety
- Existing data is not reset.
- Existing login flow is preserved.
- `.env` is not included.
- `node_modules` and `dist` are not included.
- `package-lock.json` is preserved for backend and frontend.

## New API Endpoints
- POST /api/tenants/:id/logo
- DELETE /api/tenants/:id

## Important
Archive is soft delete: hospital status becomes `archived`, `is_deleted=true`, and hospital login is blocked.
