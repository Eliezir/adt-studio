import type { KeyboardEvent } from "react";

/**
 * Roving focus for a `role="tablist"` container: arrow keys, Home and End
 * move focus between the tabs and activate the focused one.
 */
export function onTablistKeyDown(event: KeyboardEvent<HTMLElement>) {
  const { key } = event;
  const forward = key === "ArrowRight" || key === "ArrowDown";
  const backward = key === "ArrowLeft" || key === "ArrowUp";
  if (!forward && !backward && key !== "Home" && key !== "End") return;
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
  const index = tabs.indexOf(document.activeElement as HTMLElement);
  if (index === -1 || tabs.length === 0) return;
  event.preventDefault();
  let next = index;
  if (forward) next = (index + 1) % tabs.length;
  else if (backward) next = (index - 1 + tabs.length) % tabs.length;
  else if (key === "Home") next = 0;
  else next = tabs.length - 1;
  tabs[next].focus();
  tabs[next].click();
}
