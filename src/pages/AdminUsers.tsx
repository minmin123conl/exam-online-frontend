import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getRole, getToken, getUsername, type AdminRole, type AdminUserOut } from "../api";
import { IdleWarningBanner, useIdleLogout } from "../hooks/useIdleLogout";

const ROLE_LABELS: Record<AdminRole, string> = {
  super: "Super-admin",
  manager: "Quản lý đề",
  viewer: "Chỉ xem",
};

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super: "Toàn quyền: quản lý đề + tài khoản admin khác.",
  manager: "Tạo/sửa/xoá đề thi, mã thi, lượt làm — không quản lý tài khoản.",
  viewer: "Chỉ xem đề và kết quả, không sửa được gì.",
};

export default function AdminUsers() {
  const nav = useNavigate();
  const { warnSeconds, stayActive } = useIdleLogout();
  const [users, setUsers] = useState<AdminUserOut[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newU, setNewU] = useState("");
  const [newP, setNewP] = useState("");
  const [newR, setNewR] = useState<AdminRole>("manager");
  const me = getUsername();
  const myRole = getRole();

  async function load() {
    try {
      const list = await api.listAdminUsers();
      setUsers(list);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      nav("/admin/login");
      return;
    }
    load();
  }, [nav]);

  if (myRole !== "super") {
    return (
      <div className="container narrow">
        <div className="card">
          <h3>Không đủ quyền</h3>
          <p className="muted">Chỉ Super-admin mới truy cập được trang này.</p>
          <Link to="/admin" className="btn">← Quay lại</Link>
        </div>
      </div>
    );
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createAdminUser({ username: newU.trim(), password: newP, role: newR });
      setShowCreate(false);
      setNewU("");
      setNewP("");
      setNewR("manager");
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function changeRole(u: AdminUserOut, role: AdminRole) {
    if (u.role === role) return;
    try {
      await api.updateAdminUser(u.id, { role });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function resetPw(u: AdminUserOut) {
    const p = prompt(`Đặt mật khẩu mới cho "${u.username}" (≥10 ký tự, có hoa/thường/số/đặc biệt):`);
    if (!p) return;
    try {
      await api.updateAdminUser(u.id, { new_password: p });
      alert("Đã đặt lại mật khẩu. Người dùng sẽ buộc phải đổi mật khẩu khi đăng nhập lần tới.");
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function remove(u: AdminUserOut) {
    if (!confirm(`Xoá tài khoản "${u.username}"?`)) return;
    try {
      await api.deleteAdminUser(u.id);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="container">
      <IdleWarningBanner warnSeconds={warnSeconds} onStay={stayActive} />
      <div className="toolbar">
        <h2 style={{ margin: 0, flex: 1 }}>Quản lý tài khoản admin</h2>
        <Link to="/admin" className="btn secondary">← Về dashboard</Link>
        <button className="btn" onClick={() => setShowCreate(true)}>+ Thêm tài khoản</button>
      </div>

      <div className="card muted" style={{ fontSize: 13 }}>
        <strong>Vai trò:</strong>
        <ul style={{ margin: "6px 0 0 18px" }}>
          {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
            <li key={r}>
              <strong>{ROLE_LABELS[r]}</strong> — {ROLE_DESCRIPTIONS[r]}
            </li>
          ))}
        </ul>
      </div>

      {showCreate && (
        <div className="card">
          <h3>Tạo tài khoản admin</h3>
          <form onSubmit={create}>
            <div className="field">
              <label>Tên đăng nhập</label>
              <input className="input" value={newU} onChange={(e) => setNewU(e.target.value)} required minLength={3} />
            </div>
            <div className="field">
              <label>Mật khẩu (mạnh)</label>
              <input
                className="input"
                type="password"
                value={newP}
                onChange={(e) => setNewP(e.target.value)}
                required
              />
              <div className="muted" style={{ fontSize: 12 }}>
                ≥10 ký tự, có chữ hoa/thường/số/ký tự đặc biệt.
              </div>
            </div>
            <div className="field">
              <label>Vai trò</label>
              <select value={newR} onChange={(e) => setNewR(e.target.value as AdminRole)} className="input">
                <option value="super">Super-admin</option>
                <option value="manager">Quản lý đề</option>
                <option value="viewer">Chỉ xem</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn">Tạo</button>
              <button type="button" className="btn secondary" onClick={() => setShowCreate(false)}>Huỷ</button>
            </div>
          </form>
        </div>
      )}

      {err && <div className="card"><div className="error">{err}</div></div>}

      {users === null ? (
        <div className="muted">Đang tải…</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Tên đăng nhập</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Tạo lúc</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.username}</strong>
                    {u.username === me && <span className="badge" style={{ marginLeft: 6 }}>bạn</span>}
                  </td>
                  <td>
                    <select
                      className="input"
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as AdminRole)}
                      disabled={u.username === me}
                      style={{ width: 160 }}
                    >
                      <option value="super">Super-admin</option>
                      <option value="manager">Quản lý đề</option>
                      <option value="viewer">Chỉ xem</option>
                    </select>
                  </td>
                  <td>
                    {u.must_change_password ? (
                      <span className="badge warning">Cần đổi mật khẩu</span>
                    ) : (
                      <span className="badge success">OK</span>
                    )}
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn sm secondary" onClick={() => resetPw(u)}>Đặt lại MK</button>
                      <button
                        className="btn sm danger"
                        onClick={() => remove(u)}
                        disabled={u.username === me}
                      >
                        Xoá
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
