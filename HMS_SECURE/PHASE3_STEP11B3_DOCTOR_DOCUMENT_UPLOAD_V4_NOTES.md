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
