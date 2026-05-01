import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, getToken, getMustChange, setMustChange } from "../api";

const RULES = [
  "Ít nhất 10 ký tự",
  "Có chữ in hoa (A-Z)",
  "Có chữ thường (a-z)",
  "Có chữ số (0-9)",
  "Có ký tự đặc biệt (!@#$%^&*…)",
  "Không phải mật khẩu phổ biến (admin123, password…)",
];

export default function ChangePassword() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const forced = params.get("forced") === "1" || getMustChange();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) nav("/admin/login");
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (newPw !== confirmPw) {
      setErr("Nhập lại mật khẩu mới không khớp.");
      return;
    }
    setLoading(true);
    try {
      await api.changePassword(oldPw, newPw);
      setMustChange(false);
      setOk("Đổi mật khẩu thành công. Đang chuyển hướng…");
      setTimeout(() => nav("/admin"), 800);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container narrow">
      <div className="card" style={{ marginTop: 32 }}>
        <h2>Đổi mật khẩu</h2>
        {forced && (
          <div className="error" style={{ marginBottom: 12 }}>
            Tài khoản đang dùng mật khẩu mặc định/yếu. Vui lòng đặt mật khẩu mạnh trước khi tiếp tục.
          </div>
        )}
        <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Yêu cầu mật khẩu mới:
          <ul style={{ margin: "6px 0 0 18px" }}>
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <form onSubmit={submit}>
          <div className="field">
            <label>Mật khẩu cũ</label>
            <input
              className="input"
              type="password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label>Mật khẩu mới</label>
            <input
              className="input"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Nhập lại mật khẩu mới</label>
            <input
              className="input"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
            />
          </div>
          {err && <div className="error">{err}</div>}
          {ok && <div className="muted" style={{ color: "#059669" }}>{ok}</div>}
          <button type="submit" className="btn" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? "Đang đổi…" : "Đổi mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}
