import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";

export default function AdminLogin() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const reason = params.get("reason");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(
    reason === "idle" ? "Bạn đã bị đăng xuất do không thao tác trong thời gian dài. Vui lòng đăng nhập lại." : null,
  );
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const data = await api.login(username, password);
      if (data.must_change_password) {
        nav("/admin/change-password");
      } else {
        nav("/admin");
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container narrow">
      <div className="card" style={{ marginTop: 40 }}>
        <h2>Đăng nhập quản trị</h2>
        <form onSubmit={submit}>
          <div className="field">
            <label>Tên đăng nhập</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Mật khẩu</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err && <div className="error">{err}</div>}
          <button type="submit" className="btn" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
