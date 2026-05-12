import React from "react";
import { DEFAULT_ENABLED_MODULES, DEFAULT_FEATURE_FLAGS, FEATURE_FLAGS, MODULES, normalizeFeatureFlags } from "../utils";

const TENANT_TYPES = ["hospital", "clinic", "diagnostic_center", "nursing_home"];
const PLANS = ["clinic", "hospital", "enterprise"];
const STATUSES = ["active", "inactive"];

function getModules(formModules) {
  return Array.isArray(formModules) && formModules.length ? formModules : DEFAULT_ENABLED_MODULES;
}

function getFeatureFlags(featureFlags) {
  return normalizeFeatureFlags(featureFlags);
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
  currentHospital,
  permissions,
}) {
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
      initial_admin: {
        full_name: "",
        email: "",
        password: "",
        phone: "",
      },
    });
    setEditingTenantId(null);
  }

  const selectedModules = getModules(tenantForm.enabled_modules);
  const selectedFeatures = getFeatureFlags(tenantForm.feature_flags);

  return (
    <section>
      <div className="card form">
        <div className="sectionTitleRow">
          <div>
            <h2>{editingTenantId ? "Edit Hospital" : "Add Hospital"}</h2>
            <p className="muted">
              Manage tenant records, subscription plans, status, and enabled modules without code changes.
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
            <select
              value={tenantForm.type || "hospital"}
              onChange={(e) => updateField("type", e.target.value)}
            >
              {TENANT_TYPES.map((type) => (
                <option key={type} value={type}>{type.replaceAll("_", " ")}</option>
              ))}
            </select>
            <select
              value={tenantForm.plan || "enterprise"}
              onChange={(e) => updateField("plan", e.target.value)}
            >
              {PLANS.map((plan) => (
                <option key={plan} value={plan}>{plan}</option>
              ))}
            </select>
            <select
              value={tenantForm.status || "active"}
              onChange={(e) => updateField("status", e.target.value)}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {!editingTenantId && (
            <div className="moduleConfigBox">
              <div className="sectionTitleRow compact">
                <div>
                  <h3>Initial Hospital Admin Login</h3>
                  <p className="muted">
                    Create the first admin user for this hospital. This user will login with the email and password below.
                  </p>
                </div>
              </div>
              <div className="formGrid">
                <input
                  placeholder="Admin full name"
                  value={tenantForm.initial_admin?.full_name || ""}
                  onChange={(e) => updateInitialAdmin("full_name", e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Admin email / login email"
                  value={tenantForm.initial_admin?.email || ""}
                  onChange={(e) => updateInitialAdmin("email", e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Admin password"
                  value={tenantForm.initial_admin?.password || ""}
                  onChange={(e) => updateInitialAdmin("password", e.target.value)}
                />
                <input
                  placeholder="Admin phone"
                  value={tenantForm.initial_admin?.phone || ""}
                  onChange={(e) => updateInitialAdmin("phone", e.target.value)}
                />
              </div>
              <p className="muted">
                Tip: password must match your backend PASSWORD_MIN_LENGTH setting. Default minimum is 8 characters.
              </p>
            </div>
          )}

          <div className="moduleConfigBox">
            <div className="sectionTitleRow compact">
              <div>
                <h3>Enabled Modules</h3>
                <p className="muted">These modules control the hospital sidebar and module access.</p>
              </div>
              <button type="button" className="ghostBtn" onClick={enableAllModules}>
                Enable All
              </button>
            </div>

            <div className="moduleGrid">
              {MODULES.map((module) => (
                <label className="moduleCheck" key={module.id}>
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(module.id)}
                    onChange={() => toggleModule(module.id)}
                  />
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
                <button type="button" className="ghostBtn" onClick={enableAllFeatures}>
                  Enable All
                </button>
                <button type="button" className="ghostBtn" onClick={resetFeatureFlags}>
                  Reset Defaults
                </button>
              </div>
            </div>

            <div className="moduleGrid featureGrid">
              {FEATURE_FLAGS.map((feature) => (
                <label className="moduleCheck featureCheck" key={feature.id} title={feature.description}>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedFeatures[feature.id])}
                    onChange={() => toggleFeature(feature.id)}
                  />
                  <span>
                    <b>{feature.label}</b>
                    <small>{feature.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit">{editingTenantId ? "Update Hospital" : "Create Hospital + Admin"}</button>
        </form>
      </div>

      <div className="card">
        <h2>Hospital List</h2>
        <p className="muted">New hospitals can login using the initial admin email/password created above. Existing hospital admins can add more users from their Profile/User Management area.</p>
        {!tenants?.length ? (
          <p className="muted">No hospitals found.</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
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
                {tenants.map((tenant) => {
                  const activeModules = getModules(tenant.enabled_modules);
                  return (
                    <tr key={tenant.id}>
                      <td>{tenant.id}</td>
                      <td>{tenant.hospital_code || "—"}</td>
                      <td>{tenant.name}</td>
                      <td>{(tenant.type || "hospital").replaceAll("_", " ")}</td>
                      <td>{tenant.plan || "enterprise"}</td>
                      <td>
                        <span className={tenant.status === "active" ? "statusPill success" : "statusPill mutedPill"}>
                          {tenant.status || "active"}
                        </span>
                      </td>
                      <td>
                        <span title={activeModules.join(", ")}>
                          {activeModules.length} enabled
                        </span>
                      </td>
                      <td>
                        <span title={Object.entries(getFeatureFlags(tenant.feature_flags)).filter(([, enabled]) => enabled).map(([key]) => key).join(", ") || "No advanced features enabled"}>
                          {Object.values(getFeatureFlags(tenant.feature_flags)).filter(Boolean).length} enabled
                        </span>
                      </td>
                      <td>
                        <div className="inlineActions">
                          <button type="button" onClick={() => editTenant(tenant)}>Edit</button>
                          <button type="button" onClick={() => toggleTenantStatus(tenant)}>
                            {tenant.status === "active" ? "Disable" : "Enable"}
                          </button>
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
    </section>
  );
}
