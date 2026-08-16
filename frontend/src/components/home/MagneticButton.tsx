import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { sound } from "@/lib/sound";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  strength?: number;
}

export function MagneticButton({
  children,
  className = "",
  onClick,
  strength = 0.35,
}: MagneticButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    setPosition({ x: x * strength, y: y * strength });
  };

  const handleMouseEnter = () => {
    sound.playMagnetic();
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const handleClick = () => {
    sound.playSnap();
    if (onClick) onClick();
  };

  return (
    <motion.div
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 350, damping: 20 }}
      data-cursor="button"
      className={`inline-block cursor-pointer ${className}`}
    >
      {children}
    </motion.div>
  );
}
