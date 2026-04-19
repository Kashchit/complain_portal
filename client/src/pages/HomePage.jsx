import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const features = [
  {
    title: "Structured intake",
    text: "Clear categories and priorities so every ticket reaches the right team.",
    icon: "M4 6h16M4 12h10M4 18h7"
  },
  {
    title: "Transparent tracking",
    text: "Reference-based status updates from submission through resolution.",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
  },
  {
    title: "Security by design",
    text: "One-time email OTP at signup, then password sign-in; rate limits and hardened headers.",
    icon: "M12 3l7 4v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V7l7-4z"
  }
];

export default function HomePage() {
  const { isAuthenticated, role, customerToken } = useAuth();
  const canFileTicket = isAuthenticated && role === "customer" && Boolean(customerToken);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 space-y-14 animate-fade-in">
      <section className="text-center max-w-3xl mx-auto">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand mb-3">Support ticket portal</p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
          Raise Your Voice.
          <span className="block text-brand mt-1">Track Your Tickets.</span>
        </h1>
        <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto">
          File, triage, and resolve issues with a security-first workflow. Admins manage the queue; customers own their tickets.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {role === "admin" ? (
            <Link to="/admin" className="btn-primary inline-flex items-center justify-center min-w-[180px]">
              Open admin console
            </Link>
          ) : (
            <Link to={canFileTicket ? "/submit" : "/login"} className="btn-primary inline-flex items-center justify-center min-w-[180px]">
              {canFileTicket ? "New ticket" : "Sign in to file a ticket"}
            </Link>
          )}
          <Link
            to={role === "admin" ? "/track" : isAuthenticated && role === "customer" && customerToken ? "/dashboard" : "/track"}
            className="btn-secondary inline-flex items-center justify-center min-w-[180px]"
          >
            {role === "admin" ? "Track by reference" : isAuthenticated && role === "customer" && customerToken ? "My tickets" : "Track a ticket"}
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        {features.map((item) => (
          <div key={item.title} className="dashboard-card p-6 hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-xl bg-brand-soft flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-7 h-7 text-brand">
                <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-gray-900">{item.title}</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="dashboard-card p-8 md:p-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">How it works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {["Submit", "Review", "Investigate", "Resolve"].map((step, index) => (
            <div key={step} className="relative text-center p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-brand text-white mx-auto mb-3 flex items-center justify-center text-sm font-bold shadow">
                {index + 1}
              </div>
              <p className="font-semibold text-gray-900">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
