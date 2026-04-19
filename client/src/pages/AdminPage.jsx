import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { getApiOrigin } from "../config";
import StatusTimeline from "../components/StatusTimeline";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const FALLBACK_ADMIN_KEY = "your-secret-admin-key-change-this";

const badgePriority = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-green-100 text-green-700"
};

const badgeStatus = {
  Open: "bg-amber-100 text-amber-700",
  "Under Review": "bg-blue-100 text-blue-700",
  Resolved: "bg-green-100 text-green-700"
};

function TicketAttachment({ mime, base64, ticketRef }) {
  if (!mime || !base64) return null;
  const src = `data:${mime};base64,${base64}`;
  const isPdf = mime === "application/pdf";
  return (
    <div>
      <span className="text-gray-500 block text-xs uppercase mb-2">Attachment</span>
      {isPdf ? (
        <div className="space-y-2">
          <iframe title="Ticket PDF" className="w-full h-[min(70vh,480px)] rounded-xl border border-slate-200 bg-slate-50" src={src} />
          <a href={src} download={`${ticketRef || "ticket"}.pdf`} className="text-sm font-semibold text-brand hover:underline">
            Download PDF
          </a>
        </div>
      ) : (
        <img
          src={src}
          alt="Ticket attachment"
          className="max-w-full max-h-[min(70vh,480px)] rounded-xl border border-slate-200 object-contain bg-slate-50"
        />
      )}
    </div>
  );
}

export default function AdminPage() {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, high_priority: 0 });
  const [insights, setInsights] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [filters, setFilters] = useState({ category: "", status: "", priority: "", search: "" });
  const [deleteId, setDeleteId] = useState(null);
  const [live, setLive] = useState(true);
  const [detail, setDetail] = useState(null);

  const adminKey = import.meta.env.VITE_ADMIN_KEY || FALLBACK_ADMIN_KEY;

  const fetchData = useCallback(async () => {
    const headers = { "X-Admin-Key": adminKey };
    try {
      const [statsRes, complaintsRes, insightsRes] = await Promise.all([
        api.get("/admin/stats", { headers }),
        api.get("/admin/complaints", { headers }),
        api.get("/admin/insights", { headers })
      ]);
      setStats(statsRes.data);
      setComplaints(complaintsRes.data.complaints);
      setInsights(insightsRes.data);
    } catch {
      showToast("Failed to load admin data — check VITE_ADMIN_KEY matches server ADMIN_KEY");
    }
  }, [adminKey, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!live) return undefined;
    const origin = getApiOrigin();
    const url = `${origin}/api/admin/stream?key=${encodeURIComponent(adminKey)}`;
    const es = new EventSource(url);

    const onCreated = () => {
      showToast("New ticket received", "info");
      fetchData();
    };
    const onUpdated = () => {
      showToast("Ticket updated", "info");
      fetchData();
    };
    const onDeleted = () => {
      showToast("Ticket removed", "info");
      fetchData();
    };

    es.addEventListener("complaint_created", onCreated);
    es.addEventListener("complaint_updated", onUpdated);
    es.addEventListener("complaint_deleted", onDeleted);
    es.onerror = () => {
      es.close();
    };
    return () => {
      es.removeEventListener("complaint_created", onCreated);
      es.removeEventListener("complaint_updated", onUpdated);
      es.removeEventListener("complaint_deleted", onDeleted);
      es.close();
    };
  }, [live, adminKey, fetchData, showToast]);

  const displayed = useMemo(() => {
    return complaints.filter((item) => {
      const byCategory = !filters.category || item.category === filters.category;
      const byStatus = !filters.status || item.status === filters.status;
      const byPriority = !filters.priority || item.priority === filters.priority;
      const text = filters.search.toLowerCase();
      const bySearch =
        !text || item.name.toLowerCase().includes(text) || item.ref_number.toLowerCase().includes(text);
      return byCategory && byStatus && byPriority && bySearch;
    });
  }, [complaints, filters]);

  const maxCategoryCount = useMemo(() => {
    if (!insights?.byCategory?.length) return 1;
    return Math.max(...insights.byCategory.map((r) => r.count), 1);
  }, [insights]);

  const openCase = useCallback(
    async (row) => {
      if (!row?.id) return;
      setDetail({ ...row, _loadingFull: true });
      try {
        const { data } = await api.get(`/admin/complaints/${row.id}`, {
          headers: { "X-Admin-Key": adminKey }
        });
        setDetail(data.complaint);
      } catch {
        showToast("Could not load attachment — try again");
        setDetail({ ...row, _loadingFull: false });
      }
    },
    [adminKey, showToast]
  );

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/complaints/${id}/status`, { status }, { headers: { "X-Admin-Key": adminKey } });
      showToast("Status saved — customer emailed", "success");
      fetchData();
      setDetail((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    } catch {
      showToast("Failed to update status");
    }
  };

  const deleteComplaint = async () => {
    const idToRemove = deleteId;
    try {
      await api.delete(`/admin/complaints/${idToRemove}`, { headers: { "X-Admin-Key": adminKey } });
      showToast("Ticket deleted", "success");
      setDeleteId(null);
      setDetail((prev) => (prev && prev.id === idToRemove ? null : prev));
      fetchData();
    } catch {
      showToast("Delete failed");
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Ref No", "Name", "Email", "Category", "Subject", "Priority", "Status", "Description", "Date"],
      ...displayed.map((i) => [
        i.ref_number,
        i.name,
        i.email,
        i.category,
        i.subject,
        i.priority,
        i.status,
        i.description,
        i.created_at
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "tickets-export.csv";
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Operations console</h1>
          <p className="text-sm text-gray-500 mt-1">
            Live ticket queue, analytics, and full case review. Stream stays connected for real-time intake alerts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
            Live stream
          </label>
          <button type="button" className="btn-secondary !py-2 !px-4 text-sm" onClick={fetchData}>
            Refresh all
          </button>
          <button type="button" className="btn-secondary !py-2 !px-4 text-sm" onClick={exportCsv}>
            Export CSV
          </button>
          <button type="button" className="btn-primary !py-2 !px-4 text-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, hint: "All time" },
          { label: "Open pipeline", value: stats.open, hint: "Excl. resolved" },
          { label: "Resolved", value: stats.resolved, hint: "Closed cases" },
          { label: "High priority", value: stats.high_priority, hint: "Needs attention" }
        ].map((item) => (
          <div key={item.label} className="dashboard-card p-5">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{item.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
            <p className="text-xs text-gray-400 mt-2">{item.hint}</p>
          </div>
        ))}
      </div>

      {insights && (
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="dashboard-card p-5 lg:col-span-2">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Volume by category</h2>
            <div className="space-y-3">
              {insights.byCategory?.map((row) => (
                <div key={row.category}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{row.category}</span>
                    <span className="font-semibold text-gray-900">{row.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${(row.count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {!insights.byCategory?.length && <p className="text-sm text-gray-500">No data yet.</p>}
            </div>
          </div>
          <div className="space-y-4">
            <div className="dashboard-card p-5">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Pulse</h2>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex justify-between">
                  <span>Last 7 days (new)</span>
                  <strong className="text-gray-900">{insights.submissionsLast7Days ?? 0}</strong>
                </li>
                <li className="flex justify-between">
                  <span>High priority open</span>
                  <strong className="text-red-600">{insights.highPriorityOpen ?? 0}</strong>
                </li>
                <li className="flex justify-between">
                  <span>Avg. time to resolve</span>
                  <strong className="text-gray-900">{insights.avgResolvedHours ?? 0} h</strong>
                </li>
              </ul>
            </div>
            <div className="dashboard-card p-5">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">By status</h2>
              <div className="flex flex-wrap gap-2">
                {insights.byStatus?.map((s) => (
                  <span key={s.status} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-gray-700">
                    {s.status}: <strong>{s.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {insights?.recentActivity?.length > 0 && (
        <div className="dashboard-card p-5 mb-8">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Recent activity</h2>
          <div className="divide-y divide-slate-100">
            {insights.recentActivity.map((r) => (
              <button
                type="button"
                key={r.id}
                className="w-full text-left py-3 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition"
                onClick={() => {
                  const full = complaints.find((c) => c.id === r.id);
                  openCase(full || r);
                }}
              >
                <span className="font-mono text-xs text-brand">{r.ref_number}</span>
                <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{r.subject}</span>
                {r.attachment_mime ? (
                  <span className="text-xs text-gray-500" title="Attachment">
                    📎
                  </span>
                ) : null}
                <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-card p-4 mb-6 grid md:grid-cols-4 gap-3">
        <input
          className="input-base"
          placeholder="Search by name or ref"
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
        />
        <select className="input-base" value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}>
          <option value="">All categories</option>
          {[...new Set(complaints.map((i) => i.category))].map((cat) => (
            <option key={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select className="input-base" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
          <option value="">All status</option>
          {["Open", "Under Review", "Resolved"].map((s) => (
            <option key={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="input-base" value={filters.priority} onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))}>
          <option value="">All priority</option>
          {["High", "Medium", "Low"].map((p) => (
            <option key={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="dashboard-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Ref", "Name", "Category", "Subject", "File", "Priority", "Status", "Submitted", "Actions"].map((h) => (
                <th key={h} className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="p-3 font-mono text-xs text-gray-800">{row.ref_number}</td>
                <td className="p-3 text-gray-900">{row.name}</td>
                <td className="p-3 text-gray-600">{row.category}</td>
                <td className="p-3 text-gray-800 max-w-[180px] truncate" title={row.subject}>
                  {row.subject}
                </td>
                <td className="p-3 text-center" title={row.attachment_mime || "No file"}>
                  {row.attachment_mime ? "📎" : "—"}
                </td>
                <td className="p-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgePriority[row.priority]}`}>{row.priority}</span>
                </td>
                <td className="p-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStatus[row.status]}`}>{row.status}</span>
                </td>
                <td className="p-3 text-gray-600 whitespace-nowrap text-xs">{new Date(row.created_at).toLocaleString()}</td>
                <td className="p-3 space-y-2 min-w-[220px]">
                  <button type="button" className="btn-primary !py-1.5 !px-3 text-xs w-full" onClick={() => openCase(row)}>
                    Open case
                  </button>
                  <select
                    className="input-base !py-2 text-xs"
                    value={row.status}
                    onChange={(e) => updateStatus(row.id, e.target.value)}
                  >
                    {["Open", "Under Review", "Resolved"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-secondary !py-1.5 !px-3 text-xs w-full" onClick={() => setDeleteId(row.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetail(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-brand">{detail.ref_number}</p>
                <h2 className="text-lg font-bold text-gray-900 mt-1">{detail.subject}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${badgePriority[detail.priority]}`}>{detail.priority}</span>
                  <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${badgeStatus[detail.status]}`}>{detail.status}</span>
                  <span className="text-xs text-gray-500">{detail.category}</span>
                </div>
              </div>
              <button type="button" className="text-gray-400 hover:text-gray-700 text-2xl leading-none" onClick={() => setDetail(null)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4 text-sm">
              {detail._loadingFull && (
                <p className="text-gray-500 text-sm animate-pulse">Loading ticket (including attachment if present)…</p>
              )}
              <div className="grid sm:grid-cols-2 gap-3 text-gray-700">
                <p>
                  <span className="text-gray-500 block text-xs uppercase">Reporter</span>
                  {detail.name}
                </p>
                <p>
                  <span className="text-gray-500 block text-xs uppercase">Email</span>
                  <a href={`mailto:${detail.email}`} className="text-brand hover:underline">
                    {detail.email}
                  </a>
                </p>
                <p>
                  <span className="text-gray-500 block text-xs uppercase">Phone</span>
                  {detail.phone || "—"}
                </p>
                <p>
                  <span className="text-gray-500 block text-xs uppercase">Submitted</span>
                  {new Date(detail.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase mb-1">Full description</span>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-gray-800 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                  {detail.description}
                </div>
              </div>
              <TicketAttachment mime={detail.attachment_mime} base64={detail.attachment_base64} ticketRef={detail.ref_number} />
              <div>
                <span className="text-gray-500 block text-xs uppercase mb-2">Status workflow</span>
                <StatusTimeline status={detail.status} />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <label className="text-xs text-gray-500 self-center mr-1">Set status:</label>
                <select
                  className="input-base !py-2 text-sm max-w-xs"
                  value={detail.status}
                  onChange={(e) => updateStatus(detail.id, e.target.value)}
                >
                  {["Open", "Under Review", "Resolved"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="card-base p-6 w-full max-w-sm border border-slate-100 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Confirm delete</h2>
            <p className="text-gray-600 mt-2 text-sm">This permanently removes the ticket record.</p>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" className="btn-secondary !py-2 !px-4 text-sm" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary !py-2 !px-4 text-sm" onClick={deleteComplaint}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
