# V44.3 Auth Login Recovery Fix

This phase fixes the login/401 problem seen after V44.2 deployment.

## What changed

- Backend admin seed script now always:
  - ensures Default Hospital exists by `hospital_code: DEFAULT`
  - provisions Default Hospital tenant DB if missing
  - sets `hospital_id` on the super admin user
  - resets `admin@hospital.com` password to `admin12345` unless overridden by env
  - prints the admin/hospital/tenant result clearly
- Added `GET /api/auth/login-status?email=admin@hospital.com` for safe login diagnostics.
- Added `npm run auth:smoke` backend script to verify:
  - admin user exists
  - password matches env/default password
  - user is active
  - hospital exists
  - JWT signing/verifying works
- Frontend API client now:
  - always normalizes `VITE_API_URL` so both Render root URL and `/api` URL work
  - sends `Authorization: Bearer <token>` on every authenticated request
  - clears stale token/user and returns to login when protected routes return 401
- Login error text now tells you to run seed when admin credentials are out of sync.

## Required Render action after deployment

In Render backend Shell, run:

```bash
npm run seed
npm run auth:smoke
```

Expected output includes:

```bash
Secure admin ready: admin@hospital.com / admin12345
AUTH SMOKE OK
```

Then clear browser localStorage or logout/login again.

## Important env values

Render backend must have:

```env
MONGODB_URI=mongodb+srv://.../hms_master?retryWrites=true&w=majority
JWT_SECRET=your-long-stable-secret
FRONTEND_URL=https://your-vercel-domain.vercel.app
SEED_ADMIN_EMAIL=admin@hospital.com
SEED_ADMIN_PASSWORD=admin12345
```

Do not change `JWT_SECRET` randomly after users log in; old tokens will become invalid and return 401.
