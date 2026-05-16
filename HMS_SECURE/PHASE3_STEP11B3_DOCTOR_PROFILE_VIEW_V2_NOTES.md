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
