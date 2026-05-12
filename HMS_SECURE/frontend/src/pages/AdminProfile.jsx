import React from "react";
import { Form } from "../components";

export default function AdminProfile({
  user,
  profile,
  setProfile,
  updateProfile,
  handleProfileImageUpload,
  passwordForm,
  setPasswordForm,
  changePassword,
  newUser,
  setNewUser,
  addUser,
  userSearch,
  setUserSearch,
  roleFilter,
  setRoleFilter,
  filteredUsers,
  toggleUserStatus,
  deleteUser,
}) {
  const canManageUsers = user.role === "super_admin" || user.role === "admin";

  return (
    <section>
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <img
            src={
              profile.profile_image ||
              "https://ui-avatars.com/api/?name=" +
                encodeURIComponent(profile.full_name || "Admin")
            }
            alt="Profile"
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid #e5e7eb",
            }}
          />

          <div>
            <h2 style={{ margin: "0 0 6px" }}>
              {profile.full_name || "Admin User"}
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              {profile.email}
            </p>
            {profile.bio && (
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#475569",
                  maxWidth: 520,
                }}
              >
                {profile.bio}
              </p>
            )}
            <span
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "4px 10px",
                borderRadius: 20,
                background: "#eef2ff",
                color: "#3730a3",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {profile.role || user.role}
            </span>
          </div>
        </div>
      </div>

      <form className="card form" onSubmit={updateProfile}>
        <h2>Edit Profile</h2>

        <div className="formGrid">
          <input
            placeholder="Name"
            value={profile.full_name || ""}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
          />

          <input placeholder="Email / Gmail" value={profile.email || ""} disabled />

          <input type="file" accept="image/*" onChange={handleProfileImageUpload} />

          <textarea
            placeholder="Bio"
            value={profile.bio || ""}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            style={{
              minHeight: 90,
              resize: "vertical",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
              fontFamily: "inherit",
            }}
          />
        </div>

        <button>Update Profile</button>
      </form>

      <form className="card form" onSubmit={changePassword}>
        <h2>Change Password</h2>

        <div className="formGrid">
          <input
            type="password"
            placeholder="Old Password"
            value={passwordForm.oldPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, oldPassword: e.target.value })
            }
          />

          <input
            type="password"
            placeholder="New Password"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, newPassword: e.target.value })
            }
          />
        </div>

        <button>Change Password</button>
      </form>

      {canManageUsers && (
        <>
          <Form
            title="Add New User / Role"
            data={newUser}
            setData={setNewUser}
            submit={addUser}
          />

          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <input
                placeholder="Search user..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ maxWidth: 240 }}
              />

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="lab_technician">Lab Technician</option>
                <option value="accountant">Accountant</option>
              </select>
            </div>

            <h2>User List</h2>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>
                        <button onClick={() => toggleUserStatus(u)}>{u.status}</button>
                      </td>
                      <td>
                        {u.email !== user.email ? (
                          <button onClick={() => deleteUser(u)}>Delete</button>
                        ) : (
                          <button
                            disabled
                            style={{ opacity: 0.5, cursor: "not-allowed" }}
                          >
                            Current User
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
