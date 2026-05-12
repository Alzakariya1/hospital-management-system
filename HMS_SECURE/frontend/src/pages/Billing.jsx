import React from "react";
import { DataTable, Form } from "../components";

export default function Billing({ bill, setBill, addBill, bills, permissions = {} }) {
  return (
    <section>
      {permissions.billingCreate && <Form title="Add Bill" data={bill} setData={setBill} submit={addBill} />}
      <DataTable rows={bills} />
    </section>
  );
}
