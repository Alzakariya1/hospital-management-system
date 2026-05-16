const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  admin: [
    'dashboard.view',
    'patient.view', 'patient.create', 'patient.edit', 'patient.delete', 'patient.document.manage',
    'doctor.view', 'doctor.create', 'doctor.edit', 'doctor.delete', 'doctor.document.manage',
    'appointment.view', 'appointment.create', 'appointment.edit', 'appointment.delete', 'appointment.status.update',
    'bed.view', 'bed.create', 'bed.status.update',
    'opd.view', 'opd.create', 'ipd.view', 'ipd.create',
    'lab.view', 'lab.create',
    'radiology.view', 'radiology.create',
    'pharmacy.view', 'pharmacy.create', 'pharmacy.stock.manage',
    'billing.view', 'billing.create', 'billing.edit',
    'admin.profile.manage', 'admin.users.manage',
    'notification.view', 'notification.manage',
    'audit.view', 'security.manage', 'configuration.manage', 'hospital.manage'
  ],
  hospital_admin: [
    'dashboard.view',
    'patient.view', 'patient.create', 'patient.edit', 'patient.delete', 'patient.document.manage',
    'doctor.view', 'doctor.create', 'doctor.edit', 'doctor.delete', 'doctor.document.manage',
    'appointment.view', 'appointment.create', 'appointment.edit', 'appointment.delete', 'appointment.status.update',
    'bed.view', 'bed.create', 'bed.status.update',
    'opd.view', 'opd.create', 'ipd.view', 'ipd.create',
    'lab.view', 'lab.create',
    'radiology.view', 'radiology.create',
    'pharmacy.view', 'pharmacy.create', 'pharmacy.stock.manage',
    'billing.view', 'billing.create', 'billing.edit',
    'admin.profile.manage', 'admin.users.manage',
    'notification.view', 'notification.manage',
    'audit.view', 'security.manage', 'configuration.manage'
  ],
  doctor: [
    'dashboard.view',
    'patient.view',
    'appointment.view', 'appointment.status.update',
    'opd.view', 'opd.create', 'ipd.view',
    'lab.view', 'radiology.view',
    'admin.profile.manage',
    'notification.view'
  ],
  nurse: [
    'dashboard.view',
    'patient.view', 'patient.edit',
    'bed.view', 'bed.status.update',
    'appointment.view',
    'opd.view', 'ipd.view', 'ipd.create',
    'admin.profile.manage',
    'notification.view'
  ],
  receptionist: [
    'dashboard.view',
    'patient.view', 'patient.create', 'patient.edit', 'patient.document.manage',
    'appointment.view', 'appointment.create', 'appointment.edit', 'appointment.delete',
    'bed.view',
    'opd.view', 'opd.create',
    'billing.view', 'billing.create',
    'admin.profile.manage',
    'notification.view'
  ],
  pharmacist: [
    'dashboard.view',
    'pharmacy.view', 'pharmacy.create', 'pharmacy.stock.manage',
    'admin.profile.manage',
    'notification.view'
  ],
  lab_technician: [
    'dashboard.view',
    'lab.view', 'lab.create',
    'radiology.view', 'radiology.create',
    'admin.profile.manage',
    'notification.view'
  ],
  accountant: [
    'dashboard.view',
    'billing.view', 'billing.create', 'billing.edit',
    'admin.profile.manage',
    'notification.view'
  ],
  patient: [
    'dashboard.view',
    'appointment.view',
    'billing.view',
    'admin.profile.manage',
    'notification.view'
  ]
};

function normalizePermissions(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean).map(String);
  return [];
}

function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

function getUserPermissions(user = {}) {
  const rolePermissions = getRolePermissions(user.role);
  const customPermissions = normalizePermissions(user.permissions);
  return Array.from(new Set([...rolePermissions, ...customPermissions]));
}

function hasPermission(user = {}, permission) {
  if (!permission) return false;
  const permissions = getUserPermissions(user);
  return permissions.includes('*') || permissions.includes(permission);
}

module.exports = {
  ROLE_PERMISSIONS,
  getRolePermissions,
  getUserPermissions,
  hasPermission,
};
