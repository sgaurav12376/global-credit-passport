import { useEffect, useState } from "react";
let pushToast = null;
export function toast(message, opts = {}) { if (typeof pushToast === "function") pushToast(message, opts); }
export default function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    pushToast = (message, { variant="default", ttl=3500 } = {}) => {
      const id = Math.random().toString(36).slice(2);
      setItems((p) => [...p, { id, message, variant }]);
      setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), ttl);
    };
    return () => { pushToast = null; };
  }, []);
  return (
    <div className="toast-stack">
      {items.map(t => <div key={t.id} className={`toast ${t.variant}`}>{t.message}</div>)}
    </div>
  );
}
