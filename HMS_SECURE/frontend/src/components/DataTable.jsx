import React, { useEffect, useMemo, useRef, useState } from "react";

function formatHeader(key) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(key, value) {
  if (value === null || value === undefined || value === "") return <span className="tableMuted">—</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : <span className="tableMuted">—</span>;
  if (typeof value === "object") return JSON.stringify(value);

  const text = String(value);
  if (["status", "payment_status"].includes(key)) {
    const normalized = text.toLowerCase();
    const cls = normalized.includes("paid") || normalized.includes("active") || normalized.includes("completed")
      ? "success"
      : normalized.includes("cancel") || normalized.includes("delete") || normalized.includes("inactive") || normalized.includes("pending")
        ? "warning"
        : "neutral";
    return <span className={`statusBadge ${cls}`}>{text}</span>;
  }

  return text;
}

export default function DataTable({ rows, onEdit, onDelete, showProfile, onProfile }) {
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  useEffect(() => {
    function closeMenu(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenActionMenu(null);
      }
    }
    function closeOnScroll() {
      setOpenActionMenu(null);
    }

    document.addEventListener("mousedown", closeMenu);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnScroll);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnScroll);
    };
  }, []);

  const hiddenKeys = useMemo(() => [
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
  ], []);

  const keys = useMemo(() => {
    if (!rows?.length) return [];
    return Object.keys(rows[0])
      .filter((k) => !hiddenKeys.includes(k))
      .slice(0, 7);
  }, [rows, hiddenKeys]);

  const hasActions = Boolean(onEdit || onDelete || showProfile);

  function openMenu(index, event) {
    event.stopPropagation();
    if (openActionMenu === index) {
      setOpenActionMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 190;
    setMenuPosition({
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)),
    });
    setOpenActionMenu(index);
  }

  if (!rows?.length) {
    return (
      <div className="emptyTableState">
        <div className="emptyIcon"><i className="bi bi-inbox"></i></div>
        <h3>No records found</h3>
        <p className="muted">Records will appear here once they are created.</p>
      </div>
    );
  }

  return (
    <div className="tableWrap enterpriseTableWrap">
      <table className="enterpriseTable">
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{formatHeader(k)}</th>
            ))}
            {hasActions && <th className="actionsCol">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || r._id || i}>
              {keys.map((k) => (
                <td key={k} title={typeof r[k] === "object" ? "" : String(r[k] ?? "")}>
                  <span className="tableCellText">{formatValue(k, r[k])}</span>
                </td>
              ))}
              {hasActions && (
                <td className="actions-menu-cell actionsCol">
                  <button
                    type="button"
                    className="three-dot-btn"
                    aria-label="Open actions"
                    onClick={(event) => openMenu(i, event)}
                  >
                    <i className="bi bi-three-dots-vertical"></i>
                  </button>

                  {openActionMenu === i && (
                    <div
                      ref={menuRef}
                      className="actions-dropdown floatingActionMenu"
                      style={{ top: menuPosition.top, left: menuPosition.left }}
                    >
                      {showProfile && (
                        <button
                          type="button"
                          onClick={() => {
                            onProfile?.(r);
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
