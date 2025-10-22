import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

/** Tiny in-memory auth (+ sessionStorage flag so a refresh stays signed in) */
export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("gc_authed") === "1");

  function signin() {
    sessionStorage.setItem("gc_authed", "1");
    setAuthed(true);
  }
  function signout() {
    sessionStorage.removeItem("gc_authed");
    setAuthed(false);
  }

  return (
    <AuthContext.Provider value={{ authed, signin, signout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
