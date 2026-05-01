import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, clearAuth, getMustChange, getRole, getToken, getUsername, type ExamSummary } from "../api";
import { IdleWarningBanner, useIdleLogout } from "../hooks/useIdleLogout";

export default function AdminDashboard() {
  const nav = useNavigate();
  const { warnSeconds, stayActive } = useIdleLogout();
  const role = getRole();
  const myName = getUsername();
  const canWrite = role === "super" || role === "manager";
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState(45);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDuration, setUploadDuration] = useState(50);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const list = await api.listExams();
      setExams(list);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      nav("/admin/login");
      return;
    }
    if (getMustChange()) {
      nav("/admin/change-password?forced=1");
      return;
    }
    load();
  }, [nav]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const exam = await api.createExam({
        title: newTitle,
        description: newDesc,
        duration_minutes: newDuration,
        is_active: true,
        show_leaderboard: true,
      });
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      setNewDuration(45);
      nav(`/admin/exams/${exam.id}`);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function remove(id: number) {
    if (!confirm("Xoá đề thi này và toàn bộ mã thi + kết quả?")) return;
    await api.deleteExam(id);
    load();
  }

  async function duplicate(id: number) {
    await api.duplicateExam(id);
    load();
  }

  async function doUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    try {
      const res = await api.uploadExamDocx(uploadFile, {
        title: uploadTitle.trim() || undefined,
        duration_minutes: uploadDuration,
      });
      setShowUpload(false);
      setUploadFile(null);
      setUploadTitle("");
      if (fileRef.current) fileRef.current.value = "";
      const w = res.warnings.length ? `\n\nCảnh báo:\n• ${res.warnings.slice(0, 5).join("\n• ")}` : "";
      const m = res.stats.missing_answers
        ? `\n\nCó ${res.stats.missing_answers} câu chưa nhận diện được đáp án — vui lòng vào trang sửa đề để chỉnh tay.`
        : "";
      const sa = (res.stats.num_sa ?? 0);
      const saLine = sa ? `\nTrả lời ngắn: ${sa} câu` : "";
      alert(
        `Đã tạo đề thành công!\nTrắc nghiệm: ${res.stats.num_mc} câu\nĐúng/Sai: ${res.stats.num_tf} câu${saLine}${m}${w}`
      );
      nav(`/admin/exams/${res.exam.id}`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function logout() {
    clearAuth();
    nav("/admin/login");
  }

  const roleLabel: Record<string, string> = {
    super: "Super-admin",
    manager: "Quản lý đề",
    viewer: "Chỉ xem",
  };

  return (
    <div className="container">
      <IdleWarningBanner warnSeconds={warnSeconds} onStay={stayActive} />
      <div className="toolbar">
        <h2 style={{ margin: 0, flex: 1 }}>
          Quản trị đề thi{" "}
          <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>
            — {myName} <span className="badge">{roleLabel[role] || role}</span>
          </span>
        </h2>
        {canWrite && (
          <button className="btn secondary" onClick={() => setShowUpload(true)}>📄 Tải đề từ Word</button>
        )}
        {canWrite && (
          <button className="btn" onClick={() => setShowCreate(true)}>+ Tạo đề mới</button>
        )}
        {role === "super" && (
          <Link to="/admin/users" className="btn secondary">👥 Tài khoản</Link>
        )}
        <Link to="/admin/change-password" className="btn secondary">🔑 Đổi mật khẩu</Link>
        <button className="btn secondary" onClick={logout}>Đăng xuất</button>
      </div>

      {showUpload && (
        <div className="card">
          <h3>Tải đề từ file Word (.docx)</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            Hệ thống tự nhận diện <strong>câu trắc nghiệm</strong> (đáp án đúng = chữ <span style={{ color: "#dc2626" }}>đỏ</span>),{" "}
            <strong>câu Đúng/Sai</strong> (đáp án từ bảng), <strong>hình ảnh</strong> trong câu hỏi và{" "}
            <strong>công thức toán</strong>. Sau khi tải lên, bạn có thể chỉnh sửa từng câu trong trang sửa đề nếu hệ thống nhận diện sai.
          </p>
          <form onSubmit={doUpload}>
            <div className="field">
              <label>File .docx</label>
              <input
                ref={fileRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div className="field">
              <label>Tên đề (để trống = dùng tên file)</label>
              <input
                className="input"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="VD: Đề thi học kỳ I môn Lịch sử"
              />
            </div>
            <div className="field">
              <label>Thời gian làm bài (phút)</label>
              <input
                className="input"
                type="number"
                min={1}
                value={uploadDuration}
                onChange={(e) => setUploadDuration(Number(e.target.value))}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn" disabled={!uploadFile || uploading}>
                {uploading ? "Đang xử lý…" : "Tải lên & nhận diện"}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setShowUpload(false);
                  setUploadFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                disabled={uploading}
              >
                Huỷ
              </button>
            </div>
          </form>
        </div>
      )}

      {err && <div className="card"><div className="error">{err}</div></div>}

      {showCreate && (
        <div className="card">
          <h3>Tạo đề thi mới</h3>
          <form onSubmit={create}>
            <div className="field">
              <label>Tên đề</label>
              <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Mô tả</label>
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <div className="field">
              <label>Thời gian làm bài (phút)</label>
              <input
                className="input"
                type="number"
                min={1}
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn">Tạo</button>
              <button type="button" className="btn secondary" onClick={() => setShowCreate(false)}>
                Huỷ
              </button>
            </div>
          </form>
        </div>
      )}

      {exams === null ? (
        <div className="muted">Đang tải…</div>
      ) : exams.length === 0 ? (
        <div className="card muted">Chưa có đề thi nào. Tạo đề đầu tiên!</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Tên đề</th>
                <th>Số câu</th>
                <th>Mã thi</th>
                <th>Lượt làm</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link to={`/admin/exams/${e.id}`} style={{ fontWeight: 600 }}>
                      {e.title}
                    </Link>
                    <div className="muted" style={{ fontSize: 12 }}>{e.description}</div>
                  </td>
                  <td>{e.num_questions}</td>
                  <td>
                    {e.num_codes_used}/{e.num_codes}
                  </td>
                  <td>{e.num_attempts}</td>
                  <td>{e.duration_minutes} phút</td>
                  <td>
                    {e.is_active ? (
                      <span className="badge success">Đang mở</span>
                    ) : (
                      <span className="badge warning">Đã khoá</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link to={`/admin/exams/${e.id}`} className="btn sm secondary">
                        {canWrite ? "Sửa" : "Xem"}
                      </Link>
                      {canWrite && (
                        <button className="btn sm secondary" onClick={() => duplicate(e.id)}>
                          Nhân bản
                        </button>
                      )}
                      {canWrite && (
                        <button className="btn sm danger" onClick={() => remove(e.id)}>
                          Xoá
                        </button>
                      )}
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
