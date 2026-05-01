const DEFAULT_API = "http://localhost:8000";
export const API_BASE: string = ((import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL || DEFAULT_API).replace(/\/$/, "");

const TOKEN_KEY = "exam_admin_token";
const ROLE_KEY = "exam_admin_role";
const USERNAME_KEY = "exam_admin_username";
const MUST_CHANGE_KEY = "exam_admin_must_change";

export type AdminRole = "super" | "manager" | "viewer";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getRole(): AdminRole {
  return (localStorage.getItem(ROLE_KEY) as AdminRole) || "super";
}

export function getUsername(): string {
  return localStorage.getItem(USERNAME_KEY) || "";
}

export function getMustChange(): boolean {
  return localStorage.getItem(MUST_CHANGE_KEY) === "1";
}

export function setMustChange(v: boolean) {
  localStorage.setItem(MUST_CHANGE_KEY, v ? "1" : "0");
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(MUST_CHANGE_KEY);
}

async function request<T>(path: string, opts: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || body.message || JSON.stringify(body);
    } catch {
      /* empty */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  // Admin auth
  async login(username: string, password: string) {
    const form = new URLSearchParams();
    form.set("username", username);
    form.set("password", password);
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!res.ok) {
      let msg = "Đăng nhập thất bại";
      try {
        msg = (await res.json()).detail || msg;
      } catch {
        /* empty */
      }
      throw new Error(msg);
    }
    const data = (await res.json()) as {
      access_token: string;
      role: AdminRole;
      must_change_password: boolean;
      username: string;
    };
    setToken(data.access_token);
    localStorage.setItem(ROLE_KEY, data.role || "super");
    localStorage.setItem(USERNAME_KEY, data.username || username);
    setMustChange(!!data.must_change_password);
    return data;
  },
  me() {
    return request<{ username: string; role: AdminRole; must_change_password: boolean }>(
      "/api/admin/me",
      {},
      true,
    );
  },
  // Admin user management (super only)
  listAdminUsers() {
    return request<AdminUserOut[]>("/api/admin/users", {}, true);
  },
  createAdminUser(body: { username: string; password: string; role: AdminRole }) {
    return request<AdminUserOut>("/api/admin/users", { method: "POST", body: JSON.stringify(body) }, true);
  },
  updateAdminUser(id: number, body: { role?: AdminRole; new_password?: string }) {
    return request<AdminUserOut>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }, true);
  },
  deleteAdminUser(id: number) {
    return request<{ ok: boolean }>(`/api/admin/users/${id}`, { method: "DELETE" }, true);
  },
  changePassword(old_password: string, new_password: string) {
    return request<{ ok: boolean }>(
      "/api/admin/change-password",
      { method: "POST", body: JSON.stringify({ old_password, new_password }) },
      true,
    );
  },
  // Exams
  listExams() {
    return request<ExamSummary[]>("/api/admin/exams", {}, true);
  },
  createExam(body: ExamIn) {
    return request<ExamSummary>("/api/admin/exams", { method: "POST", body: JSON.stringify(body) }, true);
  },
  getExam(id: number) {
    return request<ExamFull>(`/api/admin/exams/${id}`, {}, true);
  },
  updateExam(id: number, body: ExamIn) {
    return request<ExamSummary>(`/api/admin/exams/${id}`, { method: "PUT", body: JSON.stringify(body) }, true);
  },
  deleteExam(id: number) {
    return request<{ ok: boolean }>(`/api/admin/exams/${id}`, { method: "DELETE" }, true);
  },
  duplicateExam(id: number) {
    return request<ExamSummary>(`/api/admin/exams/${id}/duplicate`, { method: "POST" }, true);
  },
  async uploadExamDocx(
    file: File,
    meta: { title?: string; duration_minutes?: number; description?: string } = {},
  ): Promise<{
    exam: ExamSummary;
    stats: { num_mc: number; num_tf: number; num_sa?: number; missing_answers: number };
    warnings: string[];
  }> {
    const fd = new FormData();
    fd.append("file", file);
    if (meta.title) fd.append("title", meta.title);
    if (meta.description) fd.append("description", meta.description);
    if (meta.duration_minutes) fd.append("duration_minutes", String(meta.duration_minutes));
    const t = getToken();
    const res = await fetch(`${API_BASE}/api/admin/exams/upload`, {
      method: "POST",
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: fd,
    });
    if (!res.ok) {
      let msg = "Tải lên thất bại";
      try { msg = (await res.json()).detail || msg; } catch { /* empty */ }
      throw new Error(msg);
    }
    return await res.json();
  },
  async uploadImage(file: File): Promise<{ url: string }> {
    const fd = new FormData();
    fd.append("file", file);
    const t = getToken();
    const res = await fetch(`${API_BASE}/api/admin/uploads/image`, {
      method: "POST",
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: fd,
    });
    if (!res.ok) {
      let msg = "Tải ảnh thất bại";
      try { msg = (await res.json()).detail || msg; } catch { /* empty */ }
      throw new Error(msg);
    }
    return await res.json();
  },
  // Questions
  addQuestion(examId: number, body: QuestionIn) {
    return request<Question>(`/api/admin/exams/${examId}/questions`, { method: "POST", body: JSON.stringify(body) }, true);
  },
  updateQuestion(questionId: number, body: QuestionIn) {
    return request<Question>(`/api/admin/questions/${questionId}`, { method: "PUT", body: JSON.stringify(body) }, true);
  },
  deleteQuestion(questionId: number) {
    return request<{ ok: boolean }>(`/api/admin/questions/${questionId}`, { method: "DELETE" }, true);
  },
  // Codes
  listCodes(examId: number) {
    return request<ExamCode[]>(`/api/admin/exams/${examId}/codes`, {}, true);
  },
  generateCodes(examId: number, count: number, note_prefix = "", max_uses = 1) {
    return request<ExamCode[]>(
      `/api/admin/exams/${examId}/codes/generate`,
      { method: "POST", body: JSON.stringify({ count, note_prefix, max_uses }) },
      true,
    );
  },
  addCode(examId: number, code: string, note = "", max_uses = 1) {
    return request<ExamCode>(
      `/api/admin/exams/${examId}/codes/custom`,
      { method: "POST", body: JSON.stringify({ code, note, max_uses }) },
      true,
    );
  },
  updateCode(codeId: number, body: { note?: string; max_uses?: number }) {
    return request<ExamCode>(
      `/api/admin/codes/${codeId}`,
      { method: "PATCH", body: JSON.stringify(body) },
      true,
    );
  },
  deleteCode(codeId: number) {
    return request<{ ok: boolean }>(`/api/admin/codes/${codeId}`, { method: "DELETE" }, true);
  },
  resetCode(codeId: number) {
    return request<{ ok: boolean }>(`/api/admin/codes/${codeId}/reset`, { method: "POST" }, true);
  },
  // Attempts (admin)
  listAttempts(examId: number) {
    return request<AttemptRow[]>(`/api/admin/exams/${examId}/attempts`, {}, true);
  },
  getAttempt(attemptId: number) {
    return request<AttemptResult>(`/api/admin/attempts/${attemptId}`, {}, true);
  },
  deleteAttempt(attemptId: number) {
    return request<{ ok: boolean }>(`/api/admin/attempts/${attemptId}`, { method: "DELETE" }, true);
  },
  // Student
  listActiveExams() {
    return request<ActiveExam[]>("/api/exams/active");
  },
  startExam(code: string, student_name: string, student_class = "") {
    return request<StartExamResponse>("/api/exam/start", {
      method: "POST",
      body: JSON.stringify({ code, student_name, student_class }),
    });
  },
  submitExam(attempt_id: number, answers: Record<string, unknown>) {
    return request<AttemptResult>("/api/exam/submit", {
      method: "POST",
      body: JSON.stringify({ attempt_id, answers }),
    });
  },
  getResult(attempt_id: number) {
    return request<AttemptResult>(`/api/exam/result/${attempt_id}`);
  },
  getLeaderboard(examId: number) {
    return request<Leaderboard>(`/api/exams/${examId}/leaderboard`);
  },
};

// ===== Types =====
export interface AdminUserOut {
  id: number;
  username: string;
  role: AdminRole;
  must_change_password: boolean;
  created_at: string;
}

export interface ExamIn {
  title: string;
  description: string;
  duration_minutes: number;
  is_active: boolean;
  show_leaderboard: boolean;
  shuffle_mode?: string;
}

export interface ExamSummary extends ExamIn {
  id: number;
  created_at: string;
  num_questions: number;
  num_codes: number;
  num_codes_used: number;
  num_attempts: number;
}

export interface Question {
  id: number;
  type: "mc" | "tf" | "sa";
  section: string;
  order_index: number;
  points: number;
  data: Record<string, unknown>;
}

export interface QuestionIn {
  type: "mc" | "tf" | "sa";
  section: string;
  order_index: number;
  points: number;
  data: Record<string, unknown>;
}

export interface ExamFull extends ExamSummary {
  questions: Question[];
}

export interface ExamCode {
  id: number;
  exam_id: number;
  code: string;
  note: string;
  used_by: string | null;
  used_at: string | null;
  max_uses: number;
  uses_count: number;
  created_at: string;
}

export interface ActiveExam {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
}

export interface PublicQuestionMC {
  id: number;
  type: "mc";
  section: string;
  order_index: number;
  points: number;
  question: string;
  options: Record<string, string>;
}

export interface PublicQuestionTF {
  id: number;
  type: "tf";
  section: string;
  order_index: number;
  points: number;
  question: string;
  statements: Record<string, string>;
}

export interface PublicQuestionSA {
  id: number;
  type: "sa";
  section: string;
  order_index: number;
  points: number;
  question: string;
}

export type PublicQuestion = PublicQuestionMC | PublicQuestionTF | PublicQuestionSA;

export interface StartExamResponse {
  attempt_id: number;
  exam: { id: number; title: string; description: string; duration_minutes: number; show_leaderboard: boolean };
  questions: PublicQuestion[];
  started_at: string;
  duration_minutes: number;
  student_name: string;
}

export interface AttemptDetail {
  question_id: number;
  type: "mc" | "tf" | "sa";
  section: string;
  question: string;
  options?: Record<string, string>;
  statements?: Record<string, string>;
  correct: string | Record<string, boolean>;
  your_answer: string | Record<string, boolean>;
  is_correct: boolean;
  points: number;
  earned: number;
  sub_correct?: Record<string, boolean>;
}

export interface AttemptResult {
  attempt_id: number;
  exam_id: number;
  exam_title: string;
  student_name: string;
  student_class: string;
  score: number;
  total_points: number;
  score_on_ten: number;
  num_correct: number;
  num_questions: number;
  duration_seconds: number;
  submitted_at: string;
  details: AttemptDetail[];
}

export interface AttemptRow {
  id: number;
  student_name: string;
  student_class: string;
  score: number;
  total_points: number;
  score_on_ten: number;
  started_at: string;
  submitted_at: string | null;
  duration_seconds: number;
  code: string | null;
}

export interface LeaderboardEntry {
  attempt_id: number;
  student_name: string;
  student_class: string;
  score: number;
  total_points: number;
  score_on_ten: number;
  submitted_at: string;
  duration_seconds: number;
}

export interface Leaderboard {
  exam_id: number;
  exam_title: string;
  entries: LeaderboardEntry[];
}
