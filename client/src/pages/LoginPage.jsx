import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import PasswordField from "../components/PasswordField";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getPasswordChecks, passwordPolicyMet, PASSWORD_MIN_LENGTH } from "../utils/passwordPolicy";

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginAdmin, loginCustomer } = useAuth();
  const { showToast } = useToast();
  const [role, setRole] = useState("customer");
  const [customerTab, setCustomerTab] = useState("signin");

  const [adminData, setAdminData] = useState({ username: "", password: "" });

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  const [regEmail, setRegEmail] = useState("");
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtp, setRegOtp] = useState("");
  const [regName, setRegName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regSending, setRegSending] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);

  const pwChecks = useMemo(() => getPasswordChecks(regPassword), [regPassword]);
  const pwMatch = regPassword === regConfirm && regConfirm.length > 0;
  const canRegister = passwordPolicyMet(regPassword) && pwMatch && regOtp.length === 6 && regName.trim().length >= 3;

  const handleAdminLogin = () => {
    const ok = loginAdmin(adminData.username, adminData.password);
    if (!ok) {
      showToast("Invalid admin credentials");
      return;
    }
    navigate("/admin");
  };

  const handleCustomerSignIn = async () => {
    if (!signInEmail.trim() || !signInPassword) {
      showToast("Enter email and password");
      return;
    }
    setSignInLoading(true);
    try {
      const { data } = await api.post("/auth/customer/login", {
        email: signInEmail.trim(),
        password: signInPassword
      });
      loginCustomer({
        name: data.profile.displayName,
        email: data.profile.email
      });
      showToast("Welcome back", "success");
      navigate("/dashboard");
    } catch (error) {
      showToast(error.response?.data?.message || "Sign in failed");
    } finally {
      setSignInLoading(false);
    }
  };

  const sendRegistrationOtp = async () => {
    if (!regEmail.trim()) {
      showToast("Enter your email");
      return;
    }
    setRegSending(true);
    try {
      await api.post("/auth/customer/send-registration-otp", { email: regEmail.trim() });
      setRegOtpSent(true);
      showToast("OTP sent — valid for 5 minutes", "success");
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || "Could not send OTP";
      showToast(msg);
      if (error.response?.status === 409) {
        setCustomerTab("signin");
        setSignInEmail(regEmail.trim());
      }
    } finally {
      setRegSending(false);
    }
  };

  const completeRegistration = async () => {
    if (!canRegister) {
      showToast("Fix password requirements and matching fields");
      return;
    }
    setRegSubmitting(true);
    try {
      const { data } = await api.post("/auth/customer/register", {
        email: regEmail.trim(),
        code: regOtp.trim(),
        name: regName.trim(),
        password: regPassword,
        confirmPassword: regConfirm
      });
      loginCustomer({
        name: data.profile.displayName,
        email: data.profile.email
      });
      showToast("Account created — you are signed in", "success");
      navigate("/dashboard");
    } catch (error) {
      showToast(error.response?.data?.error || "Registration failed");
    } finally {
      setRegSubmitting(false);
    }
  };

  const ReqRow = ({ ok, text }) => (
    <li className={`flex items-center gap-2 text-xs ${ok ? "text-emerald-700" : "text-slate-500"}`}>
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${ok ? "bg-emerald-100" : "bg-slate-200"}`}>
        {ok ? "✓" : ""}
      </span>
      {text}
    </li>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-12 animate-fade-in">
      <div className="card-base p-8 shadow-xl border border-slate-100/90 ring-1 ring-slate-900/5">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Account access</h1>
        <p className="text-sm text-gray-500 mt-1">
          Customers: sign in with email and password. New here? Create an account (one-time email OTP, then set a strong password).
        </p>

        <div className="grid grid-cols-2 gap-2 mt-6">
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
              role === "customer" ? "bg-brand text-white shadow-md scale-[1.02]" : "bg-slate-100 text-gray-700 hover:bg-slate-200"
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setRole("admin")}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
              role === "admin" ? "bg-brand text-white shadow-md scale-[1.02]" : "bg-slate-100 text-gray-700 hover:bg-slate-200"
            }`}
          >
            Admin
          </button>
        </div>

        {role === "customer" ? (
          <div className="mt-6">
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => setCustomerTab("signin")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                  customerTab === "signin" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setCustomerTab("register")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                  customerTab === "register" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Create account
              </button>
            </div>

            {customerTab === "signin" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    className="input-base"
                    type="email"
                    autoComplete="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <PasswordField
                  label="Password"
                  value={signInPassword}
                  onChange={setSignInPassword}
                  autoComplete="current-password"
                />
                <button type="button" disabled={signInLoading} onClick={handleCustomerSignIn} className="btn-primary w-full">
                  {signInLoading ? "Signing in…" : "Sign in"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-slate-600 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 leading-relaxed">
                  <strong className="text-slate-800">Security:</strong> we email a one-time code valid for <strong>5 minutes</strong> to verify your
                  address. Passwords are never stored in plain text. Use a unique password with upper, lower, number, and symbol — this blocks common
                  credential attacks (OWASP).
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    className="input-base"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={regOtpSent}
                  />
                </div>
                {!regOtpSent ? (
                  <button type="button" disabled={regSending} onClick={sendRegistrationOtp} className="btn-primary w-full">
                    {regSending ? "Sending…" : "Send verification code"}
                  </button>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">6-digit code</label>
                      <input
                        className="input-base tracking-widest"
                        inputMode="numeric"
                        maxLength={6}
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="From email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                      <input className="input-base" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Your name" />
                    </div>
                    <PasswordField
                      label="Password"
                      value={regPassword}
                      onChange={setRegPassword}
                      autoComplete="new-password"
                      placeholder={`${PASSWORD_MIN_LENGTH}+ chars with A a 1 @`}
                    />
                    <ul className="rounded-xl border border-slate-100 bg-white px-3 py-2 space-y-1">
                      <ReqRow ok={pwChecks.length} text={`At least ${PASSWORD_MIN_LENGTH} characters`} />
                      <ReqRow ok={pwChecks.upper} text="One uppercase letter" />
                      <ReqRow ok={pwChecks.lower} text="One lowercase letter" />
                      <ReqRow ok={pwChecks.digit} text="One number" />
                      <ReqRow ok={pwChecks.special} text="One special character (!@#$…)" />
                      <ReqRow ok={pwMatch} text="Matches confirm password" />
                    </ul>
                    <PasswordField
                      label="Confirm password"
                      value={regConfirm}
                      onChange={setRegConfirm}
                      autoComplete="new-password"
                      error={regConfirm && !pwMatch ? "Passwords must match" : undefined}
                    />
                    <button
                      type="button"
                      disabled={regSubmitting || !canRegister}
                      onClick={completeRegistration}
                      className="btn-primary w-full"
                    >
                      {regSubmitting ? "Creating account…" : "Create account & sign in"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Demo admin credentials</p>
              <p className="mt-1">
                Username: <span className="font-mono font-medium">admin</span>
              </p>
              <p>
                Password: <span className="font-mono font-medium">admin123</span>
              </p>
              <p className="mt-2 text-xs text-amber-800">
                Set <span className="font-mono">VITE_ADMIN_KEY</span> in <span className="font-mono">client/.env</span> to match{" "}
                <span className="font-mono">ADMIN_KEY</span>. Admins <strong>cannot</strong> file tickets — only manage the queue.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                className="input-base"
                value={adminData.username}
                onChange={(e) => setAdminData((p) => ({ ...p, username: e.target.value }))}
                autoComplete="username"
              />
            </div>
            <PasswordField
              label="Password"
              value={adminData.password}
              onChange={(v) => setAdminData((p) => ({ ...p, password: v }))}
              autoComplete="current-password"
            />
            <button type="button" onClick={handleAdminLogin} className="btn-primary w-full">
              Sign in as admin
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
