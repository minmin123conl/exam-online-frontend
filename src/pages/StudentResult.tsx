import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type AttemptResult, type AttemptDetail } from "../api";
import { RichText } from "../components/RichText";

type Filter = "all" | "wrong" | "right";

export default function StudentResult() {
  const { attemptId } = useParams();
  const [res, setRes] = useState<AttemptResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const stored = sessionStorage.getItem(`result_${attemptId}`);
    if (stored) {
      setRes(JSON.parse(stored));
      return;
    }
    api.getResult(Number(attemptId)).then(setRes).catch((e) => setErr((e as Error).message));
  }, [attemptId]);

  const visible = useMemo<{ d: AttemptDetail; idx: number }[]>(() => {
    if (!res) return [];
    return res.details
      .map((d, idx) => ({ d, idx }))
      .filter(({ d }) => {
        if (filter === "all") return true;
        if (filter === "wrong") return !d.is_correct;
        return d.is_correct;
      });
  }, [res, filter]);

  if (err) return <div className="container"><div className="error">{err}</div></div>;
  if (!res) return <div className="container muted">Đang tải kết quả…</div>;

  const duration = Math.max(1, Math.round(res.duration_seconds / 60));
  const numWrong = res.num_questions - res.num_correct;

  return (
    <div className="container">
      <div className="score-hero">
        <div className="big">{res.score_on_ten}/10</div>
        <div className="label">
          {res.student_name}
          {res.student_class ? ` — ${res.student_class}` : ""}
        </div>
        <div className="label">
          Đúng <strong>{res.num_correct}</strong> trong số <strong>{res.num_questions}</strong> câu •{" "}
          Điểm thô {res.score.toFixed(2)}/{res.total_points.toFixed(2)} • Làm trong {duration} phút
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <Link to={`/leaderboard/${res.exam_id}`} className="btn secondary">
            🏆 Xem bảng xếp hạng
          </Link>
          <Link to="/" className="btn secondary">
            Về trang chủ
          </Link>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Xem lại bài làm</h3>
            <div className="muted" style={{ fontSize: 13 }}>
              Màu xanh: đáp án đúng. Màu đỏ: đáp án sai bạn đã chọn.
            </div>
          </div>
          <div className="pill-tabs" style={{ borderBottom: "none", margin: 0 }}>
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              Tất cả ({res.num_questions})
            </button>
            <button
              className={filter === "wrong" ? "active" : ""}
              onClick={() => setFilter("wrong")}
              style={filter === "wrong" ? { color: "var(--danger)", borderBottomColor: "var(--danger)" } : {}}
            >
              Câu sai ({numWrong})
            </button>
            <button
              className={filter === "right" ? "active" : ""}
              onClick={() => setFilter("right")}
              style={filter === "right" ? { color: "var(--success)", borderBottomColor: "var(--success)" } : {}}
            >
              Câu đúng ({res.num_correct})
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="muted" style={{ padding: 24, textAlign: "center" }}>
            {filter === "wrong" ? "Chúc mừng! Bạn không sai câu nào 🎉" : "Không có câu hỏi để hiển thị."}
          </div>
        ) : (
          <div className="stack">
            {visible.map(({ d, idx }) => (
              <div key={d.question_id} className="card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                  <div>
                    <span className="question-number">Câu {idx + 1}</span>{" "}
                    {d.is_correct ? (
                      <span className="badge success">✓ Đúng (+{d.earned.toFixed(2)})</span>
                    ) : (
                      <span className="badge danger">✗ Sai (+{d.earned.toFixed(2)}/{d.points})</span>
                    )}{" "}
                    <span className="badge">{d.type === "mc" ? "Trắc nghiệm" : d.type === "tf" ? "Đúng/Sai" : "Trả lời ngắn"}</span>
                  </div>
                  {d.section && <span className="muted" style={{ fontSize: 12 }}>{d.section}</span>}
                </div>
                <div className="question-text"><RichText text={d.question} /></div>
                {d.type === "mc" && d.options && (
                  <div>
                    {Object.entries(d.options).map(([letter, text]) => {
                      const isCorrect = d.correct === letter;
                      const isYour = d.your_answer === letter;
                      return (
                        <div
                          key={letter}
                          className={`option ${isCorrect ? "correct-highlight" : isYour && !isCorrect ? "wrong-highlight" : ""}`}
                        >
                          <span className="letter">{letter}.</span>
                          <span style={{ flex: 1 }}><RichText text={text} /></span>
                          {isCorrect && <span className="badge success">Đáp án đúng</span>}
                          {isYour && !isCorrect && <span className="badge danger">Bạn chọn</span>}
                        </div>
                      );
                    })}
                    {!d.your_answer && (
                      <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                        Bạn chưa chọn đáp án cho câu này.
                      </div>
                    )}
                  </div>
                )}
                {d.type === "sa" && (
                  <div>
                    <div
                      className={`option ${d.is_correct ? "correct-highlight" : "wrong-highlight"}`}
                    >
                      <span style={{ flex: 1 }}>
                        <span className="muted">Đáp án của bạn: </span>
                        <strong>{(d.your_answer as string) || "—"}</strong>
                      </span>
                      <span className="muted" style={{ whiteSpace: "nowrap" }}>
                        Đáp án đúng: <strong>{(d.correct as string) || "—"}</strong>
                      </span>
                    </div>
                  </div>
                )}
                {d.type === "tf" && d.statements && (
                  <div>
                    {Object.entries(d.statements).map(([letter, text]) => {
                      const correct = (d.correct as Record<string, boolean>)[letter];
                      const yoursMap = (d.your_answer as Record<string, boolean>) || {};
                      const yours = yoursMap?.[letter];
                      const ok = correct === yours;
                      return (
                        <div
                          key={letter}
                          className={`option ${ok ? "correct-highlight" : "wrong-highlight"}`}
                        >
                          <span className="letter">{letter})</span>
                          <span style={{ flex: 1 }}><RichText text={text} /></span>
                          <span className="muted" style={{ whiteSpace: "nowrap" }}>
                            Đáp án: <strong>{correct ? "Đúng" : "Sai"}</strong>
                          </span>
                          <span
                            className={ok ? "explain-correct" : "explain-wrong"}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            Bạn: {yours === undefined ? "—" : yours ? "Đúng" : "Sai"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
