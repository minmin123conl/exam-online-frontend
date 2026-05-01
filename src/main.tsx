import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.css";
import App from "./App";
import Home from "./pages/Home";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import ChangePassword from "./pages/ChangePassword";
import ExamEditor from "./pages/ExamEditor";
import StudentStart from "./pages/StudentStart";
import StudentExam from "./pages/StudentExam";
import StudentResult from "./pages/StudentResult";
import LeaderboardPage from "./pages/Leaderboard";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/change-password" element={<ChangePassword />} />
          <Route path="admin/exams/:examId" element={<ExamEditor />} />
          <Route path="join" element={<StudentStart />} />
          <Route path="exam/:attemptId" element={<StudentExam />} />
          <Route path="result/:attemptId" element={<StudentResult />} />
          <Route path="leaderboard/:examId" element={<LeaderboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
