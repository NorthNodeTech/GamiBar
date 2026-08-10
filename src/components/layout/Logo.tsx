import gamibarLogo from "@/assets/logogamibar.webp";
import { cn } from "@/lib/utils";

/** Site-wide GamiBAR mark. */
export function Logo({ size = 40, tone = "default" }: { size?: number; tone?: "default" | "light" }) {
  return (
    <span className="grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <img
        src={gamibarLogo}
        alt="GamiBAR logo"
        width={size}
        height={size}
        className={cn(
          "size-full object-contain",
          tone === "default" && "drop-shadow-[0_1px_4px_rgba(0,0,0,0.08)]",
        )}
      />
    </span>
  );
}
