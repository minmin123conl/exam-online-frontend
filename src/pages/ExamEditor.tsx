import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  api,
  getRole,
  type ExamCode,
  type ExamFull,
  type Question,
  type QuestionIn,
  type AttemptRow,
  type AttemptResult,
} from "../api";
import { RichText } from "../components/RichText";
import { IdleWarningBanner, useIdleLogout } from "../hooks/useIdleLogout";

type Tab = "info" | "questions" | "codes" | "results";

export default function ExamEditor() {
  const { examId } = useParams();
  const id = Number(examId);
  const nav = useNavigate();
  const role = getRole();
  const canWrite = role === "super" || role === "manager";
  const { warnSeconds, stayActive } = useIdleLogout();
  const [tab, setTab] = useState<Tab>("info");
  const [exam, setExam] = useState<ExamFull | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const e = await api.getExam(id);
      setExam(e);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (err) return <div className="container"><div className="error">{err}</div></div>;
  if (!exam) return <div className="container muted">Đang tải đề…</div>;

  return (
    <div className="container wide">
      <IdleWarningBanner warnSeconds={warnSeconds} onStay={stayActive} />
      <div className="toolbar">
        <Link to="/admin" className="btn sm secondary">← Về danh sách</Link>
        <h2 style={{ margin: 0, flex: 1 }}>{exam.title}</h2>
        {!canWrite && <span className="badge warning">Chế độ chỉ xem</span>}
        <span className="muted">ID #{exam.id}</span>
      </div>

      <div className="pill-tabs">
        <button className={tab === "info" ? "active" : ""} onClick={() => setTab("info")}>
          Thông tin
        </button>
        <button className={tab === "questions" ? "active" : ""} onClick={() => setTab("questions")}>
          Câu hỏi ({exam.num_questions})
        </button>
        <button className={tab === "codes" ? "active" : ""} onClick={() => setTab("codes")}>
          Mã thi ({exam.num_codes_used}/{exam.num_codes})
        </button>
        <button className={tab === "results" ? "active" : ""} onClick={() => setTab("results")}>
          Kết quả ({exam.num_attempts})
        </button>
      </div>

      {tab === "info" && <InfoTab exam={exam} reload={load} onDelete={() => nav("/admin")} />}
      {tab === "questions" && <QuestionsTab exam={exam} reload={load} />}
      {tab === "codes" && <CodesTab examId={id} examTitle={exam.title} />}
      {tab === "results" && <ResultsTab examId={id} />}
    </div>
  );
}

function InfoTab({ exam, reload, onDelete }: { exam: ExamFull; reload: () => void; onDelete: () => void }) {
  const [title, setTitle] = useState(exam.title);
  const [description, setDescription] = useState(exam.description);
  const [duration, setDuration] = useState(exam.duration_minutes);
  const [active, setActive] = useState(exam.is_active);
  const [showLb, setShowLb] = useState(exam.show_leaderboard);
  const [shuffleMode, setShuffleMode] = useState<string>(exam.shuffle_mode || "none");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.updateExam(exam.id, {
        title,
        description,
        duration_minutes: duration,
        is_active: active,
        show_leaderboard: showLb,
        shuffle_mode: shuffleMode,
      });
      reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Xoá đề thi và toàn bộ mã + kết quả?")) return;
    await api.deleteExam(exam.id);
    onDelete();
  }

  return (
    <div className="card">
      <h3>Thông tin đề thi</h3>
      <div className="field">
        <label>Tên đề</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>Mô tả</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="row">
        <div className="field">
          <label>Thời gian (phút)</label>
          <input
            className="input"
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Trạng thái</label>
          <select value={active ? "1" : "0"} onChange={(e) => setActive(e.target.value === "1")}>
            <option value="1">Đang mở (học sinh có thể làm)</option>
            <option value="0">Đã khoá</option>
          </select>
        </div>
        <div className="field">
          <label>Bảng xếp hạng</label>
          <select value={showLb ? "1" : "0"} onChange={(e) => setShowLb(e.target.value === "1")}>
            <option value="1">Hiện bảng xếp hạng công khai</option>
            <option value="0">Ẩn bảng xếp hạng</option>
          </select>
        </div>
        <div className="field">
          <label>Đảo câu hỏi</label>
          <select value={shuffleMode} onChange={(e) => setShuffleMode(e.target.value)}>
            <option value="none">Không đảo (giữ thứ tự đề gốc)</option>
            <option value="by_group">Đảo trong từng nhóm (Trắc nghiệm / Đúng-Sai)</option>
            <option value="all">Đảo toàn bộ (trộn ngẫu nhiên không phân nhóm)</option>
          </select>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Mỗi học sinh sẽ nhận một thứ tự câu hỏi độc lập khi vào làm.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
        <button className="btn danger" onClick={remove}>Xoá đề</button>
      </div>
    </div>
  );
}

function QuestionsTab({ exam, reload }: { exam: ExamFull; reload: () => void }) {
  const [editing, setEditing] = useState<Question | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "missing" | "mc" | "tf" | "sa">("all");
  const [search, setSearch] = useState("");

  const visibleQuestions = useMemo(() => {
    return exam.questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => {
        if (filter === "missing") {
          if (q.type === "mc" && q.data.answer) return false;
          if (q.type === "sa" && q.data.answer) return false;
          if (q.type === "tf") return false;
        }
        if (filter === "mc" && q.type !== "mc") return false;
        if (filter === "tf" && q.type !== "tf") return false;
        if (filter === "sa" && q.type !== "sa") return false;
        if (search) {
          const txt = (q.data.question as string || "").toLowerCase();
          if (!txt.includes(search.toLowerCase())) return false;
        }
        return true;
      });
  }, [exam.questions, filter, search]);

  const numMissing = exam.questions.filter((q) =>
    (q.type === "mc" && !q.data.answer) || (q.type === "sa" && !q.data.answer)
  ).length;

  return (
    <div>
      <div className="toolbar">
        <button className="btn" onClick={() => setAdding(true)}>+ Thêm câu hỏi</button>
        <span className="muted">
          {exam.questions.filter((q) => q.type === "mc").length} trắc nghiệm, {" "}
          {exam.questions.filter((q) => q.type === "tf").length} đúng/sai, {" "}
          {exam.questions.filter((q) => q.type === "sa").length} trả lời ngắn
        </span>
        {numMissing > 0 && (
          <span className="badge danger">⚠ {numMissing} câu thiếu đáp án</span>
        )}
      </div>

      <div className="card" style={{ padding: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span className="muted" style={{ fontSize: 13 }}>Lọc:</span>
        <button
          className={`btn sm ${filter === "all" ? "" : "secondary"}`}
          onClick={() => setFilter("all")}
        >
          Tất cả ({exam.questions.length})
        </button>
        <button
          className={`btn sm ${filter === "mc" ? "" : "secondary"}`}
          onClick={() => setFilter("mc")}
        >
          Trắc nghiệm
        </button>
        <button
          className={`btn sm ${filter === "tf" ? "" : "secondary"}`}
          onClick={() => setFilter("tf")}
        >
          Đúng/Sai
        </button>
        <button
          className={`btn sm ${filter === "sa" ? "" : "secondary"}`}
          onClick={() => setFilter("sa")}
        >
          Trả lời ngắn
        </button>
        <button
          className={`btn sm ${filter === "missing" ? "danger" : "secondary"}`}
          onClick={() => setFilter("missing")}
          disabled={numMissing === 0}
        >
          Thiếu đáp án ({numMissing})
        </button>
        <input
          className="input"
          placeholder="Tìm trong nội dung câu hỏi…"
          style={{ flex: 1, minWidth: 200 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {adding && (
        <QuestionForm
          examId={exam.id}
          onSaved={() => {
            setAdding(false);
            reload();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <div>
        {visibleQuestions.length === 0 && (
          <div className="card muted" style={{ textAlign: "center", padding: 24 }}>
            Không có câu hỏi nào khớp với bộ lọc.
          </div>
        )}
        {visibleQuestions.map(({ q, idx }) => {
          if (editing && editing.id === q.id) {
            return (
              <QuestionForm
                key={q.id}
                examId={exam.id}
                question={editing}
                onSaved={() => {
                  setEditing(null);
                  reload();
                }}
                onCancel={() => setEditing(null)}
              />
            );
          }
          return (
          <div key={q.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <span className="question-number">Câu {idx + 1}</span>{" "}
                <span className="badge">
                  {q.type === "mc" ? "Trắc nghiệm" : q.type === "tf" ? "Đúng/Sai" : "Trả lời ngắn"}
                </span>{" "}
                {q.section && <span className="muted">{q.section}</span>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn sm secondary" onClick={() => setEditing(q)}>Sửa</button>
                <button
                  className="btn sm danger"
                  onClick={async () => {
                    if (!confirm("Xoá câu hỏi này?")) return;
                    await api.deleteQuestion(q.id);
                    reload();
                  }}
                >
                  Xoá
                </button>
              </div>
            </div>
            <div className="question-text"><RichText text={(q.data.question as string) || ""} /></div>
            {q.type === "mc" && (
              <div className="stack">
                {Object.entries((q.data.options as Record<string, string>) || {}).map(([letter, text]) => (
                  <div
                    key={letter}
                    className={`option ${letter === q.data.answer ? "correct-highlight" : ""}`}
                  >
                    <span className="letter">{letter}.</span>
                    <span style={{ flex: 1 }}><RichText text={text} /></span>
                    {letter === q.data.answer && <span className="badge success">✓ Đáp án</span>}
                  </div>
                ))}
                {!q.data.answer && (
                  <div className="error" style={{ marginTop: 6 }}>
                    Chưa có đáp án — hãy bấm "Sửa" để chọn đáp án đúng.
                  </div>
                )}
              </div>
            )}
            {q.type === "sa" && (
              <div className="stack">
                <div className="option">
                  <span className="muted" style={{ flex: 1 }}>Đáp án ngắn:</span>
                  <strong>{(q.data.answer as string) || "—"}</strong>
                </div>
                {!q.data.answer && (
                  <div className="error" style={{ marginTop: 6 }}>
                    Chưa có đáp án — hãy bấm "Sửa" để nhập đáp án.
                  </div>
                )}
              </div>
            )}
            {q.type === "tf" && (
              <div className="stack">
                {Object.entries((q.data.statements as Record<string, string>) || {}).map(
                  ([letter, text]) => {
                    const correct = ((q.data.answers as Record<string, boolean>) || {})[letter];
                    return (
                      <div key={letter} className="option">
                        <span className="letter">{letter})</span>
                        <span style={{ flex: 1 }}><RichText text={text} /></span>
                        <span className={`badge ${correct ? "success" : "danger"}`}>
                          {correct ? "Đúng" : "Sai"}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function MediaButtons({
  onInsert,
  size = "sm",
}: {
  onInsert: (snippet: string) => void;
  size?: "sm" | "xs";
}) {
  const [busy, setBusy] = useState(false);
  async function pickImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      setBusy(true);
      try {
        const { url } = await api.uploadImage(f);
        onInsert(`[IMG:${url}]`);
      } catch (e) {
        alert((e as Error).message);
      } finally {
        setBusy(false);
      }
    };
    input.click();
  }
  function addFormula() {
    const text = prompt("Nhập công thức (VD: x^2 + y^2 = 1):");
    if (text && text.trim()) onInsert(`[MATH:${text.trim()}]`);
  }
  const klass = size === "xs" ? "btn sm secondary" : "btn sm secondary";
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <button type="button" className={klass} onClick={pickImage} disabled={busy} title="Chèn ảnh">
        {busy ? "Đang tải…" : "🖼 Ảnh"}
      </button>
      <button type="button" className={klass} onClick={addFormula} title="Chèn công thức">
        ƒ Công thức
      </button>
    </span>
  );
}

function QuestionForm({
  examId,
  question,
  onSaved,
  onCancel,
}: {
  examId: number;
  question?: Question;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<"mc" | "tf" | "sa">(question?.type || "mc");
  const [section, setSection] = useState(question?.section || "");
  const [text, setText] = useState(((question?.data.question as string) || "") as string);
  const [points, setPoints] = useState(question?.points || 1.0);

  // MC state
  const [mcOptions, setMcOptions] = useState<Record<string, string>>(
    (question?.data.options as Record<string, string>) || { A: "", B: "", C: "", D: "" },
  );
  const [mcAnswer, setMcAnswer] = useState<string>((question?.data.answer as string) || "A");

  // TF state
  const [tfStatements, setTfStatements] = useState<Record<string, string>>(
    (question?.data.statements as Record<string, string>) || { a: "", b: "", c: "", d: "" },
  );
  const [tfAnswers, setTfAnswers] = useState<Record<string, boolean>>(
    (question?.data.answers as Record<string, boolean>) || { a: false, b: false, c: false, d: false },
  );

  // Short-answer state
  const [saAnswer, setSaAnswer] = useState<string>((question?.data.answer as string) || "");

  async function save() {
    let data: Record<string, unknown>;
    if (type === "mc") {
      data = { question: text, options: mcOptions, answer: mcAnswer };
    } else if (type === "tf") {
      data = { question: text, statements: tfStatements, answers: tfAnswers };
    } else {
      data = { question: text, answer: saAnswer.trim() };
    }
    const body: QuestionIn = {
      type,
      section,
      data,
      points,
      order_index: question?.order_index || 0,
    };
    try {
      if (question) {
        await api.updateQuestion(question.id, body);
      } else {
        await api.addQuestion(examId, body);
      }
      onSaved();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="card">
      <h3>{question ? "Sửa câu hỏi" : "Thêm câu hỏi"}</h3>
      <div className="row">
        <div className="field">
          <label>Loại</label>
          <select value={type} onChange={(e) => setType(e.target.value as "mc" | "tf" | "sa")} disabled={!!question}>
            <option value="mc">Trắc nghiệm (A/B/C/D - chọn 1)</option>
            <option value="tf">Đúng/Sai (4 ý a, b, c, d)</option>
            <option value="sa">Trả lời ngắn (số/chuỗi)</option>
          </select>
        </div>
        <div className="field">
          <label>Phần/Chủ đề</label>
          <input className="input" value={section} onChange={(e) => setSection(e.target.value)} />
        </div>
        <div className="field">
          <label>Điểm</label>
          <input
            className="input"
            type="number"
            step={0.25}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="field">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ marginBottom: 0 }}>Nội dung câu hỏi</label>
          <MediaButtons onInsert={(s) => setText((t) => (t ? t + " " + s : s))} />
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 100 }} />
        {text && (
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Xem trước: <RichText text={text} />
          </div>
        )}
      </div>

      {type === "sa" ? (
        <div className="field">
          <label>Đáp án đúng (số hoặc chuỗi ngắn)</label>
          <input
            className="input"
            value={saAnswer}
            onChange={(e) => setSaAnswer(e.target.value)}
            placeholder="Ví dụ: 4 hoặc 1234"
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            So sánh không phân biệt hoa/thường và bỏ qua khoảng trắng — "1 2 3 4" được tính bằng "1234".
          </div>
        </div>
      ) : type === "mc" ? (
        <div className="stack">
          {["A", "B", "C", "D"].map((letter) => (
            <div key={letter} className="row" style={{ alignItems: "center" }}>
              <div style={{ flex: "0 0 auto", minWidth: 80 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 0 }}>
                  <input
                    type="radio"
                    name="mcAnswer"
                    checked={mcAnswer === letter}
                    onChange={() => setMcAnswer(letter)}
                  />
                  <strong>{letter}.</strong>
                </label>
              </div>
              <input
                className="input"
                value={mcOptions[letter] || ""}
                onChange={(e) => setMcOptions({ ...mcOptions, [letter]: e.target.value })}
              />
              <MediaButtons
                size="xs"
                onInsert={(s) =>
                  setMcOptions((m) => ({ ...m, [letter]: (m[letter] || "") + (m[letter] ? " " : "") + s }))
                }
              />
            </div>
          ))}
          <div className="muted" style={{ fontSize: 12 }}>
            Đáp án đúng hiện tại: <strong>{mcAnswer}</strong>. Bấm vào nút radio bên trái để đổi đáp án nếu hệ thống nhận diện sai.
          </div>
        </div>
      ) : (
        <div className="stack">
          {["a", "b", "c", "d"].map((letter) => (
            <div key={letter} className="row" style={{ alignItems: "center" }}>
              <div style={{ flex: "0 0 auto", minWidth: 100 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    checked={!!tfAnswers[letter]}
                    onChange={(e) => setTfAnswers({ ...tfAnswers, [letter]: e.target.checked })}
                  />
                  <strong>{letter})</strong>{" "}
                  <span className="muted">{tfAnswers[letter] ? "Đúng" : "Sai"}</span>
                </label>
              </div>
              <input
                className="input"
                value={tfStatements[letter] || ""}
                onChange={(e) => setTfStatements({ ...tfStatements, [letter]: e.target.value })}
              />
              <MediaButtons
                size="xs"
                onInsert={(s) =>
                  setTfStatements((m) => ({
                    ...m,
                    [letter]: (m[letter] || "") + (m[letter] ? " " : "") + s,
                  }))
                }
              />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="btn" onClick={save}>
          {question ? "Lưu" : "Thêm"}
        </button>
        <button className="btn secondary" onClick={onCancel}>
          Huỷ
        </button>
      </div>
    </div>
  );
}

function codeStatus(c: ExamCode): { label: string; cls: "success" | "warning" | "danger" } {
  if (c.max_uses === 0) {
    return {
      label: c.uses_count > 0 ? `Đang dùng (${c.uses_count}/∞)` : "Sẵn sàng (∞)",
      cls: c.uses_count > 0 ? "warning" : "success",
    };
  }
  if (c.uses_count >= c.max_uses) return { label: `Hết lượt (${c.uses_count}/${c.max_uses})`, cls: "danger" };
  if (c.uses_count > 0) return { label: `Còn lượt (${c.uses_count}/${c.max_uses})`, cls: "warning" };
  return { label: `Sẵn sàng (0/${c.max_uses})`, cls: "success" };
}

function codeUsesLabel(c: ExamCode): string {
  return c.max_uses === 0 ? `${c.uses_count}/∞` : `${c.uses_count}/${c.max_uses}`;
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilenamePart(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "ma-thi";
}

function exportCodesTxt(codes: ExamCode[], examTitle: string) {
  const header = `Đề: ${examTitle}\nTổng: ${codes.length} mã\nXuất lúc: ${new Date().toLocaleString("vi-VN")}\n\n`;
  const lines = codes.map((c) => {
    const note = c.note ? `\t# ${c.note}` : "";
    return `${c.code}\t(${codeUsesLabel(c)})${note}`;
  });
  const body = header + lines.join("\n") + "\n";
  const blob = new Blob(["\ufeff" + body], { type: "text/plain;charset=utf-8" });
  downloadBlob(`ma-thi-${safeFilenamePart(examTitle)}.txt`, blob);
}

function exportCodesCsv(codes: ExamCode[], examTitle: string) {
  const rows: (string | number)[][] = [
    ["STT", "Mã", "Ghi chú", "Đã dùng", "Tối đa", "Người dùng gần nhất", "Thời điểm dùng gần nhất", "Tạo lúc"],
  ];
  codes.forEach((c, i) => {
    rows.push([
      i + 1,
      c.code,
      c.note || "",
      c.uses_count,
      c.max_uses === 0 ? "Không giới hạn" : c.max_uses,
      c.used_by || "",
      c.used_at ? new Date(c.used_at).toLocaleString("vi-VN") : "",
      new Date(c.created_at).toLocaleString("vi-VN"),
    ]);
  });
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(`ma-thi-${safeFilenamePart(examTitle)}.csv`, blob);
}

function CodesTab({ examId, examTitle }: { examId: number; examTitle: string }) {
  const [codes, setCodes] = useState<ExamCode[]>([]);
  const [count, setCount] = useState(5);
  const [notePrefix, setNotePrefix] = useState("HS-");
  const [bulkMaxUses, setBulkMaxUses] = useState(1);
  const [customCode, setCustomCode] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [customMaxUses, setCustomMaxUses] = useState(1);
  const [editing, setEditing] = useState<{ id: number; note: string; maxUses: number } | null>(null);

  const load = useCallback(async () => {
    const r = await api.listCodes(examId);
    setCodes(r);
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    await api.generateCodes(examId, count, notePrefix, bulkMaxUses);
    load();
  }
  async function addCustom() {
    if (!customCode.trim()) return;
    await api.addCode(examId, customCode, customNote, customMaxUses);
    setCustomCode("");
    setCustomNote("");
    load();
  }
  async function saveEdit() {
    if (!editing) return;
    await api.updateCode(editing.id, { note: editing.note, max_uses: editing.maxUses });
    setEditing(null);
    load();
  }

  const usedAtLeastOnce = codes.filter((c) => c.uses_count > 0).length;

  return (
    <div>
      <div className="card">
        <h3>Sinh mã thi hàng loạt</h3>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ maxWidth: 140 }}>
            <label>Số lượng</label>
            <input
              className="input"
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Ghi chú tiền tố (tuỳ chọn)</label>
            <input
              className="input"
              value={notePrefix}
              onChange={(e) => setNotePrefix(e.target.value)}
              placeholder="VD: 12A1-"
            />
          </div>
          <div className="field" style={{ maxWidth: 180 }}>
            <label>Số lần sử dụng / mã</label>
            <input
              className="input"
              type="number"
              min={0}
              max={10000}
              value={bulkMaxUses}
              onChange={(e) => setBulkMaxUses(Math.max(0, Number(e.target.value) || 0))}
              title="0 = không giới hạn"
            />
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              0 = không giới hạn lượt
            </div>
          </div>
          <div className="field" style={{ flex: "0 0 auto" }}>
            <button className="btn" onClick={generate} style={{ marginBottom: 0 }}>
              + Sinh {count} mã
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Thêm mã tự chọn</h3>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field">
            <label>Mã (chữ hoa/số, không dấu)</label>
            <input
              className="input"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="VD: HSLA01"
            />
          </div>
          <div className="field">
            <label>Ghi chú (tên học sinh, lớp…)</label>
            <input className="input" value={customNote} onChange={(e) => setCustomNote(e.target.value)} />
          </div>
          <div className="field" style={{ maxWidth: 180 }}>
            <label>Số lần sử dụng</label>
            <input
              className="input"
              type="number"
              min={0}
              max={10000}
              value={customMaxUses}
              onChange={(e) => setCustomMaxUses(Math.max(0, Number(e.target.value) || 0))}
              title="0 = không giới hạn"
            />
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              0 = không giới hạn lượt
            </div>
          </div>
          <div className="field" style={{ flex: "0 0 auto" }}>
            <button className="btn secondary" onClick={addCustom} style={{ marginBottom: 0 }}>
              + Thêm
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div
          style={{
            padding: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>Danh sách mã</h3>
            <div className="muted">
              Tổng {codes.length} mã • Đã có lượt dùng {usedAtLeastOnce}/{codes.length}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn sm secondary"
              disabled={codes.length === 0}
              onClick={() => exportCodesTxt(codes, examTitle)}
              title="Xuất danh sách mã ra file .txt (UTF-8)"
            >
              ⬇ Xuất .txt
            </button>
            <button
              className="btn sm secondary"
              disabled={codes.length === 0}
              onClick={() => exportCodesCsv(codes, examTitle)}
              title="Xuất danh sách mã ra file .csv mở được bằng Excel"
            >
              ⬇ Xuất Excel (.csv)
            </button>
          </div>
        </div>
        {codes.length === 0 ? (
          <div className="muted" style={{ padding: 16 }}>Chưa có mã nào. Hãy sinh mã ở trên.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th>Lượt dùng</th>
                <th>Người dùng gần nhất</th>
                <th>Lần dùng gần nhất</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const st = codeStatus(c);
                const isEditing = editing?.id === c.id;
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="badge mono">{c.code}</span>
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="input"
                          value={editing!.note}
                          onChange={(e) => setEditing({ ...editing!, note: e.target.value })}
                          style={{ minWidth: 140 }}
                        />
                      ) : (
                        c.note || "—"
                      )}
                    </td>
                    <td>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="input"
                          type="number"
                          min={0}
                          max={10000}
                          value={editing!.maxUses}
                          onChange={(e) =>
                            setEditing({ ...editing!, maxUses: Math.max(0, Number(e.target.value) || 0) })
                          }
                          style={{ width: 80 }}
                          title="0 = không giới hạn"
                        />
                      ) : (
                        codeUsesLabel(c)
                      )}
                    </td>
                    <td>{c.used_by || "—"}</td>
                    <td>{c.used_at ? new Date(c.used_at).toLocaleString("vi-VN") : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {isEditing ? (
                          <>
                            <button className="btn sm" onClick={saveEdit}>
                              Lưu
                            </button>
                            <button className="btn sm secondary" onClick={() => setEditing(null)}>
                              Huỷ
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn sm secondary"
                              onClick={() => setEditing({ id: c.id, note: c.note || "", maxUses: c.max_uses })}
                            >
                              Sửa
                            </button>
                            {c.uses_count > 0 && (
                              <button
                                className="btn sm secondary"
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      "Reset mã này về 0 lượt dùng? (Lượt làm bài đã ghi nhận vẫn được giữ.)",
                                    )
                                  )
                                    return;
                                  await api.resetCode(c.id);
                                  load();
                                }}
                              >
                                Reset
                              </button>
                            )}
                            <button
                              className="btn sm danger"
                              onClick={async () => {
                                if (!confirm("Xoá mã này?")) return;
                                await api.deleteCode(c.id);
                                load();
                              }}
                            >
                              Xoá
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ResultsTab({ examId }: { examId: number }) {
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [detail, setDetail] = useState<AttemptResult | null>(null);

  const load = useCallback(async () => {
    const r = await api.listAttempts(examId);
    setRows(r);
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  const submitted = useMemo(() => rows.filter((r) => r.submitted_at), [rows]);

  if (detail) {
    return (
      <div className="card">
        <button className="btn sm secondary" onClick={() => setDetail(null)}>
          ← Về danh sách
        </button>
        <h3 style={{ marginTop: 10 }}>
          {detail.student_name}
          {detail.student_class && <span className="muted"> — {detail.student_class}</span>}
        </h3>
        <div className="muted">
          Điểm: <strong className="success-text">{detail.score_on_ten}/10</strong> ({detail.num_correct}/
          {detail.num_questions} câu đúng) — Thời gian: {Math.round(detail.duration_seconds / 60)} phút
        </div>
        <div className="stack" style={{ marginTop: 14 }}>
          {detail.details.map((d, i) => (
            <div key={d.question_id} className="card" style={{ padding: 12 }}>
              <div>
                <span className="question-number">Câu {i + 1}</span>{" "}
                {d.is_correct ? (
                  <span className="badge success">✓ Đúng (+{d.earned})</span>
                ) : (
                  <span className="badge danger">✗ Sai (+{d.earned})</span>
                )}
              </div>
              <div className="question-text">{d.question}</div>
              {d.type === "mc" && d.options && (
                <div>
                  {Object.entries(d.options).map(([letter, text]) => {
                    const isCorrect = d.correct === letter;
                    const isYour = d.your_answer === letter;
                    return (
                      <div
                        key={letter}
                        className={`option ${isCorrect ? "correct-highlight" : isYour ? "wrong-highlight" : ""}`}
                      >
                        <span className="letter">{letter}.</span>
                        <span style={{ flex: 1 }}>{text}</span>
                        {isCorrect && <span className="badge success">Đáp án</span>}
                        {isYour && !isCorrect && <span className="badge danger">Bạn chọn</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              {d.type === "sa" && (
                <div className={`option ${d.is_correct ? "correct-highlight" : "wrong-highlight"}`}>
                  <span style={{ flex: 1 }}>
                    <span className="muted">Đáp án của HS: </span>
                    <strong>{(d.your_answer as string) || "—"}</strong>
                  </span>
                  <span className="muted">Đáp án đúng: <strong>{(d.correct as string) || "—"}</strong></span>
                </div>
              )}
              {d.type === "tf" && d.statements && (
                <div>
                  {Object.entries(d.statements).map(([letter, text]) => {
                    const correct = (d.correct as Record<string, boolean>)[letter];
                    const yours = (d.your_answer as Record<string, boolean>)[letter];
                    const ok = correct === yours;
                    return (
                      <div
                        key={letter}
                        className={`option ${ok ? "correct-highlight" : "wrong-highlight"}`}
                      >
                        <span className="letter">{letter})</span>
                        <span style={{ flex: 1 }}>{text}</span>
                        <span className="muted">Đáp án: {correct ? "Đúng" : "Sai"}</span>
                        <span className="muted">• Bạn: {yours === undefined ? "—" : yours ? "Đúng" : "Sai"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: 16, display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>Bảng kết quả ({submitted.length} đã nộp)</h3>
        <button className="btn sm secondary" onClick={load}>Làm mới</button>
      </div>
      {rows.length === 0 ? (
        <div className="muted" style={{ padding: 16 }}>Chưa có học sinh nào làm bài.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Họ tên</th>
              <th>Lớp</th>
              <th>Mã</th>
              <th>Điểm (thang 10)</th>
              <th>Điểm thô</th>
              <th>Nộp lúc</th>
              <th>Thời gian</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td>{r.student_name}</td>
                <td>{r.student_class || "—"}</td>
                <td>{r.code ? <span className="badge mono">{r.code}</span> : "—"}</td>
                <td>
                  <strong>{r.score_on_ten}</strong>
                </td>
                <td>
                  {r.score}/{r.total_points}
                </td>
                <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString("vi-VN") : <span className="badge warning">Chưa nộp</span>}</td>
                <td>{Math.round(r.duration_seconds / 60)} phút</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    {r.submitted_at && (
                      <button
                        className="btn sm secondary"
                        onClick={async () => {
                          const d = await api.getAttempt(r.id);
                          setDetail(d);
                        }}
                      >
                        Xem
                      </button>
                    )}
                    <button
                      className="btn sm danger"
                      onClick={async () => {
                        if (!confirm("Xoá lượt làm bài này? Không thể khôi phục.")) return;
                        await api.deleteAttempt(r.id);
                        load();
                      }}
                    >
                      Xoá
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
