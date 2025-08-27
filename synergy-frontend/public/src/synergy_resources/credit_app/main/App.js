import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Pages
import LoginPage from '../pages/Auth/Login.js';
import RegisterChoice from '../pages/Auth/signup/RegisterOptions.js';
import ManualRegister from '../pages/Auth/signup/ManualRegister.js';
import AutoRegister from '../pages/Auth/signup/AutoRegister.js';
import CreditDashboard  from '../pages/dashboard/CreditDashboard.js';
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check user session on mount
  useEffect(() => {
    axios.get("http://localhost:8001/auth/me", { withCredentials: true })
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
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
          element={!user ? <LoginPage setUser={setUser} /> : <Navigate to="/dashboard" replace />}
        />

        {/* Register Choice */}
        <Route
          path="/register"
          element={!user ? <RegisterChoice /> : <Navigate to="/login" replace />}
        />

        {/* Manual Register */}
        <Route
          path="/register/manual"
          element={!user ? <ManualRegister /> : <Navigate to="/login" replace />}
        />

        {/* Automatic Register */}
        <Route
          path="/register/auto"
          element={!user ? <AutoRegister /> : <Navigate to="/login" replace />}
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
