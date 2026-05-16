# HMS Enterprise Project Notes

This file consolidates phase notes from previous package versions to keep the ZIP clean.



---

## PHASE3_STEP10_NOTES.md

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



---

## PHASE3_STEP11B3_DOCTOR_DOCUMENT_UPLOAD_V4_NOTES.md

# PHASE3 STEP11B3 DOCTOR DOCUMENT UPLOAD V4

Base used:
- HMS_SECURE_PHASE3_STEP11B3_DOCTOR_IMAGE_UPLOAD_V3.zip

Scope:
- Phase 4 only: doctor documents/certificates upload and management.
- No unrelated enterprise modules were changed.

Backend changes:
- Added POST `/api/doctors/:id/documents`
  - Requires `doctor.document.manage`
  - Uploads doctor registration/license/certificate files to Cloudinary
  - Saves files in `doctor.certificates`
  - Supports PDF, DOC, DOCX, JPG, PNG, WEBP
  - Max file size: 8MB
- Added DELETE `/api/doctors/:id/documents/:docIndex`
  - Requires `doctor.document.manage`
  - Deletes Cloudinary file when `file_public_id` exists
  - Removes document from doctor certificates array
- Added `doctor.document.manage` permission for admin and hospital_admin.
- Existing doctor profile image upload remains limited to 3MB through validation.

Frontend changes:
- Doctor profile now includes an upload form for:
  - Registration Certificate
  - Medical License
  - Degree Certificate
  - Specialization Certificate
  - Experience Letter
  - Government ID
  - Other
- Doctor profile now shows document list with:
  - View
  - Download
  - Delete
- Profile refreshes after upload/delete.
- Existing doctor profile image functionality remains unchanged.

Checks completed:
- Backend syntax check passed:
  - backend/src/routes/core.routes.js
  - backend/src/models/index.js
  - backend/src/config/permissions.js
  - frontend/src/api/doctorApi.js
- Frontend build passed with existing Vite bundle-size warning only.

Important deployment note:
- Render must have valid Cloudinary environment variables for image/document upload:
  - CLOUDINARY_CLOUD_NAME
  - CLOUDINARY_API_KEY
  - CLOUDINARY_API_SECRET

Excluded from ZIP:
- .env
- node_modules
- dist



---

## PHASE3_STEP11B3_DOCTOR_FINAL_POLISH_TESTING_V6_NOTES.md

# Phase 3 Step11B3 Doctor Final Polish & Testing V6

Base used: `HMS_SECURE_PHASE3_STEP11B3_DOCTOR_PROFILE_EDIT_INTEGRATION_V5.zip`

## Scope
Phase 6 was intentionally limited to final doctor-profile polish and verification. No unrelated enterprise modules were rewritten.

## Doctor profile polish completed
- Added safer Back to Doctors behavior from doctor profile:
  - cancels active doctor edit mode
  - resets pending document form
  - returns to doctors list cleanly
- Added doctor image upload UI busy state.
- Added doctor document upload UI busy state.
- Added doctor document delete busy state.
- Added document file-size display in doctor profile document list.
- Kept existing patient profile, permissions, module controls, hospital settings, billing, pharmacy, lab/radiology, appointments, and dashboard functionality untouched.

## Stability retained from earlier phases
- Doctor update duplicate logic still excludes the current doctor.
- Doctor profile uses fresh `GET /api/doctors/:id` data.
- Doctor image upload route remains `/api/doctors/:id/profile-image`.
- Doctor document upload route remains `/api/doctors/:id/documents`.
- Doctor document delete route remains `/api/doctors/:id/documents/:docIndex`.
- Doctor profile edit still refreshes profile data after save.

## Checks run
From extracted project root:

```bash
node --check backend/src/routes/core.routes.js
node --check backend/src/models/index.js
node --check backend/src/config/permissions.js
npm --prefix frontend ci
npm --prefix frontend run build
```

Result:
- Backend syntax checks passed.
- Frontend production build passed.

## Packaging rule followed
Excluded from ZIP:
- `.env`
- `node_modules`
- `dist`

Included:
- `package.json`
- `package-lock.json`
- `.env.example`

## Deployment reminder
On Render, verify Cloudinary environment variables before testing doctor image/document uploads:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Also run the existing doctor index migration once if the old global `doctor_id_1` index exists in MongoDB Atlas:

```bash
npm run fix-doctor-indexes
```



---

## PHASE3_STEP11B3_DOCTOR_IMAGE_UPLOAD_V3_NOTES.md

# Phase 3 Doctor Image Upload V3

Base used: HMS_SECURE_PHASE3_STEP11B3_DOCTOR_PROFILE_VIEW_V2.zip

## Scope
This phase only adds doctor profile image upload. Doctor document/certificate upload is intentionally left for Phase 4.

## Backend changes
- Added `POST /api/doctors/:id/profile-image` in `backend/src/routes/core.routes.js`.
- Uses `multer.memoryStorage()` with 3MB limit.
- Accepts field name: `profile_image`.
- Allows JPG, PNG, WEBP only.
- Uploads to Cloudinary folder: `hms/doctor-profile-images`.
- Replaces old image by deleting previous `profile_image_public_id` when present.
- Saves:
  - `profile_image_url`
  - `profile_image_public_id`
- Returns clear 500 message if Cloudinary env vars are missing/wrong on Render.

## Frontend changes
- Added `doctorApi.uploadProfileImage(id, formData)`.
- Doctor profile now shows a camera button over the avatar for users with `doctor.edit` permission.
- Upload refreshes fresh doctor profile data after success.
- Doctor list is reloaded after image upload.

## Required Render env vars
Backend Render service must have:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

These are now also listed in `backend/.env.example`.

## Checks performed
- Backend syntax check passed for `backend/src/routes/core.routes.js`.
- Backend syntax check passed for `backend/src/models/index.js`.
- Frontend `npm run build` passed after installing dependencies with `npm ci`.

## Not included in ZIP
- `.env`
- `node_modules`
- `dist`



---

## PHASE3_STEP11B3_DOCTOR_PROFILE_EDIT_INTEGRATION_V5_NOTES.md

# Phase 3 Step11B3 Doctor Profile Edit Integration V5

Base: `HMS_SECURE_PHASE3_STEP11B3_DOCTOR_DOCUMENT_UPLOAD_V4.zip`

## Scope
Phase 5 keeps the doctor section changes limited to profile/edit integration. It does not change unrelated HMS modules.

## Completed
- Added doctor profile edit flow from the doctor profile screen.
- Added `Edit Profile` action on doctor profile.
- Reused the safe doctor update API from V1 so same `doctor_id` updates do not trigger duplicate errors.
- Extended frontend doctor form state with enterprise profile fields:
  - `license_number`
  - `registration_number`
  - `status`
- After saving an open doctor profile, frontend fetches fresh doctor data again and updates `selectedDoctor`.
- Image and document data remain visible after profile updates.
- Added cancel edit action for doctor profile edit mode.

## Validation
- Backend syntax check passed:
  - `node --check backend/src/routes/core.routes.js`
  - `node --check backend/src/models/index.js`
- Frontend production build passed:
  - `npm run build`

## Packaging
Excluded from ZIP:
- `.env`
- `node_modules`
- `dist`

Included:
- `package.json`
- `package-lock.json`
- `.env.example`



---

## PHASE3_STEP11B3_DOCTOR_PROFILE_UI_AND_UPLOAD_FIX_V7_NOTES.md

# Phase 7 - Doctor Profile UI + Upload Fix

Base: HMS_SECURE_PHASE3_STEP11B3_DOCTOR_FINAL_POLISH_TESTING_V6.zip

## Fixed
- Doctor document upload no longer fails only because Cloudinary environment variables are missing on Render.
- Doctor profile image upload also supports the same safe fallback.
- If Cloudinary env vars are configured, uploads still use Cloudinary.
- If Cloudinary env vars are not configured, profile images and doctor documents are stored as MongoDB data URLs so the feature remains usable.
- Cloudinary cleanup is now safe and skipped when Cloudinary is not configured.
- Backend error messages are no longer hard-coded to Cloudinary environment variable failure only.

## UI Improved
- Doctor profile header polished.
- Duplicate profile title removed from card body.
- Doctor avatar/camera overlay improved.
- Doctor documents upload form is now hidden behind Add Document.
- Empty document state improved.
- Summary card Doctor ID duplicate replaced with Recent Records.

## Checks
- Frontend npm run build passed.
- Backend JS syntax checks passed.

## Deployment Note
Cloudinary is still recommended for production file storage. Add these in Render for production-grade storage:
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

Without Cloudinary, files are saved in MongoDB as fallback. This is acceptable for testing/small files but not ideal for long-term production storage.



---

## PHASE3_STEP11B3_DOCTOR_PROFILE_VIEW_V2_NOTES.md

# Phase 3 Step 11B3 - Doctor Profile View V2

Base ZIP: HMS_SECURE_PHASE3_STEP11B3_DOCTOR_UPDATE_FIX_V1.zip

## Scope
Phase 2 only: Doctor profile view. No image upload or document upload added in this ZIP.

## Backend changes
- Added `GET /api/doctors/:id` in `backend/src/routes/core.routes.js`.
- Route uses tenant filtering and requires `doctor.view` permission.
- Fetches fresh doctor details by numeric `id`.
- Adds `department_name` when department exists.
- Adds recent doctor appointments for the profile screen.

## Frontend changes
- Added `doctorApi.get(id)`.
- Added `selectedDoctor` state in `frontend/src/main.jsx`.
- Added `openDoctorProfile(row)` handler:
  - Opens profile immediately using table row fallback.
  - Fetches fresh doctor data from backend.
  - Replaces selected doctor with fresh API response.
- Added `doctorProfile` internal tab/view.
- Header title now shows `Doctor Profile` for this internal view.
- Passed `openDoctorProfile` to `Doctors.jsx`.
- Doctor table now shows View Profile in the existing three-dot action menu.
- Added doctor profile screen in `frontend/src/pages/Doctors.jsx` using existing patient profile design classes for consistent UI.

## Not included yet
- Doctor profile image upload.
- Doctor certificate/document upload.
- Doctor document delete/download management.

## Checks completed
- Backend syntax check completed.
- Frontend `npm run build` completed successfully.

## Known build warning
Vite shows existing bundle-size warning and react-hot-toast `use client` warning. Build still succeeds.



---

## PHASE3_STEP11B3_DOCTOR_UPDATE_FIX_V1_NOTES.md

# Phase 3 Step11B3 Doctor Update Fix V1

Base ZIP: `HMS_SECURE_PHASE3_STEP11B3_UI_FUNCTIONALITY_FIXES.zip`

## Scope
This ZIP intentionally fixes only the unstable doctor update/duplicate-ID foundation before adding doctor profile/image/document features.

## Changes
- Removed global `unique: true` from `Doctor.doctor_id` in the Mongoose schema.
- Added a compound unique doctor index definition for `{ hospital_id: 1, doctor_id: 1 }`.
- Updated `PUT /api/doctors/:id` so duplicate checks exclude the current doctor:
  - Allows editing a doctor without changing their existing `doctor_id`.
  - Returns `409` only when another doctor in the same tenant/hospital already has that `doctor_id`.
  - Returns `404` when the doctor does not exist.
  - Returns the updated doctor object after a successful update.
- Added safe script: `npm run fix-doctor-indexes`
  - Drops legacy global unique `doctor_id_1` style index if present.
  - Assigns `DEFAULT_HOSPITAL_ID` to legacy doctor records that have missing/null `hospital_id`.
  - Creates compound unique index: `{ hospital_id: 1, doctor_id: 1 }`.

## Important Render/MongoDB step
After deploying this backend, run once from Render shell/job if duplicate `doctor_id` errors continue:

```bash
npm run fix-doctor-indexes
```

Check Render logs carefully. If MongoDB reports duplicate values inside the same hospital, resolve those duplicate doctor records first, then rerun the script.

## Verified locally
- Frontend: `npm run build` passed.
- Backend syntax checks passed for:
  - `src/server.js`
  - `src/models/index.js`
  - `src/routes/core.routes.js`
  - `scripts/fix-doctor-indexes.js`

## Not included yet
Doctor profile, doctor image upload, and doctor document upload are intentionally not added in this ZIP. They should be added only after confirming doctor edit/update is stable.



---

## PHASE3_STEP11B3_PROFILE_KIKA_UI_V8_NOTES.md

# HMS Secure Phase 3 Step 11B3 - Unified Keka-style Profile UI V8

Base used:
- HMS_SECURE_PHASE3_STEP11B3_DOCTOR_PROFILE_UI_AND_UPLOAD_FIX_V7.zip

Scope:
- Frontend UI/UX polish only.
- No backend feature changes.
- No doctor/patient upload logic removed.

Completed:
- Added Keka-style cover/profile layout styling.
- Updated logged-in user/admin profile page to a Keka-inspired layout.
- Added profile completion indicator, intro/about blocks, quick links, support card, and cleaner account sections.
- Updated patient profile to use a Keka-style banner/cover area while preserving current patient details, appointments, bills, and documents.
- Updated doctor profile to use a Keka-style banner/cover area while preserving profile image upload, document upload, document delete, edit profile, appointments, and credentials.
- Preserved current functionality from V7.

Checks:
- Frontend build passed.
- Backend JavaScript syntax checks passed.

Packaging:
- .env excluded.
- node_modules excluded.
- frontend/dist excluded.
- package.json/package-lock.json retained.
- .env.example retained.



---

## PHASE3_STEP2_NOTES.md

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



---

## PHASE3_STEP5_NOTES.md

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



---

## PHASE3_STEP8_NOTES.md

# Phase 3 Step 8 — Feature Flags

This phase adds hospital-wise advanced feature flags without breaking existing modules.

## Added feature flags
- FHIR APIs
- HL7 Ready
- PACS/DICOM
- Biometric
- Insurance/TPA
- ERP/Tally
- WhatsApp/SMS
- ABDM/ABHA
- 2FA Security
- Audit Compliance

## Safety rules
- Existing default hospital remains active.
- Existing modules remain unchanged.
- Existing users and records are not reset.
- `.env`, `node_modules`, and `dist` are not included in the ZIP.
- `package-lock.json` files are included.

## Test checklist
1. Login as super_admin/admin.
2. Open Hospitals tab.
3. Edit a hospital.
4. Toggle multiple feature flags.
5. Save.
6. Re-open Edit and confirm flags are still selected.
7. Check normal modules still work.

## Phase 8C - Theme-aware profile and dashboard colors
- Updated doctor, patient, and admin/profile cover backgrounds to follow the selected theme color.
- Updated profile detail sections, avatar upload controls, document tiles, and empty states to use theme-aware colors.
- Updated dashboard welcome panel, stat cards, Hospital Overview chart, and Billing Status chart to use theme-aware palette instead of default black/grey chart colors.
- Verified frontend production build and backend syntax checks.
