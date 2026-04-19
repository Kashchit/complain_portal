import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ShieldLogo = () => (
  <svg className="w-9 h-9 text-brand drop-shadow-md" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l8 4v6c0 5-3.4 9.2-8 10-4.6-.8-8-5-8-10V6l8-4zm-1 6v6h2V8h-2zm0 8v2h2v-2h-2z" />
  </svg>
);

export default function Layout() {
  const { isAuthenticated, role, profile, customerToken, logout } = useAuth();
  const canFileTicket = isAuthenticated && role === "customer" && Boolean(customerToken);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="sticky top-0 z-50 nav-shell animate-nav-drift animate-fade-in">
        <nav className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="transition-transform duration-200 group-hover:scale-105">
              <ShieldLogo />
            </span>
            <span className="text-lg font-bold nav-logo-text group-hover:text-brand-soft transition-colors duration-200">
              ComplainHub
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            <NavLink to="/" end className={({ isActive }) => `nav-pill ${isActive ? "nav-pill-active" : ""}`}>
              Home
            </NavLink>
            {isAuthenticated && role === "admin" && (
              <NavLink to="/admin" className={({ isActive }) => `nav-pill ${isActive ? "nav-pill-active" : ""}`}>
                Admin
              </NavLink>
            )}
            {isAuthenticated && role === "customer" && customerToken && (
              <NavLink to="/dashboard" className={({ isActive }) => `nav-pill ${isActive ? "nav-pill-active" : ""}`}>
                My tickets
              </NavLink>
            )}
            {canFileTicket && (
              <NavLink to="/submit" className={({ isActive }) => `nav-pill ${isActive ? "nav-pill-active" : ""}`}>
                New ticket
              </NavLink>
            )}
            <NavLink to="/track" className={({ isActive }) => `nav-pill ${isActive ? "nav-pill-active" : ""}`}>
              Track
            </NavLink>
            {!isAuthenticated ? (
              <NavLink to="/login" className={({ isActive }) => `nav-pill ${isActive ? "nav-pill-active" : ""}`}>
                Login
              </NavLink>
            ) : (
              <button
                type="button"
                onClick={logout}
                className="nav-pill text-slate-300 border border-transparent hover:border-white/20"
              >
                Logout
                <span className="hidden sm:inline text-slate-400">
                  {" "}
                  ({profile?.name || profile?.username || "—"})
                </span>
              </button>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200/80 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
          <p>
            © {new Date().getFullYear()} ComplainHub · Secure ticket management · v1.0.0
          </p>
        </div>
      </footer>
    </div>
  );
}
