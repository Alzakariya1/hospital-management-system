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
