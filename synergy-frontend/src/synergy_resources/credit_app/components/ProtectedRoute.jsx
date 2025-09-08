import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { authed } = useAuth();
  const loc = useLocation();
  return authed ? <Outlet /> : <Navigate to="/login" state={{ from: loc.pathname }} replace />;
}
