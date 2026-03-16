import { usePipelineStats } from "@/hooks/use-debug"
import { Badge } from "@/components/ui/badge"
import * as m from "@/paraglide/messages"

interface StatsTabProps {
  label: string
  isRunning: boolean
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${(ms / 1000).toFixed(2)}s`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

function estimateCost(inputTokens: number, outputTokens: number): string {
  const cost = (inputTokens * 2.5 + outputTokens * 10) / 1_000_000
  return `$${cost.toFixed(4)}`
}

export function StatsTab({ label, isRunning }: StatsTabProps) {
  const { data, isLoading, error } = usePipelineStats(label, {
    refetchInterval: isRunning ? 3000 : false,
  })

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {m.stats_loading()}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-destructive">
        {m.stats_failed()} {error.message}
      </div>
    )
  }

  if (!data) return null

  const { steps, totals, pipelineRun } = data
  const cacheHitRate = totals.calls > 0
    ? ((totals.cacheHits / totals.calls) * 100).toFixed(1)
    : "0"

  return (
    <div className="p-6 space-y-6 text-sm">
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">
            {m.stats_llm_calls()}
          </div>
          <div className="text-2xl font-semibold tabular-nums">{totals.calls}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">
            {m.stats_cache_hit_rate()}
          </div>
          <div className="text-2xl font-semibold tabular-nums">{cacheHitRate}%</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">
            {m.stats_total_tokens()}
          </div>
          <div className="text-2xl font-semibold tabular-nums">
            {formatTokens(totals.inputTokens + totals.outputTokens)}
          </div>
        </div>
        {pipelineRun?.wallClockMs != null ? (
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1">
              {m.stats_wall_clock()}
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {formatDuration(pipelineRun.wallClockMs)}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1">
              {m.stats_wall_clock()}
            </div>
            <div className="text-2xl font-semibold text-muted-foreground">-</div>
          </div>
        )}
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">
            {m.stats_estimated_cost()}
          </div>
          <div className="text-2xl font-semibold tabular-nums">
            {estimateCost(totals.inputTokens, totals.outputTokens)}
          </div>
        </div>
        <div className={`rounded-lg border p-4 ${totals.errorCount > 0 ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900" : "bg-card"}`}>
          <div className="text-xs text-muted-foreground mb-1">
            {m.stats_errors()}
          </div>
          <div className={`text-2xl font-semibold tabular-nums ${totals.errorCount > 0 ? "text-destructive" : ""}`}>
            {totals.errorCount}
          </div>
        </div>
      </div>

      {steps.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-3">
            {m.stats_per_step_breakdown()}
          </h4>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                  <th className="py-2.5 px-4 font-medium">
                    {m.stats_step()}
                  </th>
                  <th className="py-2.5 px-4 font-medium text-right">
                    {m.stats_calls()}
                  </th>
                  <th className="py-2.5 px-4 font-medium text-right">
                    {m.stats_cache_hits()}
                  </th>
                  <th className="py-2.5 px-4 font-medium text-right">
                    {m.stats_misses()}
                  </th>
                  <th className="py-2.5 px-4 font-medium text-right">
                    {m.stats_tokens_in()}
                  </th>
                  <th className="py-2.5 px-4 font-medium text-right">
                    {m.stats_tokens_out()}
                  </th>
                  <th className="py-2.5 px-4 font-medium text-right">
                    {m.stats_avg_duration()}
                  </th>
                  <th className="py-2.5 px-4 font-medium text-right">
                    {m.stats_errors()}
                  </th>
                </tr>
              </thead>
              <tbody>
                {steps.map((s) => (
                  <tr
                    key={s.step}
                    className={`border-b last:border-0 ${s.errorCount > 0 ? "bg-red-50 dark:bg-red-950/20" : ""}`}
                  >
                    <td className="py-2.5 px-4">
                      <Badge variant="outline" className="text-xs font-mono">
                        {s.step}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{s.calls}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{s.cacheHits}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{s.cacheMisses}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      {formatTokens(s.inputTokens)}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      {formatTokens(s.outputTokens)}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      {formatDuration(s.avgDurationMs)}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      {s.errorCount > 0 ? (
                        <span className="text-destructive font-medium">{s.errorCount}</span>
                      ) : (
                        "0"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {steps.length === 0 && (
        <div className="text-muted-foreground">
          {m.stats_no_data()}
        </div>
      )}
    </div>
  )
}
