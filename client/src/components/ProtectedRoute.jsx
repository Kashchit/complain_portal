import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowRoles, children }) {
  const { isAuthenticated, role, customerToken } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (allowRoles && !allowRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  if (role === "customer" && allowRoles && allowRoles.includes("customer") && !customerToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
