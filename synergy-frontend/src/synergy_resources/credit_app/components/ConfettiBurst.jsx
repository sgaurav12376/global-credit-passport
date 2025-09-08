import { useEffect, useRef } from "react";

export default function ConfettiBurst({ fire = false, duration = 3500 }) {
  const ref = useRef(null);
  const raf = useRef();
  const timeout = useRef();

  useEffect(() => {
    if (!fire) return;
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const colors = ["#10B981", "#84CC16", "#3B82F6", "#F59E0B", "#EF4444"];
    const parts = Array.from({ length: 180 }, () => ({
      x: Math.random() * W,
      y: -20 - Math.random() * 100,
      r: 4 + Math.random() * 6,
      c: colors[(Math.random() * colors.length) | 0],
      vx: -2 + Math.random() * 4,
      vy: 3 + Math.random() * 4,
      g: 0.06 + Math.random() * 0.04,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
    }));

    let running = true;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
      }
      if (running) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    timeout.current = setTimeout(() => {
      running = false;
      cancelAnimationFrame(raf.current);
    }, duration);

    return () => {
      running = false;
      cancelAnimationFrame(raf.current);
      clearTimeout(timeout.current);
      window.removeEventListener("resize", onResize);
    };
  }, [fire, duration]);

  return (
    <canvas
      ref={ref}
      className="confetti-layer"
      style={{ display: fire ? "block" : "none" }}
      aria-hidden="true"
    />
  );
}
