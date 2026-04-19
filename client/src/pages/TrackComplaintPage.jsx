import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import StatusTimeline from "../components/StatusTimeline";
import { useToast } from "../context/ToastContext";

export default function TrackComplaintPage() {
  const [params] = useSearchParams();
  const initialRef = params.get("ref") || "";
  const [ref, setRef] = useState(initialRef);
  const [complaint, setComplaint] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const { showToast } = useToast();

  const searchComplaint = async () => {
    try {
      setNotFound(false);
      const response = await api.get(`/complaints/${ref.trim()}`);
      setComplaint(response.data.complaint);
    } catch (error) {
      if (error.response?.status === 404) {
        setComplaint(null);
        setNotFound(true);
        return;
      }
      showToast("Unable to fetch ticket details");
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 md:py-16 animate-fade-in">
      <div className="dashboard-card p-8 md:p-10 shadow-lg text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-soft flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Track your ticket</h1>
        <p className="text-sm text-gray-500 mt-2">
          Enter the reference you received after filing a ticket (for example <span className="font-mono text-brand">CMP-YYYYMMDD-XXXXXX</span>).
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            className="input-base flex-1 text-left"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="CMP-20260420-ABC123"
          />
          <button type="button" className="btn-primary shrink-0 inline-flex items-center justify-center gap-2" onClick={searchComplaint}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
            </svg>
            Track
          </button>
        </div>
      </div>

      {complaint && (
        <div className="dashboard-card p-6 md:p-8 mt-6 text-left space-y-2">
          <h2 className="text-xl font-bold text-brand font-mono">{complaint.ref_number}</h2>
          <p className="text-sm">
            <span className="text-gray-500">Name:</span> <span className="text-gray-900">{complaint.name}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Email:</span> <span className="text-gray-900">{complaint.email}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Phone:</span> <span className="text-gray-900">{complaint.phone}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Category:</span> <span className="text-gray-900">{complaint.category}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Subject:</span> <span className="text-gray-900">{complaint.subject}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Description:</span> <span className="text-gray-900">{complaint.description}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Priority:</span> <span className="text-gray-900">{complaint.priority}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Status:</span> <span className="text-gray-900 font-medium">{complaint.status}</span>
          </p>
          <StatusTimeline status={complaint.status} />
          {complaint.attachment_mime && complaint.attachment_base64 && (
            <div className="pt-4 border-t border-slate-100 mt-4">
              <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Attachment</p>
              {complaint.attachment_mime === "application/pdf" ? (
                <iframe
                  title="Ticket PDF"
                  className="w-full h-[min(60vh,420px)] rounded-lg border border-slate-200 bg-slate-50"
                  src={`data:${complaint.attachment_mime};base64,${complaint.attachment_base64}`}
                />
              ) : (
                <img
                  alt="Ticket attachment"
                  className="max-w-full rounded-lg border border-slate-200 max-h-[420px] object-contain bg-slate-50"
                  src={`data:${complaint.attachment_mime};base64,${complaint.attachment_base64}`}
                />
              )}
            </div>
          )}
        </div>
      )}

      {notFound && (
        <div className="dashboard-card p-10 mt-6 text-center">
          <div className="text-5xl mb-2" aria-hidden>
            📭
          </div>
          <h2 className="text-xl font-bold text-gray-900">No ticket found</h2>
          <p className="text-gray-600 mt-2 text-sm">Double-check the reference and try again.</p>
        </div>
      )}
    </div>
  );
}
