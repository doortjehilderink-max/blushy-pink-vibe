import brandMark from "@/assets/vor-mark.jpg";
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
        src={brandMark}
        alt="StockIn beeldmerk: meisje met blond haar en een roze bloem"
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
