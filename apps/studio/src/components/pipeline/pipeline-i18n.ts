import * as m from "@/paraglide/messages"
import type { PipelineMessageKey } from "./stage-config"

/** Type-safe dynamic lookup for parameterless paraglide pipeline messages. */
export function msg(key: PipelineMessageKey): string {
  return (m as unknown as Record<string, () => string>)[key]()
}
