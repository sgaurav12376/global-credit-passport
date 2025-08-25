import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { getCurrentUser } from '@aws-amplify/auth';
import rawConfig from '../config/aws-exports';

import LoginPage from '../pages/Login';
import RegisterPage from '../pages/register_page';
import UploadPage from '../pages/upload_page';

// Remove empty oauth block to prevent loginWith error
const { oauth, ...cleanConfig } = rawConfig;

// Final AWS config for Cognito email verification link flow
const awsconfig = {
  ...cleanConfig,
  mandatorySignIn: true,
  authenticationFlowType: 'USER_PASSWORD_AUTH',
  usernameAttributes: Array.isArray(cleanConfig.aws_cognito_username_attributes)
    ? cleanConfig.aws_cognito_username_attributes.map(attr => attr.toLowerCase())
    : ['email'],
};

Amplify.configure(awsconfig);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(currentUser => setUser(currentUser))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={spinnerStyle}></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!user ? <LoginPage setUser={setUser} /> : <Navigate to="/upload" replace />}
        />
        <Route
          path="/register"
          element={!user ? <RegisterPage /> : <Navigate to="/upload" replace />}
        />
        <Route
          path="/upload"
          element={user ? <UploadPage user={user} setUser={setUser} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/"
          element={<Navigate to={user ? "/upload" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

// Optional: basic loading styles
const loadingStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  fontFamily: "'Segoe UI', Roboto, sans-serif",
};

const spinnerStyle = {
  width: '40px',
  height: '40px',
  border: '4px solid #ccc',
  borderTop: '4px solid #3498db',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};
