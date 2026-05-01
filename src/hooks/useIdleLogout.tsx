import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuth, getToken } from "../api";

const IDLE_LIMIT_MS = 30 * 60 * 1000;
const WARN_BEFORE_MS = 2 * 60 * 1000;

export function useIdleLogout() {
  const nav = useNavigate();
  const [warnSeconds, setWarnSeconds] = useState<number | null>(null);
  const lastActivity = useRef<number>(Date.now());
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    function reset() {
      lastActivity.current = Date.now();
      if (warnSeconds !== null) setWarnSeconds(null);
    }
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    timer.current = window.setInterval(() => {
      if (!getToken()) return;
      const now = Date.now();
      const idle = now - lastActivity.current;
      if (idle >= IDLE_LIMIT_MS) {
        clearAuth();
        nav("/admin/login?reason=idle");
        return;
      }
      const remain = IDLE_LIMIT_MS - idle;
      if (remain <= WARN_BEFORE_MS) {
        setWarnSeconds(Math.max(1, Math.ceil(remain / 1000)));
      } else if (warnSeconds !== null) {
        setWarnSeconds(null);
      }
    }, 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stayActive() {
    lastActivity.current = Date.now();
    setWarnSeconds(null);
  }

  return { warnSeconds, stayActive };
}

export function IdleWarningBanner({
  warnSeconds,
  onStay,
}: {
  warnSeconds: number | null;
  onStay: () => void;
}) {
  if (warnSeconds === null) return null;
  const m = Math.floor(warnSeconds / 60);
  const s = warnSeconds % 60;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "#fef3c7",
        color: "#92400e",
        padding: "10px 16px",
        textAlign: "center",
        zIndex: 1000,
        borderBottom: "1px solid #fde68a",
        fontSize: 14,
      }}
    >
      Bạn sắp bị tự động đăng xuất sau {m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`} do không thao tác.{" "}
      <button className="btn sm" onClick={onStay} style={{ marginLeft: 8 }}>
        Tiếp tục làm việc
      </button>
    </div>
  );
}
