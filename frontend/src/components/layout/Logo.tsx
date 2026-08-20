import logoBlack from "@/assets/gamibar-logo-black.png";
import logoWhite from "@/assets/gamibar-logo-white.png";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: number;
  /**
   * - "default" / "auto": Adaptive (black on light theme, white on dark theme)
   * - "on-dark" / "white" / "light": Always white logo (for dark/black backgrounds)
   * - "on-light" / "black" / "dark": Always black logo (for light/white backgrounds)
   */
  tone?: "default" | "auto" | "on-dark" | "on-light" | "white" | "black" | "light" | "dark";
  className?: string;
};

/** Site-wide GamiBAR brand logo mark. */
export function Logo({ size = 40, tone = "default", className }: LogoProps) {
  if (tone === "on-dark" || tone === "white" || tone === "light") {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center leading-none", className)}
        style={{ width: size, height: size }}
      >
        <img
          src={logoWhite}
          alt="GamiBar logo"
          width={size}
          height={size}
          decoding="async"
          draggable={false}
          className="size-full object-contain object-center"
        />
      </span>
    );
  }

  if (tone === "on-light" || tone === "black" || tone === "dark") {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center leading-none", className)}
        style={{ width: size, height: size }}
      >
        <img
          src={logoBlack}
          alt="GamiBar logo"
          width={size}
          height={size}
          decoding="async"
          draggable={false}
          className="size-full object-contain object-center"
        />
      </span>
    );
  }

  // Default: adaptive theme-aware (black on light background, white on dark background)
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center leading-none", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={logoBlack}
        alt="GamiBar logo"
        width={size}
        height={size}
        decoding="async"
        draggable={false}
        className="block dark:hidden size-full object-contain object-center"
      />
      <img
        src={logoWhite}
        alt="GamiBar logo"
        width={size}
        height={size}
        decoding="async"
        draggable={false}
        className="hidden dark:block size-full object-contain object-center"
      />
    </span>
  );
}
