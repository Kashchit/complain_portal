import { Link, useLocation, useSearchParams } from "react-router-dom";

export default function SuccessPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const ref = params.get("ref") || "N/A";
  const summary = location.state || {};
  const now = new Date().toLocaleString();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-fade-in">
      <div className="dashboard-card p-8 text-center">
        <svg className="mx-auto w-20 h-20 text-green-600 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <h1 className="text-3xl font-bold text-green-600 mt-4">Ticket registered successfully</h1>
        <div className="mt-4 bg-brand-soft rounded-xl p-4 border border-red-100">
          <p className="text-sm text-gray-500">Reference Number</p>
          <p className="text-2xl font-bold text-brand font-mono">{ref}</p>
        </div>
        <div className="dashboard-card mt-6 p-4 text-left">
          <h2 className="font-semibold text-gray-900 mb-3">Submission summary</h2>
          <p>Name: {summary.name || "-"}</p>
          <p>Category: {summary.category || "-"}</p>
          <p>Subject: {summary.subject || "-"}</p>
          <p>Priority: {summary.priority || "-"}</p>
          <p>Date & Time: {now}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Link to={`/track?ref=${ref}`} className="btn-primary">
            Track this ticket
          </Link>
          <Link to="/submit" className="btn-secondary">
            Open another ticket
          </Link>
        </div>
      </div>
    </div>
  );
}
