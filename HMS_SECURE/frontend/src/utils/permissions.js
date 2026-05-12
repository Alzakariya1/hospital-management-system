export const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  admin: [
    'dashboard.view',
    'patient.view', 'patient.create', 'patient.edit', 'patient.delete', 'patient.document.manage',
    'doctor.view', 'doctor.create', 'doctor.edit', 'doctor.delete',
    'appointment.view', 'appointment.create', 'appointment.edit', 'appointment.delete', 'appointment.status.update',
    'bed.view', 'bed.create', 'bed.status.update',
    'lab.view', 'lab.create',
    'radiology.view', 'radiology.create',
    'pharmacy.view', 'pharmacy.create', 'pharmacy.stock.manage',
    'billing.view', 'billing.create', 'billing.edit',
    'admin.profile.manage', 'admin.users.manage',
    'audit.view', 'security.manage', 'hospital.manage'
  ],
  doctor: [
    'dashboard.view',
    'patient.view',
    'appointment.view', 'appointment.status.update',
    'lab.view', 'radiology.view',
    'admin.profile.manage'
  ],
  nurse: [
    'dashboard.view',
    'patient.view', 'patient.edit',
    'bed.view', 'bed.status.update',
    'appointment.view',
    'admin.profile.manage'
  ],
  receptionist: [
    'dashboard.view',
    'patient.view', 'patient.create', 'patient.edit', 'patient.document.manage',
    'appointment.view', 'appointment.create', 'appointment.edit', 'appointment.delete',
    'bed.view',
    'billing.view', 'billing.create',
    'admin.profile.manage'
  ],
  pharmacist: [
    'dashboard.view',
    'pharmacy.view', 'pharmacy.create', 'pharmacy.stock.manage',
    'admin.profile.manage'
  ],
  lab_technician: [
    'dashboard.view',
    'lab.view', 'lab.create',
    'radiology.view', 'radiology.create',
    'admin.profile.manage'
  ],
  accountant: [
    'dashboard.view',
    'billing.view', 'billing.create', 'billing.edit',
    'admin.profile.manage'
  ],
  patient: [
    'dashboard.view',
    'appointment.view',
    'billing.view',
    'admin.profile.manage'
  ]
};

export const TAB_PERMISSIONS = {
  dashboard: 'dashboard.view',
  patients: 'patient.view',
  doctors: 'doctor.view',
  appointments: 'appointment.view',
  beds: 'bed.view',
  labs: ['lab.view', 'radiology.view'],
  pharmacy: 'pharmacy.view',
  billing: 'billing.view',
  profile: 'admin.profile.manage',
  tenants: 'hospital.manage',
};

export function getUserPermissions(user = {}) {
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  const customPermissions = Array.isArray(user.permissions) ? user.permissions : [];
  return Array.from(new Set([...rolePermissions, ...customPermissions]));
}

export function hasPermission(user = {}, permission) {
  if (!permission) return false;
  const userPermissions = getUserPermissions(user);
  if (userPermissions.includes('*')) return true;
  if (Array.isArray(permission)) return permission.some((p) => userPermissions.includes(p));
  return userPermissions.includes(permission);
}

export function filterTabsByPermissions(user, tabs) {
  return tabs.filter(([id]) => hasPermission(user, TAB_PERMISSIONS[id]));
}
