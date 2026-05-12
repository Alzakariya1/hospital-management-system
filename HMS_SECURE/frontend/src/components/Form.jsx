import React from "react";

export default function Form({ title, data, setData, submit }) {
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

  return (
    <form className="card form" onSubmit={submit}>
      <h2>{title}</h2>
      <div className="formGrid">
        {Object.keys(data).map((k) =>
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
              <option value="admin">Admin</option>
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
      <button>Save</button>
    </form>
  );
}
