import React from "react";
import { DataTable, Form } from "../components";

export default function Labs({ lab, setLab, addLab, labs, rad, setRad, addRadiology, rads }) {
  return (
    <section>
      <Form
        title="Add Lab Test"
        data={lab}
        setData={setLab}
        submit={addLab}
      />
      <DataTable rows={labs} />

      <Form
        title="Add Radiology Test"
        data={rad}
        setData={setRad}
        submit={addRadiology}
      />
      <DataTable rows={rads} />
    </section>
  );
}
