import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import {
  Download,
  FolderPlus,
  Zap,
  Lightbulb,
  Workflow,
  KeyRound,
  FolderArchive,
  History,
  Eye,
  type LucideIcon,
} from "lucide-react";

interface NavCard {
  icon: LucideIcon;
  title: string;
  desc: string;
  splat: string;
  color: string;
}

const START: NavCard[] = [
  { icon: Download, title: "Installation", desc: "Run ADT Studio as a desktop app or with Docker.", splat: "install", color: "#2563eb" },
  { icon: FolderPlus, title: "Create a New Project", desc: "Start your first book and load a PDF.", splat: "new-project", color: "#7c3aed" },
  { icon: Zap, title: "Quick Start", desc: "Go from a PDF to a finished book, end to end.", splat: "quickstart", color: "#d97706" },
  { icon: Lightbulb, title: "Core Concepts", desc: "The ideas the whole app is built on.", splat: "concepts", color: "#0d9488" },
  { icon: Workflow, title: "The Pipeline", desc: "How extraction and generation actually work.", splat: "pipeline", color: "#e11d48" },
  { icon: KeyRound, title: "LLM Providers & API Keys", desc: "Connect a model and track cost.", splat: "llm", color: "#059669" },
];

/** Visual card grid replacing the plain "where to begin" link list. */
export function WhereToBegin() {
  return (
    <div className="not-prose mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {START.map(({ icon: Icon, title, desc, splat, color }) => (
        <Link
          key={splat}
          to="/docs/$"
          params={{ _splat: splat }}
          style={{ "--c": color } as CSSProperties}
          className="group flex flex-col gap-2 rounded-xl border border-fd-border bg-[var(--fd-content-surface)] p-4 no-underline shadow-sm transition-all hover:border-[color-mix(in_oklab,var(--c)_45%,transparent)] hover:shadow-md"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-[color-mix(in_oklab,var(--c)_13%,transparent)] text-[var(--c)] transition-colors group-hover:bg-[color-mix(in_oklab,var(--c)_20%,transparent)]">
            <Icon className="size-[1.15rem]" />
          </span>
          <span className="font-semibold text-fd-foreground">{title}</span>
          <span className="text-sm leading-relaxed text-fd-muted-foreground">
            {desc}
          </span>
        </Link>
      ))}
    </div>
  );
}

const PRINCIPLES = [
  { icon: FolderArchive, title: "One book, one folder", desc: "Every book lives in a single, shareable directory — zip it, move it, hand it off.", color: "#2563eb" },
  { icon: History, title: "Nothing overwritten", desc: "Entities are versioned, never replaced. You can always roll back to an earlier result.", color: "#7c3aed" },
  { icon: Eye, title: "Cached & inspectable", desc: "Every LLM call is cached and openable. Change the inputs and only the changed work reruns.", color: "#0d9488" },
];

/** Three-up principles grid replacing the "why it exists" wall of text. */
export function Principles() {
  return (
    <div className="not-prose mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {PRINCIPLES.map(({ icon: Icon, title, desc, color }) => (
        <div key={title} className="flex flex-col gap-2.5">
          <span
            style={{ "--c": color } as CSSProperties}
            className="grid size-10 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--c)_13%,transparent)] text-[var(--c)]"
          >
            <Icon className="size-5" />
          </span>
          <span className="font-semibold text-fd-foreground">{title}</span>
          <span className="text-sm leading-relaxed text-fd-muted-foreground">
            {desc}
          </span>
        </div>
      ))}
    </div>
  );
}
