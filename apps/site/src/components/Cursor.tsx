import { cn } from "@/lib/cn";

export function Cursor({
  x,
  y,
  visible = true,
  clicking = false,
}: {
  x: number;
  y: number;
  visible?: boolean;
  clicking?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-50 transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-2px, -2px)",
      }}
    >
      <div
        className={cn(
          "relative transition-transform duration-150",
          clicking ? "scale-90" : "scale-100",
        )}
      >
        <svg
          width="22"
          height="24"
          viewBox="0 0 22 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md"
        >
          <path
            d="M2 2L2 18.5L6.5 14.5L9.5 21L13 19.5L10 13L16 13L2 2Z"
            fill="white"
            stroke="black"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
        {clicking && (
          <span className="absolute -left-2 -top-2 h-6 w-6 rounded-full border-2 border-[color:var(--color-primary)]/60 animate-fade-ring" />
        )}
      </div>
    </div>
  );
}
