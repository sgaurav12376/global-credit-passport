import React from "react";
import { useNavigate, Link } from "react-router-dom";

export default function CreditDashboard({ user }) {
  const navigate = useNavigate();

  // Just go to login, ignore setUser
  const handleSignOut = () => {
    navigate("/login");
  };

  return (
    <div style={container}>
      <header style={header}>
        <h1>Welcome, {user?.name || user?.email || "Guest"}</h1>
        <p>Your Credit Score App</p>
      </header>

      <main style={main}>
        <div style={card}>
          <h3>Credit Score</h3>
          <p style={score}>750</p>
        </div>

        <div style={card}>
          <h3>Credit History</h3>
          <ul>
            <li>Loan A: Paid ✅</li>
            <li>Credit Card B: Active 💳</li>
            <li>EMI C: Due ⚠️</li>
          </ul>
        </div>

        <div style={card}>
          <h3>Actions</h3>
          <button style={btn}>Upload Documents</button>
          <button style={btn}>Check Offers</button>
          <button
            style={{ ...btn, backgroundColor: "#e74c3c" }}
            onClick={handleSignOut}
          >
            Return to Sign-in
          </button>
        </div>
      </main>

      {/* ✅ Footer Note using <Link> */}
      <footer style={footerNote}>
        Want to log in again?{" "}
        <Link to="/login" style={link}>
          Sign-in Page
        </Link>
      </footer>
    </div>
  );
}

// Styles
const container = { fontFamily: "'Segoe UI', sans-serif", padding: "20px" };
const header = { textAlign: "center", marginBottom: "30px" };
const main = { display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" };
const card = { padding: "20px", border: "1px solid #ccc", borderRadius: "12px", width: "250px", textAlign: "center" };
const score = { fontSize: "36px", fontWeight: "bold", color: "#2ecc71" };
const btn = { padding: "10px 15px", margin: "5px", borderRadius: "6px", border: "none", backgroundColor: "#3498db", color: "white", cursor: "pointer" };

const footerNote = {
  textAlign: "center",
  fontSize: "13px",
  color: "#888",
  marginTop: "20px",
};
const link = {
  color: "#3498db",
  textDecoration: "none",
};
