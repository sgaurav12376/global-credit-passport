import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from 'aws-amplify/auth'; // ✅ New import path

export default function LoginPage({ setUser }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { isSignedIn, nextStep } = await signIn({ username, password }); // ✅ New usage
      if (isSignedIn) {
        setUser(username);
        navigate('/upload');
      } else {
        console.log('Next step in sign-in process:', nextStep); // For MFA or challenges
      }
    } catch (err) {
      setError(err.message || 'Error signing in');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={headerStyle}>Welcome Back</h2>
        <p style={subheaderStyle}>Log in to manage your credit profile</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email Address"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          {error && <p style={errorStyle}>{error}</p>}
          <button type="submit" style={buttonStyle}>Log In</button>
        </form>
        <div style={footerStyle}>
          Don’t have an account? <Link to="/register" style={linkStyle}>Sign Up</Link>
        </div>
      </div>
    </div>
  );
}

// Styling constants
const containerStyle = {
  fontFamily: "'Segoe UI', Roboto, sans-serif",
  background: "linear-gradient(135deg, #eef2f3, #8fd3f4)",
  height: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  boxShadow: '0 15px 30px rgba(0,0,0,0.1)',
  padding: '40px',
  maxWidth: '460px',
  width: '100%',
};

const headerStyle = { textAlign: 'center', color: '#2c3e50', marginBottom: 10, fontSize: 26 };
const subheaderStyle = { textAlign: 'center', fontSize: 14, color: '#6c7a89', marginBottom: 30 };

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #ccc',
  borderRadius: '6px',
  fontSize: 15,
  marginBottom: 20,
};

const buttonStyle = {
  width: '100%',
  padding: '12px',
  background: '#3498db',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontSize: 16,
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'background 0.3s ease',
};

const footerStyle = { textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20 };
const linkStyle = { color: '#3498db', textDecoration: 'none' };
const errorStyle = { color: 'red', marginBottom: 10, textAlign: 'center' };
