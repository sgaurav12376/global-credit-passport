import { Navigate, Route, Routes } from "react-router-dom";
import GetStarted from "./pages/GetStarted";
import Verify from "./pages/Verify";
import CreatePassword from "./pages/CreatePassword";
import Purpose from "./pages/Purpose";
import PassportInit from "./pages/PassportInit";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/get-started" replace />} />
      <Route path="/get-started" element={<GetStarted />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/create-password" element={<CreatePassword />} />
      <Route path="/purpose" element={<Purpose />} />
      <Route path="/passport-init" element={<PassportInit />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/get-started" replace />} />
    </Routes>
  );
}
