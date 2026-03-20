import { msg } from "@lingui/core/macro"
import type { MessageDescriptor } from "@lingui/core"
import { i18n } from "@lingui/core"

/**
 * Stage label messages keyed by stage slug.
 * Use with useLingui()'s `_` in React components, or `i18n._` outside React.
 */
export const STAGE_LABEL_MESSAGES: Record<string, MessageDescriptor> = {
  book: msg`Book`,
  extract: msg`Extract`,
  storyboard: msg`Storyboard`,
  quizzes: msg`Quizzes`,
  captions: msg`Captions`,
  glossary: msg`Glossary`,
  toc: msg`Table of Contents`,
  "text-and-speech": msg`Text & Speech`,
  preview: msg`Preview`,
  export: msg`Export`,
}

export const STAGE_RUNNING_LABEL_MESSAGES: Record<string, MessageDescriptor> = {
  book: msg`Loading Book...`,
  extract: msg`Extracting...`,
  storyboard: msg`Building Storyboard...`,
  quizzes: msg`Generating Quizzes...`,
  captions: msg`Captioning Images...`,
  glossary: msg`Generating Glossary...`,
  toc: msg`Generating TOC...`,
  "text-and-speech": msg`Generating Text & Speech...`,
  preview: msg`Building Preview...`,
  export: msg`Exporting...`,
}

export const STAGE_DESCRIPTION_MESSAGES: Record<string, MessageDescriptor> = {
  extract: msg`Extract text and images from each page of the PDF using AI-powered analysis.`,
  storyboard: msg`Arrange extracted content into a structured storyboard with pages, sections, and layouts.`,
  quizzes: msg`Generate comprehension quizzes and activities based on the book content.`,
  captions: msg`Create descriptive captions for images to improve accessibility.`,
  glossary: msg`Build a glossary of key terms and definitions found in the text.`,
  toc: msg`Generate and customize the table of contents for the book navigation.`,
  "text-and-speech": msg`Translate the book content and generate audio narration.`,
  preview: msg`Package and preview the final ADT web application.`,
}

export const STEP_LABEL_MESSAGES: Record<string, MessageDescriptor> = {
  extract: msg`PDF Extraction`,
  metadata: msg`Metadata`,
  "book-summary": msg`Book Summary`,
  "image-filtering": msg`Image Filtering`,
  "image-segmentation": msg`Image Segmentation`,
  "image-cropping": msg`Image Cropping`,
  "image-meaningfulness": msg`Image Meaningfulness`,
  "text-classification": msg`Text Classification`,
  translation: msg`Translation`,
  "page-sectioning": msg`Page Sectioning`,
  "web-rendering": msg`Web Rendering`,
  "quiz-generation": msg`Quiz Generation`,
  "image-captioning": msg`Image Captioning`,
  glossary: msg`Glossary Generation`,
  "toc-generation": msg`Table of Contents`,
  "text-catalog": msg`Text Catalog`,
  "catalog-translation": msg`Catalog Translation`,
  tts: msg`Speech Generation`,
  "package-web": msg`Web Package`,
}

/** Resolve a stage label message descriptor to a translated string. Safe to call outside React. */
export function getStageLabelI18n(slug: string): string {
  const descriptor = STAGE_LABEL_MESSAGES[slug]
  return descriptor ? i18n._(descriptor) : slug
}

/** Resolve a stage running label message descriptor to a translated string. Safe to call outside React. */
export function getStageRunningLabelI18n(slug: string): string {
  const descriptor = STAGE_RUNNING_LABEL_MESSAGES[slug]
  return descriptor ? i18n._(descriptor) : slug
}

/** Resolve a stage description message descriptor to a translated string. Safe to call outside React. */
export function getStageDescriptionI18n(slug: string): string | undefined {
  const descriptor = STAGE_DESCRIPTION_MESSAGES[slug]
  return descriptor ? i18n._(descriptor) : undefined
}

/** Resolve a step label message descriptor to a translated string. Safe to call outside React. */
export function getStepLabelI18n(slug: string): string {
  const descriptor = STEP_LABEL_MESSAGES[slug]
  return descriptor ? i18n._(descriptor) : slug
}
