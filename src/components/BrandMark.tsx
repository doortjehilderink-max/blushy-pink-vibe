import brandMark from "@/assets/blushluxe-mark.jpg.asset.json";
import { cn } from "@/lib/utils";

export function BrandMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        "inline-block overflow-hidden rounded-full ring-1 ring-primary/25 shadow-soft",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={brandMark.url}
        alt="BlushLuxe beeldmerk: een verzameling roze blushes"
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
