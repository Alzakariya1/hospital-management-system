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
