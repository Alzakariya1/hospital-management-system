import React, { useMemo, useState } from "react";
import { tenantApi } from "../api";
import { DEFAULT_ENABLED_MODULES, DEFAULT_FEATURE_FLAGS, FEATURE_FLAGS, MODULES, normalizeFeatureFlags } from "../utils";

const TENANT_TYPES = ["hospital", "clinic", "diagnostic_center", "nursing_home"];
const PLANS = ["clinic", "hospital", "enterprise"];
const STATUSES = ["active", "inactive", "archived"];
const DEFAULT_SETTINGS = {
  address: "",
  city: "",
  state: "",
  country: "India",
  phone: "",
  email: "",
  website: "",
  gst_number: "",
  registration_number: "",
  uhid_prefix: "",
  bill_prefix: "",
  prescription_prefix: "",
  lab_report_prefix: "",
};
const DEFAULT_BRANDING = {
  logo_url: "",
  logo_public_id: "",
  primary_color: "#0f172a",
  secondary_color: "#2563eb",
};

function getModules(formModules) {
  return Array.isArray(formModules) && formModules.length ? formModules : DEFAULT_ENABLED_MODULES;
}

function getFeatureFlags(featureFlags) {
  return normalizeFeatureFlags(featureFlags);
}

function safeSettings(settings) {
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

function safeBranding(branding) {
  return { ...DEFAULT_BRANDING, ...(branding || {}) };
}

function countEnabledFeatures(flags) {
  return Object.values(getFeatureFlags(flags)).filter(Boolean).length;
}

export default function TenantControl({
  tenants,
  tenantForm,
  setTenantForm,
  editingTenantId,
  setEditingTenantId,
  saveTenant,
  editTenant,
  toggleTenantStatus,
  uploadTenantLogo,
  archiveTenant,
  currentHospital,
  user,
  permissions,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [detailsTenant, setDetailsTenant] = useState(null);
  const [logoTenant, setLogoTenant] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [adminTenant, setAdminTenant] = useState(null);
  const [tenantAdmins, setTenantAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const isSuperAdmin = user?.role === "super_admin";

  if (!permissions?.hospitalManage) {
    return (
      <section className="card">
        <h2>Hospitals</h2>
        <p className="muted">You do not have permission to manage hospitals.</p>
      </section>
    );
  }

  function updateField(key, value) {
    setTenantForm({ ...tenantForm, [key]: value });
  }

  function updateSettings(key, value) {
    setTenantForm({
      ...tenantForm,
      settings: {
        ...safeSettings(tenantForm.settings),
        [key]: value,
      },
    });
  }

  function updateBranding(key, value) {
    setTenantForm({
      ...tenantForm,
      branding: {
        ...safeBranding(tenantForm.branding),
        [key]: value,
      },
    });
  }

  function updateInitialAdmin(key, value) {
    setTenantForm({
      ...tenantForm,
      initial_admin: {
        ...(tenantForm.initial_admin || {}),
        [key]: value,
      },
    });
  }

  function toggleModule(moduleId) {
    const currentModules = getModules(tenantForm.enabled_modules);
    const nextModules = currentModules.includes(moduleId)
      ? currentModules.filter((id) => id !== moduleId)
      : [...currentModules, moduleId];

    setTenantForm({
      ...tenantForm,
      enabled_modules: nextModules,
    });
  }

  function enableAllModules() {
    setTenantForm({ ...tenantForm, enabled_modules: DEFAULT_ENABLED_MODULES });
  }

  function toggleFeature(featureId) {
    const currentFlags = getFeatureFlags(tenantForm.feature_flags);
    setTenantForm({
      ...tenantForm,
      feature_flags: {
        ...currentFlags,
        [featureId]: !currentFlags[featureId],
      },
    });
  }

  function enableAllFeatures() {
    const allFeatures = FEATURE_FLAGS.reduce((acc, feature) => {
      acc[feature.id] = true;
      return acc;
    }, {});
    setTenantForm({ ...tenantForm, feature_flags: allFeatures });
  }

  function resetFeatureFlags() {
    setTenantForm({ ...tenantForm, feature_flags: DEFAULT_FEATURE_FLAGS });
  }

  function resetForm() {
    setTenantForm({
      hospital_code: "",
      name: "",
      type: "hospital",
      plan: "enterprise",
      status: "active",
      enabled_modules: DEFAULT_ENABLED_MODULES,
      feature_flags: DEFAULT_FEATURE_FLAGS,
      branding: DEFAULT_BRANDING,
      settings: DEFAULT_SETTINGS,
      initial_admin: {
        full_name: "",
        email: "",
        password: "",
        phone: "",
      },
    });
    setEditingTenantId(null);
  }

  function openLogoModal(tenant) {
    setLogoTenant(tenant);
    setLogoFile(null);
    setLogoPreview(tenant?.branding?.logo_url || "");
    setOpenMenuId(null);
  }

  function onLogoFileChange(file) {
    setLogoFile(file || null);
    if (!file) {
      setLogoPreview(logoTenant?.branding?.logo_url || "");
      return;
    }
    setLogoPreview(URL.createObjectURL(file));
  }

  async function submitLogo(e) {
    e.preventDefault();
    if (!logoTenant || !logoFile) return;
    await uploadTenantLogo(logoTenant.id, logoFile);
    setLogoTenant(null);
    setLogoFile(null);
    setLogoPreview("");
  }

  async function openAdminUsers(tenant) {
    setAdminTenant(tenant);
    setAdminsLoading(true);
    setTenantAdmins([]);
    try {
      const { data } = await tenantApi.admins(tenant.id);
      setTenantAdmins(Array.isArray(data) ? data : []);
    } catch (_) {
      setTenantAdmins([]);
    } finally {
      setAdminsLoading(false);
    }
  }

  function handleAction(action, tenant) {
    setOpenMenuId(null);
    if (action === "view") setDetailsTenant(tenant);
    if (action === "edit" || action === "modules" || action === "features") editTenant(tenant);
    if (action === "admins") openAdminUsers(tenant);
    if (action === "logo") openLogoModal(tenant);
    if (action === "toggle") toggleTenantStatus(tenant);
    if (action === "archive") archiveTenant(tenant);
  }

  const selectedModules = getModules(tenantForm.enabled_modules);
  const selectedFeatures = getFeatureFlags(tenantForm.feature_flags);
  const formSettings = safeSettings(tenantForm.settings);
  const formBranding = safeBranding(tenantForm.branding);

  const sortedTenants = useMemo(() => [...(tenants || [])].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)), [tenants]);

  return (
    <section>
      <div className="card form">
        <div className="sectionTitleRow">
          <div>
            <h2>{editingTenantId ? "Edit Hospital" : "Add Hospital"}</h2>
            <p className="muted">
              Manage tenant records, subscription plans, branding, modules, and enterprise feature flags.
            </p>
          </div>
          {editingTenantId && (
            <button type="button" className="ghostBtn" onClick={resetForm}>
              New Hospital
            </button>
          )}
        </div>

        {currentHospital?.name && (
          <p className="muted">
            Current active hospital: <b>{currentHospital.name}</b>
          </p>
        )}

        <form onSubmit={saveTenant}>
          <div className="formGrid">
            <input
              placeholder="Hospital code"
              value={tenantForm.hospital_code || ""}
              onChange={(e) => updateField("hospital_code", e.target.value.toUpperCase())}
            />
            <input
              required
              placeholder="Hospital name"
              value={tenantForm.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
            />
            <select value={tenantForm.type || "hospital"} onChange={(e) => updateField("type", e.target.value)}>
              {TENANT_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
            </select>
            <select value={tenantForm.plan || "enterprise"} onChange={(e) => updateField("plan", e.target.value)}>
              {PLANS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
            </select>
            <select value={tenantForm.status || "active"} onChange={(e) => updateField("status", e.target.value)}>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>

          <div className="moduleConfigBox">
            <div className="sectionTitleRow compact">
              <div>
                <h3>Hospital Details</h3>
                <p className="muted">These details will later power invoices, prescriptions, reports, and hospital profile views.</p>
              </div>
            </div>
            <div className="formGrid">
              <input placeholder="Address" value={formSettings.address} onChange={(e) => updateSettings("address", e.target.value)} />
              <input placeholder="City" value={formSettings.city} onChange={(e) => updateSettings("city", e.target.value)} />
              <input placeholder="State" value={formSettings.state} onChange={(e) => updateSettings("state", e.target.value)} />
              <input placeholder="Country" value={formSettings.country} onChange={(e) => updateSettings("country", e.target.value)} />
              <input placeholder="Phone" value={formSettings.phone} onChange={(e) => updateSettings("phone", e.target.value)} />
              <input type="email" placeholder="Hospital email" value={formSettings.email} onChange={(e) => updateSettings("email", e.target.value)} />
              <input placeholder="Website" value={formSettings.website} onChange={(e) => updateSettings("website", e.target.value)} />
              <input placeholder="GST number" value={formSettings.gst_number} onChange={(e) => updateSettings("gst_number", e.target.value)} />
              <input placeholder="Registration number" value={formSettings.registration_number} onChange={(e) => updateSettings("registration_number", e.target.value)} />
            </div>
          </div>

          <div className="moduleConfigBox">
            <div className="sectionTitleRow compact">
              <div>
                <h3>Branding & Prefixes</h3>
                <p className="muted">Logo upload is available from the three-dot menu. Colors and prefixes are saved here.</p>
              </div>
            </div>
            <div className="formGrid">
              <label className="fieldLabel">Primary color<input type="color" value={formBranding.primary_color} onChange={(e) => updateBranding("primary_color", e.target.value)} /></label>
              <label className="fieldLabel">Secondary color<input type="color" value={formBranding.secondary_color} onChange={(e) => updateBranding("secondary_color", e.target.value)} /></label>
              <input placeholder="UHID prefix e.g. CCH-PAT" value={formSettings.uhid_prefix} onChange={(e) => updateSettings("uhid_prefix", e.target.value.toUpperCase())} />
              <input placeholder="Bill prefix e.g. CCH-BILL" value={formSettings.bill_prefix} onChange={(e) => updateSettings("bill_prefix", e.target.value.toUpperCase())} />
              <input placeholder="Prescription prefix" value={formSettings.prescription_prefix} onChange={(e) => updateSettings("prescription_prefix", e.target.value.toUpperCase())} />
              <input placeholder="Lab report prefix" value={formSettings.lab_report_prefix} onChange={(e) => updateSettings("lab_report_prefix", e.target.value.toUpperCase())} />
            </div>
          </div>

          {!editingTenantId && (
            <div className="moduleConfigBox">
              <div className="sectionTitleRow compact">
                <div>
                  <h3>Initial Hospital Admin Login</h3>
                  <p className="muted">Create the first admin user for this hospital.</p>
                </div>
              </div>
              <div className="formGrid">
                <input placeholder="Admin full name" value={tenantForm.initial_admin?.full_name || ""} onChange={(e) => updateInitialAdmin("full_name", e.target.value)} />
                <input type="email" placeholder="Admin email / login email" value={tenantForm.initial_admin?.email || ""} onChange={(e) => updateInitialAdmin("email", e.target.value)} />
                <input type="password" placeholder="Admin password" value={tenantForm.initial_admin?.password || ""} onChange={(e) => updateInitialAdmin("password", e.target.value)} />
                <input placeholder="Admin phone" value={tenantForm.initial_admin?.phone || ""} onChange={(e) => updateInitialAdmin("phone", e.target.value)} />
              </div>
              <p className="muted">Tip: password must match your backend PASSWORD_MIN_LENGTH setting. Default minimum is 8 characters.</p>
            </div>
          )}

          <div className="moduleConfigBox">
            <div className="sectionTitleRow compact">
              <div>
                <h3>Enabled Modules</h3>
                <p className="muted">These modules control the hospital sidebar and module access.</p>
              </div>
              <button type="button" className="ghostBtn" onClick={enableAllModules}>Enable All</button>
            </div>
            <div className="moduleGrid">
              {MODULES.map((module) => (
                <label className="moduleCheck" key={module.id}>
                  <input type="checkbox" checked={selectedModules.includes(module.id)} onChange={() => toggleModule(module.id)} />
                  <span>{module.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="moduleConfigBox">
            <div className="sectionTitleRow compact">
              <div>
                <h3>Advanced Feature Flags</h3>
                <p className="muted">Turn enterprise capabilities on or off per hospital without changing code.</p>
              </div>
              <div className="inlineActions">
                <button type="button" className="ghostBtn" onClick={enableAllFeatures}>Enable All</button>
                <button type="button" className="ghostBtn" onClick={resetFeatureFlags}>Reset Defaults</button>
              </div>
            </div>
            <div className="moduleGrid featureGrid">
              {FEATURE_FLAGS.map((feature) => (
                <label className="moduleCheck featureCheck" key={feature.id} title={feature.description}>
                  <input type="checkbox" checked={Boolean(selectedFeatures[feature.id])} onChange={() => toggleFeature(feature.id)} />
                  <span><b>{feature.label}</b><small>{feature.description}</small></span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit">{editingTenantId ? "Update Hospital" : "Create Hospital + Admin"}</button>
        </form>
      </div>

      <div className="card">
        <h2>Hospital List</h2>
        <p className="muted">Use the three-dot menu for details, edit, logo upload, status control, and safe archive.</p>
        {!sortedTenants.length ? (
          <p className="muted">No hospitals found.</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Logo</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Modules</th>
                  <th>Features</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTenants.map((tenant) => {
                  const activeModules = getModules(tenant.enabled_modules);
                  const branding = safeBranding(tenant.branding);
                  return (
                    <tr key={tenant.id}>
                      <td>{tenant.id}</td>
                      <td>{branding.logo_url ? <img className="hospitalLogoThumb" src={branding.logo_url} alt={`${tenant.name} logo`} /> : <span className="logoPlaceholder">—</span>}</td>
                      <td>{tenant.hospital_code || "—"}</td>
                      <td>{tenant.name}</td>
                      <td>{(tenant.type || "hospital").replaceAll("_", " ")}</td>
                      <td>{tenant.plan || "enterprise"}</td>
                      <td><span className={tenant.status === "active" ? "statusPill success" : tenant.status === "archived" ? "statusPill dangerPill" : "statusPill mutedPill"}>{tenant.status || "active"}</span></td>
                      <td><span title={activeModules.join(", ")}>{activeModules.length} enabled</span></td>
                      <td><span title={Object.entries(getFeatureFlags(tenant.feature_flags)).filter(([, enabled]) => enabled).map(([key]) => key).join(", ") || "No advanced features enabled"}>{countEnabledFeatures(tenant.feature_flags)} enabled</span></td>
                      <td>
                        <div className="actionMenuWrap">
                          <button type="button" className="kebabBtn" onClick={() => setOpenMenuId(openMenuId === tenant.id ? null : tenant.id)}>⋮</button>
                          {openMenuId === tenant.id && (
                            <div className="actionMenu">
                              <button type="button" onClick={() => handleAction("view", tenant)}>View Details</button>
                              <button type="button" onClick={() => handleAction("edit", tenant)}>Edit Hospital</button>
                              <button type="button" onClick={() => handleAction("logo", tenant)}>Upload Logo</button>
                              <button type="button" onClick={() => handleAction("modules", tenant)}>Manage Modules</button>
                              <button type="button" onClick={() => handleAction("features", tenant)}>Manage Features</button>
                              <button type="button" onClick={() => handleAction("admins", tenant)}>Manage Admin Users</button>
                              <button type="button" onClick={() => handleAction("toggle", tenant)}>{tenant.status === "active" ? "Disable" : "Enable"}</button>
                              {isSuperAdmin && Number(tenant.id) !== 1 && tenant.status !== "archived" && (
                                <button type="button" className="dangerAction" onClick={() => handleAction("archive", tenant)}>Archive Hospital</button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailsTenant && (
        <div className="modalOverlay" onClick={() => setDetailsTenant(null)}>
          <div className="modalCard wideModal" onClick={(e) => e.stopPropagation()}>
            <div className="sectionTitleRow">
              <div>
                <h2>{detailsTenant.name}</h2>
                <p className="muted">Hospital details, settings, modules, and feature flags.</p>
              </div>
              <button type="button" className="ghostBtn" onClick={() => setDetailsTenant(null)}>Close</button>
            </div>
            <HospitalDetails tenant={detailsTenant} />
          </div>
        </div>
      )}


      {adminTenant && (
        <div className="modalOverlay" onClick={() => setAdminTenant(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="sectionTitleRow">
              <div>
                <h2>Hospital Admin Users</h2>
                <p className="muted">{adminTenant.name}</p>
              </div>
              <button type="button" className="ghostBtn" onClick={() => setAdminTenant(null)}>Close</button>
            </div>
            {adminsLoading ? (
              <p className="muted">Loading admins...</p>
            ) : tenantAdmins.length ? (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {tenantAdmins.map((admin) => (
                      <tr key={admin.id}>
                        <td>{admin.full_name || "—"}</td>
                        <td>{admin.email}</td>
                        <td>{admin.role}</td>
                        <td><span className={admin.status === "active" ? "statusPill success" : "statusPill mutedPill"}>{admin.status || "active"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No hospital admin users found.</p>
            )}
            <p className="muted">To add more users for this hospital, login as its hospital admin and use Profile/User Management.</p>
          </div>
        </div>
      )}

      {logoTenant && (
        <div className="modalOverlay" onClick={() => setLogoTenant(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="sectionTitleRow">
              <div>
                <h2>Upload Hospital Logo</h2>
                <p className="muted">{logoTenant.name}</p>
              </div>
              <button type="button" className="ghostBtn" onClick={() => setLogoTenant(null)}>Close</button>
            </div>
            <form onSubmit={submitLogo} className="logoUploadForm">
              {logoPreview ? <img className="logoPreview" src={logoPreview} alt="Hospital logo preview" /> : <div className="logoPreview emptyLogoPreview">No logo selected</div>}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => onLogoFileChange(e.target.files?.[0])} />
              <div className="inlineActions">
                <button type="submit" disabled={!logoFile}>Upload Logo</button>
                <button type="button" className="ghostBtn" onClick={() => setLogoTenant(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function HospitalDetails({ tenant }) {
  const settings = safeSettings(tenant.settings);
  const branding = safeBranding(tenant.branding);
  const modules = getModules(tenant.enabled_modules);
  const features = getFeatureFlags(tenant.feature_flags);
  return (
    <div className="detailsGrid">
      <div className="detailBox">
        <h3>Identity</h3>
        {branding.logo_url && <img className="logoPreview smallLogo" src={branding.logo_url} alt={`${tenant.name} logo`} />}
        <p><b>Code:</b> {tenant.hospital_code || "—"}</p>
        <p><b>Type:</b> {(tenant.type || "hospital").replaceAll("_", " ")}</p>
        <p><b>Plan:</b> {tenant.plan || "enterprise"}</p>
        <p><b>Status:</b> {tenant.status || "active"}</p>
      </div>
      <div className="detailBox">
        <h3>Contact</h3>
        <p><b>Address:</b> {settings.address || "—"}</p>
        <p><b>City/State:</b> {[settings.city, settings.state].filter(Boolean).join(", ") || "—"}</p>
        <p><b>Country:</b> {settings.country || "—"}</p>
        <p><b>Phone:</b> {settings.phone || "—"}</p>
        <p><b>Email:</b> {settings.email || "—"}</p>
        <p><b>Website:</b> {settings.website || "—"}</p>
      </div>
      <div className="detailBox">
        <h3>Legal & Prefixes</h3>
        <p><b>GST:</b> {settings.gst_number || "—"}</p>
        <p><b>Registration:</b> {settings.registration_number || "—"}</p>
        <p><b>UHID Prefix:</b> {settings.uhid_prefix || "—"}</p>
        <p><b>Bill Prefix:</b> {settings.bill_prefix || "—"}</p>
        <p><b>Prescription Prefix:</b> {settings.prescription_prefix || "—"}</p>
        <p><b>Lab Prefix:</b> {settings.lab_report_prefix || "—"}</p>
      </div>
      <div className="detailBox">
        <h3>Modules</h3>
        <p>{modules.join(", ")}</p>
        <h3>Features</h3>
        <p>{Object.entries(features).filter(([, enabled]) => enabled).map(([key]) => key).join(", ") || "No advanced features enabled"}</p>
      </div>
    </div>
  );
}
