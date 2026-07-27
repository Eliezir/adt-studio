import { cn } from "@/lib/cn";
import { withBase } from "@/lib/href";

const MIME_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
};

type DocVideoProps = {
  /**
   * Path under `public/`, e.g. "/videos/momo.mp4". Pass an array to offer the
   * same clip in several formats, best-supported first.
   */
  src: string | string[];
  /** Describes what the clip shows. Required unless `ambient`. */
  label?: string;
  /** Decorative loop: autoplays muted, no controls, hidden from screen readers. */
  ambient?: boolean;
  className?: string;
};

/**
 * A video embedded in a docs page.
 *
 * Docs MDX must use this rather than a raw `<video>` tag. Literal lowercase JSX
 * in MDX compiles straight to the HTML element and bypasses the component
 * registry in `mdx.tsx`, so a raw tag gets neither the shared styling nor — the
 * part that actually breaks — the deployment base prefix on its source paths.
 * Under a subpath deploy (`/adt-studio/` on GitHub Pages) a root-absolute
 * "/videos/x.mp4" 404s, and a video whose every source fails renders as nothing
 * at all: no error, just a missing clip.
 */
export function DocVideo({ src, label, ambient = false, className }: DocVideoProps) {
  const sources = Array.isArray(src) ? src : [src];

  return (
    <video
      playsInline
      {...(ambient
        ? { autoPlay: true, loop: true, muted: true, "aria-hidden": true }
        : { controls: true, "aria-label": label })}
      className={cn(
        "w-full rounded-lg border border-[color:var(--color-border)]",
        className,
      )}
    >
      {sources.map((path) => (
        <source
          key={path}
          src={withBase(path)}
          type={MIME_TYPES[path.split(".").pop()?.toLowerCase() ?? ""]}
        />
      ))}
    </video>
  );
}
