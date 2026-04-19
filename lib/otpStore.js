const store = new Map();

// SECURITY: Short-lived OTP reduces window for interception and replay of registration codes.
const OTP_TTL_MS = 5 * 60 * 1000;

const setOtp = (email, code) => {
  store.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0
  });
};

const verifyOtp = (email, code) => {
  const key = email.toLowerCase();
  const entry = store.get(key);
  if (!entry) return { ok: false, reason: "no_otp" };
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return { ok: false, reason: "expired" };
  }
  entry.attempts += 1;
  if (entry.attempts > 5) {
    store.delete(key);
    return { ok: false, reason: "locked" };
  }
  if (entry.code !== String(code).trim()) {
    return { ok: false, reason: "invalid" };
  }
  store.delete(key);
  return { ok: true };
};

module.exports = {
  setOtp,
  verifyOtp
};
