import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  value,
  size = 14,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={cn(
            "transition-colors",
            i <= Math.round(value) ? "fill-champagne text-champagne" : "text-border",
          )}
        />
      ))}
    </span>
  );
}

export function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Sterren">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} ster${i > 1 ? "ren" : ""}`}
          onClick={() => onChange(i)}
          className="rounded-full p-1 transition-transform hover:scale-110"
        >
          <Star
            size={26}
            className={i <= value ? "fill-champagne text-champagne" : "text-border"}
          />
        </button>
      ))}
    </div>
  );
}
