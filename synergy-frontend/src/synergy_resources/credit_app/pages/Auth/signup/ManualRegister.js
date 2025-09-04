import React, { useState } from "react";

const ManualRegister = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    dob: "",
    idType: "",
    idNumber: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    if (!formData.name || !formData.phone || !formData.email || !formData.dob || !formData.password) {
      setMessage("Please fill all required fields!");
      return;
    }

    if (!formData.idType || !formData.idNumber) {
      setMessage("Please select one ID type and enter its number!");
      return;
    }

    try {
      console.log("Registration data:", formData);

      const response = await fetch("http://127.0.0.1:8000/auth/signup_manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Registration failed");
      }

      const data = await response.json();
      console.log("Backend response:", data);

      setMessage("Registration successful 🎉");

      // Redirect user to login after success
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);

    } catch (err) {
      console.error("Error during registration:", err.message);
      setMessage(err.message);
    }
  };

  return (
    <div style={styles.body}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Manual Registration</h2>
        <p style={styles.subtext}>Fill in your details to create an account</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <label style={{ fontWeight: "bold", marginBottom: "6px", display: "block" }}>
            Choose ID Type (mandatory):
          </label>
          <select
            name="idType"
            value={formData.idType}
            onChange={handleChange}
            style={styles.input}
            required
          >
            <option value="">Select ID Type</option>
            <option value="aadhaar">Aadhaar Card</option>
            <option value="passport">Passport</option>
            <option value="drivingLicense">Driving License</option>
          </select>

          {formData.idType && (
            <div style={styles.formGroup}>
              <input
                type="text"
                name="idNumber"
                placeholder={`Enter ${
                  formData.idType === "aadhaar"
                    ? "Aadhaar"
                    : formData.idType === "passport"
                    ? "Passport"
                    : "Driving License"
                } Number`}
                value={formData.idNumber}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
          )}

          <button type="submit" style={styles.registerBtn}>
            Register
          </button>
          <p style={styles.message}>{message}</p>
        </form>

        <div style={styles.footerNote}>
          Prefer Auto registration?{" "}
          <a href="AutoRegister" style={styles.link}>
            Auto SignUp
          </a>
        </div>
      </div>
    </div>
  );
};

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
  },
  heading: {
    textAlign: "center",
    color: "#2c3e50",
    fontSize: "26px",
    marginBottom: "10px",
  },
  subtext: {
    textAlign: "center",
    fontSize: "14px",
    color: "#6c7a89",
    marginBottom: "30px",
  },
  formGroup: {
    marginBottom: "20px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "15px",
  },
  registerBtn: {
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
    textAlign: "center",
    fontWeight: "bold",
    marginTop: "15px",
    color: "#e74c3c",
  },
  footerNote: {
    textAlign: "center",
    fontSize: "13px",
    color: "#888",
    marginTop: "20px",
  },
  link: {
    color: "#3498db",
    textDecoration: "none",
  },
};

export default ManualRegister;
