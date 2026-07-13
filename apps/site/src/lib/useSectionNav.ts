import { useEffect, useState } from "react";

export type SectionId = string;

export function useSectionNav(sectionIds: readonly SectionId[]): {
  activeId: SectionId | null;
  goTo: (id: SectionId) => void;
} {
  const [activeId, setActiveId] = useState<SectionId | null>(
    sectionIds[0] ?? null,
  );

  useEffect(() => {
    setActiveId(sectionIds[0] ?? null);
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const visibility = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visibility.set(e.target.id, e.intersectionRatio);
        }
        let best: { id: string; ratio: number } | null = null;
        for (const [id, ratio] of visibility) {
          if (!best || ratio > best.ratio) best = { id, ratio };
        }
        if (best && best.ratio > 0) setActiveId(best.id);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const el of elements) obs.observe(el);
    return () => obs.disconnect();
  }, [sectionIds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      const isDown = e.key === "ArrowDown" || e.key === "PageDown";
      const isUp = e.key === "ArrowUp" || e.key === "PageUp";
      if (!isDown && !isUp) return;

      const currentIdx = activeId ? sectionIds.indexOf(activeId) : 0;
      const nextIdx = isDown ? currentIdx + 1 : currentIdx - 1;
      if (nextIdx < 0 || nextIdx >= sectionIds.length) return;

      e.preventDefault();
      const nextId = sectionIds[nextIdx];
      const el = document.getElementById(nextId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, sectionIds]);

  const goTo = (id: SectionId) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return { activeId, goTo };
}
