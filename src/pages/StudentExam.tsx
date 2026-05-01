import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type StartExamResponse, type PublicQuestion, type PublicQuestionMC, type PublicQuestionTF, type PublicQuestionSA } from "../api";
import { RichText } from "../components/RichText";

type Answers = Record<string, string | Record<string, boolean>>;

function typeLabel(t: string) {
  if (t === "mc") return "Trắc nghiệm";
  if (t === "tf") return "Đúng/Sai";
  if (t === "sa") return "Trả lời ngắn";
  return t;
}

export default function StudentExam() {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<StartExamResponse | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const submittedRef = useRef(false);

  const storageKey = `attempt_${attemptId}`;
  const answersKey = `answers_${attemptId}`;

  useEffect(() => {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      alert("Phiên làm bài không hợp lệ. Vui lòng nhập lại mã thi.");
      nav("/join");
      return;
    }
    const parsed: StartExamResponse = JSON.parse(raw);
    setData(parsed);
    const savedAns = sessionStorage.getItem(answersKey);
    if (savedAns) setAnswers(JSON.parse(savedAns));
    // Calculate remaining time
    const start = new Date(parsed.started_at).getTime();
    const endTs = start + parsed.duration_minutes * 60 * 1000;
    const tick = () => {
      const r = Math.max(0, Math.floor((endTs - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0 && !submittedRef.current) {
        submit();
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  useEffect(() => {
    sessionStorage.setItem(answersKey, JSON.stringify(answers));
  }, [answers, answersKey]);

  const setMcAnswer = useCallback((qid: number, letter: string) => {
    setAnswers((a) => ({ ...a, [String(qid)]: letter }));
  }, []);

  const setTfAnswer = useCallback((qid: number, letter: string, value: boolean) => {
    setAnswers((a) => {
      const existing = (a[String(qid)] as Record<string, boolean>) || {};
      return { ...a, [String(qid)]: { ...existing, [letter]: value } };
    });
  }, []);

  const setSaAnswer = useCallback((qid: number, value: string) => {
    setAnswers((a) => ({ ...a, [String(qid)]: value }));
  }, []);

  const submit = useCallback(async () => {
    if (submittedRef.current || !data) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await api.submitExam(data.attempt_id, answers);
      sessionStorage.setItem(`result_${res.attempt_id}`, JSON.stringify(res));
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(answersKey);
      nav(`/result/${res.attempt_id}`);
    } catch (e) {
      alert("Nộp bài thất bại: " + (e as Error).message);
      submittedRef.current = false;
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, answers, nav]);

  const answered = useMemo(() => {
    if (!data) return new Set<number>();
    const set = new Set<number>();
    for (const q of data.questions) {
      const a = answers[String(q.id)];
      if (q.type === "mc" && typeof a === "string" && a) set.add(q.id);
      if (q.type === "tf" && a && typeof a === "object") {
        const statements = Object.keys(q.statements);
        if (statements.every((l) => typeof (a as Record<string, boolean>)[l] === "boolean")) set.add(q.id);
      }
      if (q.type === "sa" && typeof a === "string" && a.trim()) set.add(q.id);
    }
    return set;
  }, [answers, data]);

  if (!data) return <div className="container muted">Đang tải đề…</div>;

  const q = data.questions[current];
  const totalAnswered = answered.size;
  const totalQ = data.questions.length;

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const timerClass = remaining < 60 ? "timer danger" : remaining < 300 ? "timer warning" : "timer";

  function pickQuestion(i: number) {
    setCurrent(i);
    setShowNavDrawer(false);
  }

  return (
    <div className="container wide exam-page">
      <div className="exam-toolbar">
        <div className="exam-toolbar-info">
          <h2 className="exam-toolbar-title">{data.exam.title}</h2>
          <div className="muted exam-toolbar-meta">
            <strong>{data.student_name}</strong> · {totalAnswered}/{totalQ} đã chọn
          </div>
        </div>
        <div className="exam-toolbar-actions">
          <div className={timerClass}>
            ⏱ {mm}:{ss}
          </div>
          <button className="btn" onClick={submit} disabled={submitting}>
            {submitting ? "Đang nộp…" : "Nộp bài"}
          </button>
        </div>
      </div>

      <button
        type="button"
        className="btn secondary nav-drawer-toggle"
        onClick={() => setShowNavDrawer(true)}
      >
        ☰ Danh sách câu ({totalAnswered}/{totalQ})
      </button>

      <div className="exam-grid">
        <div>
          <div className="question-card">
            <div className="question-number">
              Câu {current + 1}/{totalQ}
              {q.section && (
                <span className="muted" style={{ marginLeft: 10, fontWeight: 400 }}>
                  {q.section}
                </span>
              )}
              <span className="badge" style={{ marginLeft: 10 }}>
                {typeLabel(q.type)}
              </span>
            </div>
            <div className="question-text"><RichText text={q.question} /></div>
            {q.type === "mc" && (
              <McInput q={q} answer={answers[String(q.id)] as string} onChange={(l) => setMcAnswer(q.id, l)} />
            )}
            {q.type === "tf" && (
              <TfInput q={q} answer={answers[String(q.id)] as Record<string, boolean>} onChange={(l, v) => setTfAnswer(q.id, l, v)} />
            )}
            {q.type === "sa" && (
              <SaInput q={q} answer={answers[String(q.id)] as string} onChange={(v) => setSaAnswer(q.id, v)} />
            )}
            <div className="exam-nav-buttons">
              <button
                className="btn secondary"
                onClick={() => setCurrent(Math.max(0, current - 1))}
                disabled={current === 0}
              >
                ← Câu trước
              </button>
              {current < totalQ - 1 ? (
                <button className="btn" onClick={() => setCurrent(current + 1)}>
                  Câu sau →
                </button>
              ) : (
                <button className="btn" onClick={submit} disabled={submitting}>
                  Nộp bài
                </button>
              )}
            </div>
          </div>
        </div>
        <aside className="exam-sidebar">
          <div className="sidebar-nav">
            <h4 style={{ marginTop: 0 }}>Danh sách câu</h4>
            <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              Bấm số để chuyển tới câu đó
            </div>
            <div className="q-dot-grid">
              {data.questions.map((qq, i) => (
                <div
                  key={qq.id}
                  className={`q-dot ${answered.has(qq.id) ? "answered" : ""} ${i === current ? "current" : ""}`}
                  onClick={() => pickQuestion(i)}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {showNavDrawer && (
        <div className="nav-drawer-backdrop" onClick={() => setShowNavDrawer(false)}>
          <div className="nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="nav-drawer-header">
              <strong>Danh sách câu — {totalAnswered}/{totalQ} đã chọn</strong>
              <button className="btn sm secondary" onClick={() => setShowNavDrawer(false)}>✕</button>
            </div>
            <div className="q-dot-grid">
              {data.questions.map((qq, i) => (
                <div
                  key={qq.id}
                  className={`q-dot ${answered.has(qq.id) ? "answered" : ""} ${i === current ? "current" : ""}`}
                  onClick={() => pickQuestion(i)}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function McInput({
  q,
  answer,
  onChange,
}: {
  q: PublicQuestion;
  answer: string;
  onChange: (letter: string) => void;
}) {
  const mc = q as PublicQuestionMC;
  return (
    <div>
      {Object.entries(mc.options).map(([letter, text]) => (
        <label key={letter} className={`option ${answer === letter ? "selected" : ""}`}>
          <input type="radio" name={`q${q.id}`} checked={answer === letter} onChange={() => onChange(letter)} />
          <span className="letter">{letter}.</span>
          <span style={{ flex: 1 }}><RichText text={text} /></span>
        </label>
      ))}
    </div>
  );
}

function SaInput({
  q,
  answer,
  onChange,
}: {
  q: PublicQuestion;
  answer: string;
  onChange: (value: string) => void;
}) {
  const sa = q as PublicQuestionSA;
  return (
    <div>
      <div className="muted" style={{ marginBottom: 8 }}>
        Nhập đáp án ngắn (số hoặc chuỗi). Có thể là 1 con số (ví dụ: 4) hoặc một dãy số (ví dụ: 1234).
      </div>
      <input
        type="text"
        className="input"
        value={answer || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nhập đáp án..."
        style={{ fontSize: 18, padding: "10px 14px", width: "100%", maxWidth: 360 }}
        autoComplete="off"
        aria-label={`Đáp án câu ${sa.order_index}`}
      />
    </div>
  );
}

function TfInput({
  q,
  answer,
  onChange,
}: {
  q: PublicQuestion;
  answer: Record<string, boolean> | undefined;
  onChange: (letter: string, value: boolean) => void;
}) {
  const tf = q as PublicQuestionTF;
  return (
    <div>
      <div className="muted" style={{ marginBottom: 8 }}>Chọn Đúng hoặc Sai cho từng ý</div>
      {Object.entries(tf.statements).map(([letter, text]) => {
        const cur = answer?.[letter];
        return (
          <div key={letter} className="option" style={{ cursor: "default" }}>
            <span className="letter">{letter})</span>
            <span style={{ flex: 1 }}><RichText text={text} /></span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className={`btn sm ${cur === true ? "" : "secondary"}`}
                onClick={() => onChange(letter, true)}
              >
                Đúng
              </button>
              <button
                className={`btn sm ${cur === false ? "danger" : "secondary"}`}
                onClick={() => onChange(letter, false)}
              >
                Sai
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
