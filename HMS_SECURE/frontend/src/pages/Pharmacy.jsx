import React from "react";
import { DataTable, Form } from "../components";

export default function Pharmacy({ med, setMed, addMedicine, meds }) {
  return (
    <section>
      <Form
        title="Add Medicine"
        data={med}
        setData={setMed}
        submit={addMedicine}
      />
      <DataTable rows={meds} />
    </section>
  );
}
