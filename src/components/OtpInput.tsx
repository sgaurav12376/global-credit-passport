import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  length?: number;
  value: string;                 // digits-only string e.g. "123456"
  onChange: (val: string) => void;
  autoFocus?: boolean;
  className?: string;
};

export default function OtpInput({ length = 6, value, onChange, autoFocus, className }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = useMemo(() => {
    const v = (value ?? "").replace(/\D/g, "").slice(0, length);
    return Array.from({ length }, (_, i) => v[i] ?? "");
  }, [value, length]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setAllFrom = (raw: string, startIndex = 0) => {
    const d = raw.replace(/\D/g, "");
    if (!d) return;

    const next = digits.slice();
    let j = startIndex;
    for (let i = 0; i < d.length && j < length; i++, j++) next[j] = d[i];

    onChange(next.join(""));
    refs.current[Math.min(startIndex + d.length, length - 1)]?.focus();
  };

  const setAt = (idx: number, raw: string) => {
    const d = raw.replace(/\D/g, "");
    if (!d) {
      const next = digits.slice();
      next[idx] = "";
      onChange(next.join(""));
      return;
    }

    // Handles paste/autofill that dumps multiple digits into one input
    if (d.length > 1) {
      setAllFrom(d, idx);
      return;
    }

    const next = digits.slice();
    next[idx] = d[0];
    onChange(next.join(""));
    if (idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const onKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[idx]) {
        const next = digits.slice();
        next[idx] = "";
        onChange(next.join(""));
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
        const next = digits.slice();
        next[idx - 1] = "";
        onChange(next.join(""));
      }
    }
    if (e.key === "ArrowLeft" && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const onPaste = (idx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    setAllFrom(text, idx);
  };

  return (
    <div className={className} style={{ display: "flex", gap: 10 }}>
      {digits.map((d, idx) => (
        <input
          key={idx}
          ref={(el) => (refs.current[idx] = el)}
          value={d}
          onChange={(e) => setAt(idx, e.target.value)}
          onKeyDown={(e) => onKeyDown(idx, e)}
          onPaste={(e) => onPaste(idx, e)}
          inputMode="numeric"
          type="tel"
          pattern="\d*"
          maxLength={1}
          autoComplete={idx === 0 ? "one-time-code" : "off"}
          aria-label={`OTP digit ${idx + 1}`}
          style={{
            width: 44,
            height: 52,
            textAlign: "center",
            fontSize: 20,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
          }}
        />
      ))}
    </div>
  );
}
