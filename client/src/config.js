export const getApiOrigin = () => {
  const explicit = import.meta.env.VITE_API_ORIGIN;
  if (explicit) {
    return String(explicit).replace(/\/$/, "");
  }
  if (import.meta.env.PROD) {
    return "";
  }
  return "http://localhost:3000";
};
