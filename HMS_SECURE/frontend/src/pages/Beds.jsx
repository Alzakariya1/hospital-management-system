import React from "react";
import { DataTable, Form } from "../components";

export default function Beds({ bed, setBed, addBed, beds, permissions = {} }) {
  return (
    <section>
      {permissions.bedCreate && <Form title="Add Bed" data={bed} setData={setBed} submit={addBed} />}
      <DataTable rows={beds} />
    </section>
  );
}
