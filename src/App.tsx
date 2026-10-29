import { Link, Outlet, useLocation } from "react-router-dom";
import { getToken } from "./api";

export default function App() {
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith("/admin");
  const loggedIn = Boolean(getToken());

  return (
    <div>
      <header className="header">
        <Link to="/" className="brand">
          🎓 Thi Online
        </Link>
        <nav>
          <Link to="/">Trang chủ</Link>
          <Link to="/join">Vào thi</Link>
          {isAdminArea && loggedIn ? (
            <Link to="/admin">Quản trị</Link>
          ) : (
            <Link to="/admin/login">Admin</Link>
          )}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
