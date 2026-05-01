import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";

export default function StudentStart() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState((params.get("code") || "").toUpperCase());
  const [name, setName] = useState("");
  const [cls, setCls] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!code.trim() || !name.trim()) {
      setErr("Vui lòng nhập đầy đủ mã thi và họ tên");
      return;
    }
    setLoading(true);
    try {
      const res = await api.startExam(code.trim().toUpperCase(), name.trim(), cls.trim());
      // Store attempt info for offline protection
      sessionStorage.setItem(`attempt_${res.attempt_id}`, JSON.stringify(res));
      nav(`/exam/${res.attempt_id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container narrow">
      <div className="card" style={{ marginTop: 40 }}>
        <h2>Vào thi</h2>
        <p className="muted">Nhập mã thi do giáo viên cung cấp và họ tên của bạn.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Mã thi</label>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: A7K3PQ9M"
              autoFocus
              style={{ fontFamily: "monospace", letterSpacing: 2, fontSize: 18 }}
            />
          </div>
          <div className="field">
            <label>Họ và tên</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Lớp (không bắt buộc)</label>
            <input className="input" value={cls} onChange={(e) => setCls(e.target.value)} placeholder="VD: 12A1" />
          </div>
          {err && <div className="error">{err}</div>}
          <button type="submit" className="btn" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? "Đang vào thi…" : "Bắt đầu làm bài"}
          </button>
        </form>
        <div className="muted" style={{ marginTop: 14 }}>
          Lưu ý: mỗi mã chỉ dùng được <strong>một lần duy nhất</strong>. Không đóng trình duyệt giữa bài.
        </div>
      </div>
    </div>
  );
}
