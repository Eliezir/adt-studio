import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, FileText, Image, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { usePage, usePageImage, usePages } from "@/hooks/use-pages"

export const Route = createFileRoute("/books/$label/pages/$pageId")({
  component: PageDetailPage,
})

function PageDetailPage() {
  const { label, pageId } = Route.useParams()
  const navigate = useNavigate()
  const { data: page, isLoading, error } = usePage(label, pageId)
  const { data: imageData } = usePageImage(label, pageId)
  const { data: allPages } = usePages(label)

  if (isLoading) {
    return <div className="text-muted-foreground">Loading page...</div>
  }

  if (error) {
    return (
      <div className="text-destructive">
        Failed to load page: {error.message}
      </div>
    )
  }

  if (!page) return null

  // Find prev/next pages for navigation
  const currentIndex = allPages?.findIndex((p) => p.pageId === pageId) ?? -1
  const prevPage = currentIndex > 0 ? allPages?.[currentIndex - 1] : null
  const nextPage =
    allPages && currentIndex < allPages.length - 1
      ? allPages[currentIndex + 1]
      : null

  // Combine all section HTMLs into a single preview
  const combinedHtml = page.rendering?.sections
    .map((s) => s.html)
    .join("\n")

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() =>
            navigate({
              to: "/books/$label/storyboard",
              params: { label },
            })
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Storyboard
        </Button>

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={!prevPage}
            onClick={() =>
              prevPage &&
              navigate({
                to: "/books/$label/pages/$pageId",
                params: { label, pageId: prevPage.pageId },
              })
            }
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!nextPage}
            onClick={() =>
              nextPage &&
              navigate({
                to: "/books/$label/pages/$pageId",
                params: { label, pageId: nextPage.pageId },
              })
            }
          >
            Next
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>

      <h1 className="mb-6 text-2xl font-bold">
        Page {page.pageNumber}
      </h1>

      {/* Two-column layout: original image vs rendered HTML */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Original page image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="h-4 w-4" />
              Original Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            {imageData ? (
              <img
                src={`data:image/png;base64,${imageData.imageBase64}`}
                alt={`Page ${page.pageNumber}`}
                className="w-full rounded border"
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded border bg-muted text-sm text-muted-foreground">
                No image available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rendered HTML preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Rendered Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            {combinedHtml ? (
              <div
                className="prose prose-sm max-w-none rounded border bg-white p-4"
                dangerouslySetInnerHTML={{ __html: combinedHtml }}
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded border bg-muted text-sm text-muted-foreground">
                Not yet rendered. Run the pipeline first.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section details */}
      {page.rendering && page.sectioning && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Sections ({page.rendering.sections.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {page.rendering.sections.map((section, i) => {
                const sectionMeta = page.sectioning?.sections[i]
                return (
                  <div key={i} className="rounded border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline">
                        {section.sectionType}
                      </Badge>
                      {sectionMeta && (
                        <div className="flex gap-1">
                          <span
                            className="inline-block h-4 w-4 rounded border"
                            style={{
                              backgroundColor:
                                sectionMeta.backgroundColor,
                            }}
                            title={`bg: ${sectionMeta.backgroundColor}`}
                          />
                          <span
                            className="inline-block h-4 w-4 rounded border"
                            style={{
                              backgroundColor: sectionMeta.textColor,
                            }}
                            title={`text: ${sectionMeta.textColor}`}
                          />
                        </div>
                      )}
                    </div>
                    <div
                      className="prose prose-sm max-w-none rounded bg-white p-3"
                      dangerouslySetInnerHTML={{ __html: section.html }}
                    />
                    {section.reasoning && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {section.reasoning}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Text classification */}
      {page.textClassification && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Text Groups ({page.textClassification.groups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {page.textClassification.groups.map((group) => (
                <div key={group.groupId} className="rounded border p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="secondary">{group.groupType}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {group.groupId}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {group.texts.map((t, i) => (
                      <div
                        key={i}
                        className={`text-sm ${t.isPruned ? "text-muted-foreground line-through" : ""}`}
                      >
                        <span className="mr-1 text-xs text-muted-foreground">
                          [{t.textType}]
                        </span>
                        {t.text}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
