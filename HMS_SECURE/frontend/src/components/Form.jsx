import React from "react";

export default function Form({ title, data, setData, submit, customFields = [] }) {
  function inputType(k) {
    if (k.includes("date")) return "date";
    if (k.includes("time")) return "time";
    if (k.includes("email")) return "email";
    if (
      k.includes("age") ||
      k.includes("fee") ||
      k.includes("price") ||
      k.includes("stock") ||
      k.includes("amount")
    ) {
      return "number";
    }
    return "text";
  }

  function customValue(field) {
    return data.custom_fields?.[field.field_key] ?? field.default_value ?? "";
  }

  function setCustomValue(field, value) {
    setData({
      ...data,
      custom_fields: {
        ...(data.custom_fields || {}),
        [field.field_key]: value,
      },
    });
  }

  function renderCustomField(field) {
    const value = customValue(field);
    if (field.field_type === "select") {
      return (
        <select key={field.id || field.field_key} value={value} required={field.required} onChange={(e) => setCustomValue(field, e.target.value)}>
          <option value="">{field.placeholder || field.label}</option>
          {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }
    if (field.field_type === "textarea") {
      return (
        <textarea key={field.id || field.field_key} placeholder={field.placeholder || field.label} value={value} required={field.required} onChange={(e) => setCustomValue(field, e.target.value)} />
      );
    }
    if (field.field_type === "checkbox") {
      return (
        <label key={field.id || field.field_key} className="config-checkbox-field">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => setCustomValue(field, e.target.checked)} />
          {field.label}
        </label>
      );
    }
    return (
      <input key={field.id || field.field_key} type={field.field_type === "date" ? "date" : field.field_type === "number" ? "number" : "text"} placeholder={field.placeholder || field.label} value={value} required={field.required} onChange={(e) => setCustomValue(field, e.target.value)} />
    );
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>{title}</h2>
      <div className="formGrid">
        {Object.keys(data).filter((k) => k !== "custom_fields").map((k) =>
          k === "role" ? (
            <select
              key={k}
              value={data[k] ?? ""}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
            >
              <option value="receptionist">Receptionist</option>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="lab_technician">Lab Technician</option>
              <option value="accountant">Accountant</option>
              <option value="hospital_admin">Hospital Admin</option>
              <option value="admin">Platform Admin</option>
            </select>
          ) : k === "status" ? (
            <select
              key={k}
              value={data[k] ?? ""}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
            >
              <option value="scheduled">scheduled</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
              <option value="pending">pending</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          ) : (
            <input
              key={k}
              type={inputType(k)}
              required={
                k === "full_name" ||
                k === "patient_id" ||
                k === "doctor_id" ||
                k === "email" ||
                k === "password"
              }
              placeholder={k.replaceAll("_", " ")}
              value={data[k] ?? ""}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
            />
          ),
        )}
      </div>
      {customFields.length > 0 && (
        <div className="dynamic-fields-block">
          <h3>Additional Details</h3>
          <p className="muted">Custom hospital-specific fields configured by admin.</p>
          <div className="formGrid">{customFields.map(renderCustomField)}</div>
        </div>
      )}
      <button>Save</button>
    </form>
  );
}
