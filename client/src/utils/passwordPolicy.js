/** Client-side checks — must match server rules in routes/auth.js */
export const PASSWORD_MIN_LENGTH = 12;

export const getPasswordChecks = (password) => {
  const p = String(password || "");
  return {
    length: p.length >= PASSWORD_MIN_LENGTH,
    lower: /[a-z]/.test(p),
    upper: /[A-Z]/.test(p),
    digit: /\d/.test(p),
    special: /[^A-Za-z0-9]/.test(p)
  };
};

export const passwordPolicyMet = (password) => {
  const c = getPasswordChecks(password);
  return c.length && c.lower && c.upper && c.digit && c.special;
};
