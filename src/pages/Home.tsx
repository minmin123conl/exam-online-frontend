import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ActiveExam } from "../api";

export default function Home() {
  const [exams, setExams] = useState<ActiveExam[] | null>(null);

  useEffect(() => {
    api.listActiveExams().then(setExams).catch(() => setExams([]));
  }, []);

  return (
    <div className="container">
      <div className="home-hero">
        <h1>Hệ thống thi trắc nghiệm online</h1>
        <p>
          Vào thi bằng mã do giáo viên cung cấp. Sau khi làm xong bạn sẽ xem được điểm ngay lập tức
          và có bảng xếp hạng cập nhật theo thời gian thực.
        </p>
        <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 12 }}>
          <Link to="/join" className="btn">
            Vào làm bài
          </Link>
          <Link to="/admin/login" className="btn secondary">
            Đăng nhập quản trị
          </Link>
        </div>
      </div>

      <div className="card">
        <h3>Các đề đang mở</h3>
        {!exams ? (
          <div className="muted">Đang tải…</div>
        ) : exams.length === 0 ? (
          <div className="muted">Chưa có đề thi nào đang mở.</div>
        ) : (
          <div className="grid-2">
            {exams.map((e) => (
              <div key={e.id} className="card" style={{ margin: 0 }}>
                <h4 style={{ marginTop: 0 }}>{e.title}</h4>
                <div className="muted" style={{ marginBottom: 10, whiteSpace: "pre-wrap" }}>
                  {e.description || "—"}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                  <span className="badge">⏱ {e.duration_minutes} phút</span>
                  <Link to={`/leaderboard/${e.id}`} className="btn sm secondary">
                    Bảng xếp hạng
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
