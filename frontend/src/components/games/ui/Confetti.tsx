import { motion } from "framer-motion";

const bits = Array.from({ length: 42 }, (_, i) => ({
  x: (i * 37) % 100,
  delay: (i % 12) * 0.06,
  rotate: (i * 53) % 360,
  size: 4 + (i % 4) * 2,
  opacity: 0.35 + ((i % 5) * 0.12),
}));

export function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[2px] bg-foreground"
          style={{ left: `${b.x}%`, top: -12, width: b.size, height: b.size * 1.6, opacity: b.opacity }}
          initial={{ y: -20, rotate: 0, opacity: 0 }}
          animate={{ y: 420, rotate: b.rotate, opacity: [0, b.opacity, 0] }}
          transition={{ duration: 2.2 + (i % 5) * 0.2, delay: b.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}