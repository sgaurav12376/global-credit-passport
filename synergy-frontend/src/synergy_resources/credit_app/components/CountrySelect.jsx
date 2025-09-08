import { useState, useRef, useEffect } from "react";
import ReactCountryFlag from "react-country-flag";

const COUNTRIES = [
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
];

export default function CountrySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = COUNTRIES.find((c) => c.code === value) || COUNTRIES[0];

  return (
    <div className="countryselect" ref={ref}>
      <button className="countrybtn" onClick={() => setOpen(!open)}>
        <ReactCountryFlag svg countryCode={selected.code} style={{ fontSize: "1.2em" }} />
        <span>{selected.label}</span>
      </button>
      {open && (
        <div className="countrydropdown">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              className="countryitem"
              onClick={() => { onChange(c.code); setOpen(false); }}
            >
              <ReactCountryFlag svg countryCode={c.code} style={{ fontSize: "1.2em" }} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
