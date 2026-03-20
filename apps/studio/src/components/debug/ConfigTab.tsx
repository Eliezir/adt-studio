import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react/macro"
import { useActiveConfig } from "@/hooks/use-debug"
import { Badge } from "@/components/ui/badge"

interface ConfigTabProps {
  label: string
}

function ConfigSection({ title, data }: { title: string; data: unknown }) {
  if (data == null) return null

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-2 bg-muted/30 border-b">
        <h4 className="text-xs font-medium">{title}</h4>
      </div>
      <pre className="p-4 text-[11px] whitespace-pre-wrap overflow-auto max-h-64">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export function ConfigTab({ label }: ConfigTabProps) {
  const { t } = useLingui()
  const { data, isLoading, error } = useActiveConfig(label)

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        <Trans>Loading config...</Trans>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-destructive">
        <Trans>Failed to load config:</Trans> {error.message}
      </div>
    )
  }

  if (!data) return null

  const { merged, hasBookOverride } = data
  const config = merged as Record<string, unknown>

  const sections = [
    { key: "text_types", title: t`Text Types` },
    { key: "group_types", title: t`Group Types` },
    { key: "section_types", title: t`Section Types` },
    { key: "metadata_extraction", title: t`Metadata Extraction` },
    { key: "text_classification", title: t`Text Classification` },
    { key: "image_filters", title: t`Image Filtering` },
    { key: "page_sectioning", title: t`Page Sectioning` },
    { key: "default_render_strategy", title: t`Default Render Strategy` },
    { key: "render_strategies", title: t`Render Strategies` },
    { key: "section_render_strategies", title: t`Section Render Strategies` },
  ]

  const knownKeys = new Set(sections.map((s) => s.key))
  const otherKeys = Object.keys(config).filter((k) => !knownKeys.has(k))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          <Trans>Active Configuration</Trans>
        </span>
        {hasBookOverride ? (
          <Badge variant="default" className="text-xs">
            <Trans>Book Override</Trans>
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            <Trans>Global Only</Trans>
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map(({ key, title }) =>
          config[key] != null ? (
            <ConfigSection key={key} title={title} data={config[key]} />
          ) : null
        )}

        {otherKeys.map((key) => (
          <ConfigSection key={key} title={key} data={config[key]} />
        ))}
      </div>
    </div>
  )
}
