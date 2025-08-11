import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from 'aws-amplify/auth';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            phone_number: phone,
          },
        },
      });

      setSuccess('Registration successful! Please check your email and click the verification link.');
      // Optional: redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      setError(err.message || 'Error registering user');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={headerStyle}>Create Account</h2>
        <p style={subheaderStyle}>Register to start managing your credit profile</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email Address (Username)"
            value={email}
            onChange={e => setEmail(e.target.value.toLowerCase())}
            style={inputStyle}
            required
          />
          <input
            type="tel"
            placeholder="Phone Number (e.g. +12345678900)"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={inputStyle}
            required
          />
          {error && <p style={errorStyle}>{error}</p>}
          {success && <p style={successStyle}>{success}</p>}
          <button type="submit" style={buttonStyle}>Register</button>
        </form>
        <div style={footerStyle}>
          Already have an account? <Link to="/login" style={linkStyle}>Log In</Link>
        </div>
      </div>
    </div>
  );
}

// Styles (same as before)
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
const successStyle = { color: 'green', marginBottom: 10, textAlign: 'center' };
