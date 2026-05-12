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

export const MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'patients', label: 'Patients' },
  { id: 'doctors', label: 'Doctors' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'beds', label: 'Beds' },
  { id: 'lab', label: 'Laboratory' },
  { id: 'radiology', label: 'Radiology' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'billing', label: 'Billing' },
  { id: 'profile', label: 'Profile' },
  { id: 'tenants', label: 'Hospitals' },
];

export const DEFAULT_ENABLED_MODULES = MODULES.map((module) => module.id);

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

export const TAB_MODULES = {
  dashboard: ['dashboard'],
  patients: ['patients'],
  doctors: ['doctors'],
  appointments: ['appointments'],
  beds: ['beds'],
  labs: ['lab', 'radiology'],
  pharmacy: ['pharmacy'],
  billing: ['billing'],
  profile: ['profile'],
  tenants: ['tenants'],
};

// Platform-level tabs are controlled by permission only.
// They must not be hidden by hospital module ON/OFF settings.
export const PLATFORM_TABS = ['tenants'];

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

export function normalizeEnabledModules(enabledModules) {
  if (!Array.isArray(enabledModules) || enabledModules.length === 0) {
    return DEFAULT_ENABLED_MODULES;
  }
  return Array.from(new Set(enabledModules));
}

export function hasModuleAccess(enabledModules, moduleIds) {
  const normalizedModules = normalizeEnabledModules(enabledModules);
  const requiredModules = Array.isArray(moduleIds) ? moduleIds : [moduleIds];
  if (!requiredModules.length) return true;
  return requiredModules.some((moduleId) => normalizedModules.includes(moduleId));
}

export function filterTabsByPermissions(user, tabs, enabledModules) {
  return tabs.filter(([id]) => {
    const allowedByPermission = hasPermission(user, TAB_PERMISSIONS[id]);

    if (PLATFORM_TABS.includes(id)) {
      return allowedByPermission;
    }

    const allowedByModule = hasModuleAccess(enabledModules, TAB_MODULES[id]);
    return allowedByPermission && allowedByModule;
  });
}
