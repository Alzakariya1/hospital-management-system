# V44: Tenant Migration + Backup Restore Deep Validation

V44 converts the V43/V43.1 tenant isolation foundation into an operational migration and backup validation workflow.

## What V44 adds

- Migration preview API for each hospital before any data copy.
- Copy-only tenant migration API. Source data is not deleted by default.
- Migration logs in `tenant_migrations`.
- Super Admin UI controls for:
  - preview migration,
  - safe copy migration,
  - backup now,
  - verify backup file,
  - restore dry-run.
- CLI scripts:
  - `npm run tenant:migration-preview -- <hospital_code_or_id>`
  - `npm run tenant:migrate -- <hospital_code_or_id>`
  - `npm run tenant:backup-validate -- [backup_id]`

## Safe migration rule

The default migration mode is copy-only:

1. Read shared DB records by `hospital_id`.
2. Ensure target tenant DB exists.
3. Upsert records into the tenant DB.
4. Keep source records untouched.
5. Log copied/skipped/conflict counts.

Do not use source deletion until a real production migration has been verified from backups.

## APIs

- `GET /api/tenant-databases/:hospitalId/migration-preview`
- `POST /api/tenant-databases/:hospitalId/migrate`
- `GET /api/tenant-databases/migrations`
- `POST /api/tenant-databases/:hospitalId/backup`
- `POST /api/tenant-databases/backups/:id/verify`
- `POST /api/tenant-databases/backups/:id/restore-dry-run`

## Validation checklist

- Create Hospital A and Hospital B.
- Provision tenant DBs.
- Preview migration for each hospital.
- Run safe copy migration for each hospital.
- Confirm duplicate patient IDs such as `001` are valid across different tenant DBs.
- Queue backup for each hospital.
- Verify backup file.
- Run restore dry-run.
- Confirm no source shared DB data was deleted.

## Production note

Render local filesystem may not be durable. For real SaaS production, configure durable backup storage such as S3, Wasabi, Backblaze B2, or MongoDB Atlas backup. V44 logs backup metadata and validates local backup files; cloud storage can be added as the next hardening step.
