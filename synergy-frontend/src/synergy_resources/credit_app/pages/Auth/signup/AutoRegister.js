import React, { useState } from "react";

export default function AutoRegister() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please upload a document first!");
      return;
    }

    const formData = new FormData();
    formData.append("id_file", file);

    try {
      const res = await fetch("http://localhost:8001/api/register-auto", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Extracted Data:", data);
      setMessage("User Registered Automatically!");
    } catch (err) {
      setMessage("Error connecting to server");
    }
  };

  return (
    <div style={styles.body}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Automatic Registration</h2>
        <p style={styles.subtext}>Upload your ID document to register automatically</p>

        <div style={styles.formGroup}>
          <input
            type="file"
            onChange={handleFileChange}
            style={styles.fileInput}
          />
        </div>

        <button onClick={handleUpload} style={styles.uploadBtn}>
          Upload & SignUp
        </button>

        {message && <p style={styles.message}>{message}</p>}

        <div style={styles.footerNote}>
          Prefer manual registration? <a href="ManualRegister" style={styles.link}>Sign Up Manually</a>
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
    position: "relative",
    textAlign: "center",
  },
  heading: {
    color: "#2c3e50",
    fontSize: "26px",
    marginBottom: "10px",
  },
  subtext: {
    fontSize: "14px",
    color: "#6c7a89",
    marginBottom: "30px",
  },
  formGroup: {
    marginBottom: "20px",
  },
  fileInput: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "15px",
    cursor: "pointer",
  },
  uploadBtn: {
    width: "100%",
    padding: "12px",
    background: "#3498db",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  message: {
    marginTop: "15px",
    fontWeight: "bold",
    color: "#e74c3c",
  },
  footerNote: {
    fontSize: "13px",
    color: "#888",
    marginTop: "20px",
  },
  link: {
    color: "#3498db",
    textDecoration: "none",
  },
};
