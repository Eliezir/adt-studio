import { Cursor } from "@/components/Cursor";
import { PresetCard } from "@/components/scenes/PresetCard";
import { PRESETS } from "@/data/presets";
import { lerp, seg } from "@/lib/seg";

export function AnimPresetPicker({ progress }: { progress: number }) {
  const p = progress;

  let cx: number, cy: number;
  if (p < 0.06) {
    const tEnter = seg(p, 0, 0.06);
    cx = lerp(100, 80, tEnter);
    cy = lerp(110, 55, tEnter);
  } else if (p < 0.62) {
    const tMove = seg(p, 0.06, 0.62);
    cx = lerp(80, 32, tMove);
    cy = lerp(55, 28, tMove);
  } else {
    cx = 32;
    cy = 28;
  }

  const clicking = p >= 0.62 && p < 0.71;
  const selectedId = p >= 0.66 ? "textbook" : null;

  return (
    <div className="flex h-full items-start justify-center p-4">
      <div
        aria-hidden
        className="pointer-events-none grid w-full max-w-[720px] grid-cols-2 gap-3"
        style={{ transform: "scale(0.6)", transformOrigin: "top center" }}
      >
        {PRESETS.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            selected={selectedId === preset.id}
          />
        ))}
      </div>
      <Cursor x={cx} y={cy} clicking={clicking} visible={p <= 0.96} />
    </div>
  );
}
