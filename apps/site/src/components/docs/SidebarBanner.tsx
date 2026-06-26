import { Link } from "@tanstack/react-router";
import { Globe } from "lucide-react";
import { gitConfig } from "@/lib/shared";
import { SidebarSearch } from "./SidebarSearch";

function GithubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M12 .5C5.37.5 0 5.78 0 12.292c0 5.211 3.438 9.63 8.205 11.188.6.111.82-.254.82-.567 0-.28-.01-1.022-.015-2.005-3.338.711-4.042-1.582-4.042-1.582-.546-1.361-1.335-1.725-1.335-1.725-1.087-.731.084-.716.084-.716 1.205.082 1.838 1.215 1.838 1.215 1.07 1.803 2.809 1.282 3.495.981.108-.763.417-1.282.76-1.577-2.665-.295-5.466-1.309-5.466-5.827 0-1.287.465-2.339 1.235-3.164-.135-.298-.54-1.497.105-3.121 0 0 1.005-.316 3.3 1.209.96-.262 1.98-.392 3-.398 1.02.006 2.04.136 3 .398 2.28-1.525 3.285-1.209 3.285-1.209.645 1.624.24 2.823.12 3.121.765.825 1.23 1.877 1.23 3.164 0 4.53-2.805 5.527-5.475 5.817.42.354.81 1.077.81 2.182 0 1.578-.015 2.846-.015 3.229 0 .315.21.683.825.566C20.565 21.917 24 17.495 24 12.292 24 5.78 18.627.5 12 .5z" />
    </svg>
  );
}

const linkClass =
  "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[0.8125rem] text-[color:var(--color-fd-muted-foreground)] transition-colors hover:bg-[color:var(--color-fd-accent)] hover:text-[color:var(--color-fd-accent-foreground)]";

/**
 * Docs sidebar header (Kaneo-style): quick external links sit above the search
 * trigger, both rendered in the sidebar banner slot.
 */
export function SidebarBanner() {
  return (
    <div className="flex flex-col gap-2">
      <nav className="flex flex-col">
        <Link to="/" className={linkClass}>
          <Globe className="size-4" />
          <span>Website</span>
        </Link>
        <a
          href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
          target="_blank"
          rel="noreferrer"
          className={linkClass}
        >
          <GithubIcon />
          <span>GitHub</span>
        </a>
      </nav>
      <SidebarSearch />
    </div>
  );
}
