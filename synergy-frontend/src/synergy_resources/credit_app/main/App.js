import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";  // ✅ decode user info
import api from "../config/api"; // Axios instance

// Pages
import LoginPage from "../pages/Auth/signin/Login.js";
import RegisterChoice from "../pages/Auth/signup/RegisterOptions.js";
import ManualRegister from "../pages/Auth/signup/ManualRegister.js";
import AutoRegister from "../pages/Auth/signup/AutoRegister.js";
import CreditDashboard from "../pages/dashboard/CreditDashboard.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ------------------------------
  // Check session on mount
  // ------------------------------
  useEffect(() => {
    const token = localStorage.getItem("idToken");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({
          email: decoded.email,
          name: decoded.name,
          phone: decoded.phone_number,
        });
      } catch (err) {
        console.error("Invalid token", err);
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route
          path="/login"
          element={
            !user ? (
              <LoginPage setUser={setUser} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* Register Choice */}
        <Route
          path="/RegisterOptions"
          element={!user ? <RegisterChoice /> : <Navigate to="/dashboard" replace />}
        />

        {/* Manual Register */}
        <Route
          path="/RegisterOptions/ManualRegister"
          element={!user ? <ManualRegister /> : <Navigate to="/dashboard" replace />}
        />

        {/* Automatic Register */}
        <Route
          path="/RegisterOptions/AutoRegister"
          element={!user ? <AutoRegister /> : <Navigate to="/dashboard" replace />}
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={user ? <CreditDashboard user={user} /> : <Navigate to="/login" replace />}
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
