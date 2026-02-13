import { useState, useCallback, useMemo } from "react"
import { useSaveTextClassification, useSaveImageClassification, useSaveSectioning } from "./use-page-mutations"
import type { PageDetail } from "@/api/client"

type TextClassification = NonNullable<PageDetail["textClassification"]>
type ImageClassification = NonNullable<PageDetail["imageClassification"]>
type Sectioning = NonNullable<PageDetail["sectioning"]>

export interface InlinePageEdit {
  /** Draft state — null until first interaction */
  draftGroups: TextClassification | null
  draftImages: ImageClassification | null
  draftSectioning: Sectioning | null

  /** Lazy-clone + apply updater to text groups */
  updateGroups: (updater: (prev: TextClassification) => TextClassification) => void
  /** Lazy-clone + apply updater to images */
  updateImages: (updater: (prev: ImageClassification) => ImageClassification) => void
  /** Lazy-clone + apply updater to sectioning */
  updateSectioning: (updater: (prev: Sectioning) => Sectioning) => void

  /** Effective data: draft ?? server */
  effectiveGroups: TextClassification | null
  effectiveImages: ImageClassification | null
  effectiveSectioning: Sectioning | null

  /** Change tracking */
  hasChanges: boolean
  changedEntities: string[]

  /** Persistence */
  save: () => Promise<void>
  discard: () => void

  /** Loading state */
  isSaving: boolean
}

export function useInlinePageEdit(
  label: string,
  pageId: string,
  page: PageDetail | undefined
): InlinePageEdit {
  const [draftGroups, setDraftGroups] = useState<TextClassification | null>(null)
  const [draftImages, setDraftImages] = useState<ImageClassification | null>(null)
  const [draftSectioning, setDraftSectioning] = useState<Sectioning | null>(null)

  const saveText = useSaveTextClassification(label, pageId)
  const saveImages = useSaveImageClassification(label, pageId)
  const saveSectioning = useSaveSectioning(label, pageId)

  const updateGroups = useCallback(
    (updater: (prev: TextClassification) => TextClassification) => {
      setDraftGroups((prev) => {
        const base = prev ?? (page?.textClassification ? structuredClone(page.textClassification) : null)
        if (!base) return prev
        return updater(base)
      })
    },
    [page?.textClassification]
  )

  const updateImages = useCallback(
    (updater: (prev: ImageClassification) => ImageClassification) => {
      setDraftImages((prev) => {
        const base = prev ?? (page?.imageClassification ? structuredClone(page.imageClassification) : null)
        if (!base) return prev
        return updater(base)
      })
    },
    [page?.imageClassification]
  )

  const updateSectioning = useCallback(
    (updater: (prev: Sectioning) => Sectioning) => {
      setDraftSectioning((prev) => {
        const base = prev ?? (page?.sectioning ? structuredClone(page.sectioning) : null)
        if (!base) return prev
        return updater(base)
      })
    },
    [page?.sectioning]
  )

  const effectiveGroups = draftGroups ?? page?.textClassification ?? null
  const effectiveImages = draftImages ?? page?.imageClassification ?? null
  const effectiveSectioning = draftSectioning ?? page?.sectioning ?? null

  const groupsChanged = draftGroups !== null && JSON.stringify(draftGroups) !== JSON.stringify(page?.textClassification)
  const imagesChanged = draftImages !== null && JSON.stringify(draftImages) !== JSON.stringify(page?.imageClassification)
  const sectioningChanged = draftSectioning !== null && JSON.stringify(draftSectioning) !== JSON.stringify(page?.sectioning)

  const hasChanges = groupsChanged || imagesChanged || sectioningChanged

  const changedEntities = useMemo(() => {
    const entities: string[] = []
    if (groupsChanged) entities.push("Text groups")
    if (imagesChanged) entities.push("Images")
    if (sectioningChanged) entities.push("Sections")
    return entities
  }, [groupsChanged, imagesChanged, sectioningChanged])

  const save = useCallback(async () => {
    const promises: Promise<unknown>[] = []
    if (groupsChanged && draftGroups) {
      promises.push(saveText.mutateAsync(draftGroups))
    }
    if (imagesChanged && draftImages) {
      promises.push(saveImages.mutateAsync(draftImages))
    }
    if (sectioningChanged && draftSectioning) {
      promises.push(saveSectioning.mutateAsync(draftSectioning))
    }
    await Promise.all(promises)
    setDraftGroups(null)
    setDraftImages(null)
    setDraftSectioning(null)
  }, [groupsChanged, imagesChanged, sectioningChanged, draftGroups, draftImages, draftSectioning, saveText, saveImages, saveSectioning])

  const discard = useCallback(() => {
    setDraftGroups(null)
    setDraftImages(null)
    setDraftSectioning(null)
  }, [])

  const isSaving = saveText.isPending || saveImages.isPending || saveSectioning.isPending

  return {
    draftGroups,
    draftImages,
    draftSectioning,
    updateGroups,
    updateImages,
    updateSectioning,
    effectiveGroups,
    effectiveImages,
    effectiveSectioning,
    hasChanges,
    changedEntities,
    save,
    discard,
    isSaving,
  }
}
