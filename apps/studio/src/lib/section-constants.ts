import { msg } from "@lingui/core/macro"
import type { MessageDescriptor } from "@lingui/core"
import { i18n } from "@lingui/core"

export const SECTION_TYPES = [
  // Content
  { value: "text_only", label: "Text Only" },
  { value: "text_and_single_image", label: "Text & Single Image" },
  { value: "text_and_images", label: "Text & Images" },
  { value: "images_only", label: "Images Only" },
  { value: "boxed_text", label: "Boxed Text" },
  // Activities
  { value: "activity_matching", label: "Activity: Matching" },
  { value: "activity_fill_in_a_table", label: "Activity: Fill in a Table" },
  { value: "activity_multiple_choice", label: "Activity: Multiple Choice" },
  { value: "activity_true_false", label: "Activity: True / False" },
  { value: "activity_open_ended_answer", label: "Activity: Open-Ended Answer" },
  { value: "activity_fill_in_the_blank", label: "Activity: Fill in the Blank" },
  { value: "activity_sorting", label: "Activity: Sorting" },
  // Structure
  { value: "front_cover", label: "Front Cover" },
  { value: "inside_cover", label: "Inside Cover" },
  { value: "back_cover", label: "Back Cover" },
  { value: "separator", label: "Separator" },
  { value: "credits", label: "Credits" },
  { value: "foreword", label: "Foreword" },
  { value: "table_of_contents", label: "Table of Contents" },
  // Other
  { value: "other", label: "Other" },
] as const

export const SECTION_TYPE_GROUPS = [
  {
    label: "Content",
    types: SECTION_TYPES.filter(
      (t) =>
        ["text_only", "text_and_single_image", "text_and_images", "images_only", "boxed_text"].includes(t.value)
    ),
  },
  {
    label: "Activities",
    types: SECTION_TYPES.filter((t) => t.value.startsWith("activity_")),
  },
  {
    label: "Structure",
    types: SECTION_TYPES.filter((t) =>
      ["front_cover", "inside_cover", "back_cover", "separator", "credits", "foreword", "table_of_contents"].includes(
        t.value
      )
    ),
  },
  {
    label: "Other",
    types: SECTION_TYPES.filter((t) => t.value === "other"),
  },
] as const

const SECTION_TYPE_LABEL_MESSAGES: Record<string, MessageDescriptor> = {
  text_only: msg`Text Only`,
  text_and_single_image: msg`Text & Single Image`,
  text_and_images: msg`Text & Images`,
  images_only: msg`Images Only`,
  boxed_text: msg`Boxed Text`,
  activity_matching: msg`Activity: Matching`,
  activity_fill_in_a_table: msg`Activity: Fill in a Table`,
  activity_multiple_choice: msg`Activity: Multiple Choice`,
  activity_true_false: msg`Activity: True / False`,
  activity_open_ended_answer: msg`Activity: Open-Ended Answer`,
  activity_fill_in_the_blank: msg`Activity: Fill in the Blank`,
  activity_sorting: msg`Activity: Sorting`,
  front_cover: msg`Front Cover`,
  inside_cover: msg`Inside Cover`,
  back_cover: msg`Back Cover`,
  separator: msg`Separator`,
  credits: msg`Credits`,
  foreword: msg`Foreword`,
  table_of_contents: msg`Table of Contents`,
  other: msg`Other`,
}

const SECTION_TYPE_DESC_MESSAGES: Record<string, MessageDescriptor> = {
  text_only: msg`A section containing only text content.`,
  text_and_single_image: msg`A section with text and a single image.`,
  text_and_images: msg`A section with text and multiple images.`,
  images_only: msg`A section containing only images.`,
  boxed_text: msg`A section with text in a highlighted box.`,
  activity_matching: msg`A matching activity where students connect related items.`,
  activity_fill_in_a_table: msg`A table-filling activity.`,
  activity_multiple_choice: msg`A multiple choice activity.`,
  activity_true_false: msg`A true or false activity.`,
  activity_open_ended_answer: msg`An open-ended answer activity.`,
  activity_fill_in_the_blank: msg`A fill-in-the-blank activity.`,
  activity_sorting: msg`A sorting activity.`,
  front_cover: msg`The front cover of the book.`,
  inside_cover: msg`The inside cover of the book.`,
  back_cover: msg`The back cover of the book.`,
  separator: msg`A separator page between sections.`,
  credits: msg`The credits page.`,
  foreword: msg`The foreword or introduction.`,
  table_of_contents: msg`The table of contents.`,
  other: msg`Any other section type.`,
}

export function getSectionTypeLabel(value: string): string {
  const descriptor = SECTION_TYPE_LABEL_MESSAGES[value]
  if (descriptor) return i18n._(descriptor)
  const found = SECTION_TYPES.find((t) => t.value === value)
  return found?.label ?? value
}

export function getSectionTypeDescription(value: string): string | undefined {
  const descriptor = SECTION_TYPE_DESC_MESSAGES[value]
  return descriptor ? i18n._(descriptor) : undefined
}

export function getSectionTypeLabelMsg(value: string): MessageDescriptor | undefined {
  return SECTION_TYPE_LABEL_MESSAGES[value]
}

export function getSectionTypeDescMsg(value: string): MessageDescriptor | undefined {
  return SECTION_TYPE_DESC_MESSAGES[value]
}
