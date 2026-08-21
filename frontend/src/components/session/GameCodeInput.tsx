import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type GameCodeInputProps = {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
};

export function GameCodeInput({
  value,
  onChange,
  length = 6,
  className,
  inputClassName,
  autoFocus,
}: GameCodeInputProps) {
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [focused, setFocused] = useState(0);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setDigit = (index: number, char: string) => {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join("").slice(0, length));
  };

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[min(100%,280px)] gap-1 sm:max-w-sm sm:gap-2",
        className,
      )}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          aria-label={`Digit ${index + 1}`}
          onFocus={() => setFocused(index)}
          onChange={(e) => {
            const char = e.target.value.replace(/\D/g, "").slice(-1);
            setDigit(index, char);
            if (char && index < length - 1) refs.current[index + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[index] && index > 0) {
              refs.current[index - 1]?.focus();
            }
            if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
            if (e.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (!pasted) return;
            onChange(pasted);
            refs.current[Math.min(pasted.length, length) - 1]?.focus();
          }}
          className={cn(
            "h-11 min-w-0 flex-1 basis-0 rounded-xl border bg-white text-center font-mono text-lg font-bold text-[#111111] outline-none transition-all duration-150 sm:h-12 sm:text-xl",
            focused === index || digit
              ? "border-[var(--gamibar-brand)] shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
              : "border-[var(--gamibar-border)]",
            inputClassName,
          )}
        />
      ))}
    </div>
  );
}
