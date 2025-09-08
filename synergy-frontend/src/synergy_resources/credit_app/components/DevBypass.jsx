// testing
// import { useEffect } from "react";
// import { Navigate, useLocation } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";

// export default function DevBypass({ children }) {
//       const { signin } = useAuth();
//       const loc = useLocation();
//       // ✅ define BYPASS BEFORE using it
//       const BYPASS = Boolean(import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === "1");
//       // flip React state to authed when bypassing
//       useEffect(() => {
//             if (BYPASS) {
//                   sessionStorage.setItem("gc_authed", "1");
//                   signin();
//             }
//       }, [BYPASS, signin]);
//       // if bypassing, jump straight to dashboard
//       if (BYPASS) {
//             const next = loc.state?.from || "/score";
//             return <Navigate to={next} replace />;
//       }
//       // otherwise render the original auth page
//       return children;
// }
//  testing