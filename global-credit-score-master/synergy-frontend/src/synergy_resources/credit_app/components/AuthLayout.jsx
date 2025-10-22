export default function AuthLayout({ children }) {
  return (
    <div style={styles.body}>
      <div style={styles.card}>{children}</div>
    </div>
  );
}

export const styles = {
  body: {
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    background: "linear-gradient(135deg, #eef2f3, #8fd3f4)",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 15px 30px rgba(0,0,0,0.1)",
    padding: 40,
    width: "100%",
    maxWidth: 460,
  },
  heading: { margin: 0, fontSize: 26, fontWeight: 700, color: "#2c3e50" },
  subtext: { margin: "6px 0 22px", color: "#666", fontSize: 14 },
  formGroup: { marginBottom: 14 },
  input: { width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: 8, fontSize: 15, outline: "none" },
  orSeparator: { textAlign: "center", color: "#999", margin: "15px 0" },
  primaryBtn: { width: "100%", padding: 12, background: "#3498db", color: "#fff", border: "none", borderRadius: 6, fontSize: 16, fontWeight: "bold", cursor: "pointer" },
  error: { textAlign: "center", fontWeight: "bold", marginTop: 15, color: "#e74c3c" },
  footerNote: { textAlign: "center", fontSize: 13, color: "#888", marginTop: 20 },
  link: { color: "#3498db", textDecoration: "none" },
};
