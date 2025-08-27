import React from "react";
import { Link } from "react-router-dom";

export default function RegisterOptions() {
  return (
    <div style={styles.body}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Choose Registration Method</h1>

        <div style={styles.buttonContainer}>
          <Link to="ManualRegister" style={styles.link}>
            <button style={{ ...styles.button, backgroundColor: "#3498db" }}>
              Manual SignUp
            </button>
          </Link>
          <Link to="AutoRegister" style={styles.link}>
            <button style={{ ...styles.button, backgroundColor: "#3498db" }}>
              Automatic SignUp
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  body: {
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    background: "linear-gradient(135deg, #eef2f3, #8fd3f4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 15px 30px rgba(0, 0, 0, 0.1)",
    padding: "40px",
    maxWidth: "460px",
    width: "100%",
    textAlign: "center",
  },
  heading: {
    color: "#2c3e50",
    fontSize: "26px",
    fontWeight: "bold",
    marginBottom: "30px",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
  },
  button: {
    padding: "12px 20px",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    transition: "background-color 0.3s",
  },
  link: {
    textDecoration: "none",
  },
};
