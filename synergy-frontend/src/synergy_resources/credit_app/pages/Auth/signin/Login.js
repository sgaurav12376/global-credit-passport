import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode"; 

const Login = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email && !phone) {
      setMessage("Please enter email or phone number");
      return;
    }

    try {
      let payload = { password };
      if (email) payload.email = email;
      if (phone) payload.phone = phone;

      const response = await fetch("http://localhost:8000/auth/signin/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Login failed");
      }

      const data = await response.json();
      setMessage("Login successful ✅");

      // Save tokens
      if (data.access_token) {
        localStorage.setItem("accessToken", data.access_token);
      }
      if (data.id_token) {
        localStorage.setItem("idToken", data.id_token);

        // Decode user info
        const decoded = jwtDecode(data.id_token);
        console.log("Decoded user:", decoded);

        // Example fields: email, name, phone_number
        const userInfo = {
          email: decoded.email,
          name: decoded.name,
          phone: decoded.phone_number,
        };

        setUser(userInfo);
      }

      // Redirect
      navigate("/dashboard");

    } catch (err) {
      setMessage(err.message || "Error connecting to server");
    }
  };

  return (
    <div style={styles.body}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Welcome Back</h2>
        <p style={styles.subtext}>Log in to manage your credit profile</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.orSeparator}>or</div>

          <div style={styles.formGroup}>
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.loginBtn}>Log In</button>
          <p style={styles.message}>{message}</p>
        </form>

        <div style={styles.footerNote}>
          Don’t have an account? <a href="/RegisterOptions" style={styles.link}>Sign Up</a>
        </div>
      </div>
    </div>
  );
};

// keep your styles here...

const styles = {
  body: {
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    background: 'linear-gradient(135deg, #eef2f3, #8fd3f4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 15px 30px rgba(0, 0, 0, 0.1)',
    padding: '40px',
    maxWidth: '460px',
    width: '100%',
    position: 'relative',
  },
  heading: {
    textAlign: 'center',
    color: '#2c3e50',
    fontSize: '26px',
    marginBottom: '10px',
  },
  subtext: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#6c7a89',
    marginBottom: '30px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: '15px',
  },
  orSeparator: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#999',
    margin: '15px 0',
  },
  loginBtn: {
    width: '100%',
    padding: '12px',
    background: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  message: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: '15px',
    color: '#e74c3c',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#888',
    marginTop: '20px',
  },
  link: {
    color: '#3498db',
    textDecoration: 'none',
  },
};

export default Login;
