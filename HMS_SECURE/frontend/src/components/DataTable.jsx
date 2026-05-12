import React, { useState } from "react";

export default function DataTable({ rows, onEdit, onDelete, showProfile, onProfile }) {
  const [openActionMenu, setOpenActionMenu] = useState(null);

  if (!rows?.length) return <p className="muted">No records found.</p>;

  const hiddenKeys = [
    "_id",
    "id",
    "__v",
    "created_at",
    "updated_at",
    "doctor_uid",
    "opd_timing",
    "ipd_timing",
    "department_id",
    "department_name",
    "experience_years",
    "status",
  ];

  const keys = Object.keys(rows[0])
    .filter((k) => !hiddenKeys.includes(k))
    .slice(0, 7);

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{k.replaceAll("_", " ")}</th>
            ))}
            {(onEdit || onDelete) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {keys.map((k) => (
                <td key={k}>{String(r[k] ?? "")}</td>
              ))}
              {(onEdit || onDelete) && (
                <td className="actions-menu-cell">
                  <button
                    type="button"
                    className="three-dot-btn"
                    onClick={() =>
                      setOpenActionMenu(openActionMenu === i ? null : i)
                    }
                  >
                    <i className="bi bi-three-dots-vertical"></i>
                  </button>

                  {openActionMenu === i && (
                    <div className="actions-dropdown">
                      {showProfile && (
                        <button
                          type="button"
                          onClick={() => {
                            onProfile(r);
                            setOpenActionMenu(null);
                          }}
                        >
                          <i className="bi bi-eye"></i>
                          View Profile
                        </button>
                      )}

                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            onEdit(r);
                            setOpenActionMenu(null);
                          }}
                        >
                          <i className="bi bi-pencil-square"></i>
                          Edit
                        </button>
                      )}

                      {onDelete && (
                        <button
                          type="button"
                          className="danger-action"
                          onClick={() => {
                            onDelete(r);
                            setOpenActionMenu(null);
                          }}
                        >
                          <i className="bi bi-trash"></i>
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
