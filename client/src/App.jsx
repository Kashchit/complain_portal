import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SubmitComplaintPage from "./pages/SubmitComplaintPage";
import SuccessPage from "./pages/SuccessPage";
import TrackComplaintPage from "./pages/TrackComplaintPage";
import AdminPage from "./pages/AdminPage";
import CustomerDashboardPage from "./pages/CustomerDashboardPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowRoles={["customer"]}>
              <CustomerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submit"
          element={
            <ProtectedRoute allowRoles={["customer"]}>
              <SubmitComplaintPage />
            </ProtectedRoute>
          }
        />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/track" element={<TrackComplaintPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
