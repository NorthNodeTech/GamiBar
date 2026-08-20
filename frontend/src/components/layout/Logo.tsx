import logoWhite from "@/assets/gamibar-logo-white.webp";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: number;
  tone?: string;
  className?: string;
};

/** Site-wide GamiBAR brand logo mark (transparent white logo). */
export function Logo({ size = 48, className }: LogoProps) {
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
