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
}

const START: NavCard[] = [
  { icon: Download, title: "Installation", desc: "Run ADT Studio as a desktop app or with Docker.", splat: "install" },
  { icon: FolderPlus, title: "Create a New Project", desc: "Start your first book and load a PDF.", splat: "new-project" },
  { icon: Zap, title: "Quick Start", desc: "Go from a PDF to a finished book, end to end.", splat: "quickstart" },
  { icon: Lightbulb, title: "Core Concepts", desc: "The ideas the whole app is built on.", splat: "concepts" },
  { icon: Workflow, title: "The Pipeline", desc: "How extraction and generation actually work.", splat: "pipeline" },
  { icon: KeyRound, title: "LLM Providers & API Keys", desc: "Connect a model and track cost.", splat: "llm" },
];

/** Visual card grid replacing the plain "where to begin" link list. */
export function WhereToBegin() {
  return (
    <div className="not-prose mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {START.map(({ icon: Icon, title, desc, splat }) => (
        <Link
          key={splat}
          to="/docs/$"
          params={{ _splat: splat }}
          className="group flex flex-col gap-2 rounded-xl border border-fd-border bg-fd-card p-4 no-underline transition-colors hover:border-fd-primary/40 hover:bg-fd-accent/40"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-fd-primary/10 text-fd-primary transition-colors group-hover:bg-fd-primary/15">
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
  { icon: FolderArchive, title: "One book, one folder", desc: "Every book lives in a single, shareable directory — zip it, move it, hand it off." },
  { icon: History, title: "Nothing overwritten", desc: "Entities are versioned, never replaced. You can always roll back to an earlier result." },
  { icon: Eye, title: "Cached & inspectable", desc: "Every LLM call is cached and openable. Change the inputs and only the changed work reruns." },
];

/** Three-up principles grid replacing the "why it exists" wall of text. */
export function Principles() {
  return (
    <div className="not-prose mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {PRINCIPLES.map(({ icon: Icon, title, desc }) => (
        <div key={title} className="flex flex-col gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-fd-primary/10 text-fd-primary">
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
