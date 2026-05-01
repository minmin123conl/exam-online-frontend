import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, API_BASE, type Leaderboard } from "../api";

export default function LeaderboardPage() {
  const { examId } = useParams();
  const [data, setData] = useState<Leaderboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    api.getLeaderboard(Number(examId)).then(setData).catch((e) => setErr((e as Error).message));

    // WebSocket connection
    try {
      const wsUrl = API_BASE.replace(/^http/, "ws") + `/ws/leaderboard/${examId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setLive(true);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "leaderboard") {
            setData(msg.payload);
          }
        } catch {
          /* empty */
        }
      };
      ws.onclose = () => setLive(false);
      ws.onerror = () => setLive(false);
    } catch {
      /* empty */
    }
    return () => {
      wsRef.current?.close();
    };
  }, [examId]);

  if (err) return <div className="container"><div className="error">{err}</div></div>;
  if (!data) return <div className="container muted">Đang tải…</div>;

  const top3 = data.entries.slice(0, 3);
  const rest = data.entries.slice(3);

  return (
    <div className="container">
      <div className="toolbar">
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>🏆 Bảng xếp hạng</h2>
          <div className="muted">{data.exam_title}</div>
        </div>
        <span className={`badge ${live ? "success" : "warning"}`}>
          {live ? "● Đang cập nhật trực tiếp" : "○ Không có kết nối"}
        </span>
      </div>

      {data.entries.length === 0 ? (
        <div className="card muted">Chưa có học sinh nào nộp bài.</div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="podium">
              {top3[1] ? (
                <div className="step second">
                  <div className="rank">🥈 2</div>
                  <div className="name">{top3[1].student_name}</div>
                  <div className="score">{top3[1].score_on_ten}/10</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{top3[1].student_class || ""}</div>
                </div>
              ) : (
                <div />
              )}
              {top3[0] ? (
                <div className="step first">
                  <div className="rank">🥇 1</div>
                  <div className="name">{top3[0].student_name}</div>
                  <div className="score">{top3[0].score_on_ten}/10</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{top3[0].student_class || ""}</div>
                </div>
              ) : (
                <div />
              )}
              {top3[2] ? (
                <div className="step third">
                  <div className="rank">🥉 3</div>
                  <div className="name">{top3[2].student_name}</div>
                  <div className="score">{top3[2].score_on_ten}/10</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{top3[2].student_class || ""}</div>
                </div>
              ) : (
                <div />
              )}
            </div>
          )}

          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Hạng</th>
                  <th>Họ tên</th>
                  <th>Lớp</th>
                  <th>Điểm (thang 10)</th>
                  <th>Điểm thô</th>
                  <th>Nộp lúc</th>
                  <th>Thời gian làm</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e, i) => (
                  <tr key={e.attempt_id} style={i < 3 ? { background: "#fff7ed" } : {}}>
                    <td>
                      {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                    </td>
                    <td><strong>{e.student_name}</strong></td>
                    <td>{e.student_class || "—"}</td>
                    <td><strong className="success-text">{e.score_on_ten}</strong></td>
                    <td>
                      {e.score.toFixed(2)}/{e.total_points.toFixed(2)}
                    </td>
                    <td>{new Date(e.submitted_at).toLocaleString("vi-VN")}</td>
                    <td>{Math.max(1, Math.round(e.duration_seconds / 60))} phút</td>
                  </tr>
                ))}
                {rest.length === 0 && data.entries.length <= 3 && (
                  <tr>
                    <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 20 }}>
                      Mới chỉ có {data.entries.length} học sinh nộp bài
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
