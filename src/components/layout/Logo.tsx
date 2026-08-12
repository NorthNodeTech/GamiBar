import gamibarLogo from "@/assets/gamibar logo.png";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: number;
  /** `light` is an alias for `on-dark` (no drop shadow — for dark backgrounds). */
  tone?: "default" | "on-dark" | "light";
  className?: string;
};

/** Site-wide GamiBAR mark. */
export function Logo({ size = 40, tone = "default", className }: LogoProps) {
  const onDark = tone === "on-dark" || tone === "light";
  const pad = onDark ? Math.max(4, Math.round(size * 0.12)) : 0;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center leading-none",
        onDark && "rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)]",
        className,
      )}
      style={{
        width: size + pad * 2,
        height: size + pad * 2,
        padding: onDark ? pad : undefined,
      }}
    >
      <img
        src={gamibarLogo}
        alt="GamiBAR logo"
        width={size}
        height={size}
        decoding="async"
        draggable={false}
        className={cn(
          "block object-contain object-center",
          onDark ? "size-full" : "size-full drop-shadow-[0_1px_4px_rgba(0,0,0,0.08)]",
        )}
      />
    </span>
  );
}
