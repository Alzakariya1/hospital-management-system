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
