import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const statusStyle = {
  Open: "bg-amber-100 text-amber-800",
  "Under Review": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800"
};

const priorityStyle = {
  High: "text-red-600 font-semibold",
  Medium: "text-amber-600 font-medium",
  Low: "text-slate-600"
};

export default function CustomerDashboardPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);



  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/customer/complaints");
      setComplaints(data.complaints || []);
    } catch {
      showToast("Could not load your tickets");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const open = complaints.filter((c) => c.status !== "Resolved").length;
    const resolved = complaints.filter((c) => c.status === "Resolved").length;
    const high = complaints.filter((c) => c.priority === "High" && c.status !== "Resolved").length;
    return { open, resolved, high, total: complaints.length };
  }, [complaints]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-14 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My tickets</h1>
          <p className="text-gray-500 mt-1">
            Signed in as <span className="font-medium text-gray-800">{profile?.email}</span>
            {profile?.name ? ` · ${profile.name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/submit" className="btn-primary !py-2.5 !px-5 text-sm">
            + New ticket
          </Link>
          <button type="button" className="btn-secondary !py-2.5 !px-4 text-sm" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total tickets", value: summary.total },
          { label: "Open / in progress", value: summary.open },
          { label: "Resolved", value: summary.resolved },
          { label: "High priority open", value: summary.high }
        ].map((s) => (
          <div key={s.label} className="dashboard-card p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-12">Loading…</p>
      ) : complaints.length === 0 ? (
        <div className="dashboard-card p-12 text-center border-dashed border-2 border-slate-200">
          <p className="text-gray-600">You have not submitted any tickets yet.</p>
          <Link to="/submit" className="btn-primary inline-block mt-6">
            Open your first ticket
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <article key={c.id} className="dashboard-card p-5 hover:-translate-y-0.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900 text-lg">{c.subject}</h2>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[c.status] || "bg-slate-100"}`}>
                    {c.status}
                  </span>
                  <span className={`text-xs ${priorityStyle[c.priority] || ""}`}>{c.priority} priority</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="font-mono text-brand inline-flex items-center gap-1">
                  {c.ref_number}
                  {c.attachment_mime ? <span title="Has attachment">📎</span> : null}
                </span>
                <span>{c.category}</span>
                <span>{new Date(c.created_at).toLocaleString()}</span>
                <Link to={`/track?ref=${encodeURIComponent(c.ref_number)}`} className="text-brand font-semibold hover:underline ml-auto">
                  Track →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
