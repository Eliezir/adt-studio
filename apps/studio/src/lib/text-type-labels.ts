import { msg } from "@lingui/core/macro"
import type { MessageDescriptor } from "@lingui/core"
import { i18n } from "@lingui/core"

const TEXT_TYPE_LABEL_MESSAGES: Record<string, MessageDescriptor> = {
  book_title: msg`Book Title`,
  book_subtitle: msg`Book Subtitle`,
  book_author: msg`Book Author`,
  book_metadata: msg`Book Metadata`,
  section_heading: msg`Section Heading`,
  section_text: msg`Section Text`,
  instruction_text: msg`Instruction Text`,
  activity_number: msg`Activity Number`,
  activity_title: msg`Activity Title`,
  activity_option: msg`Activity Option`,
  activity_input_placeholder_text: msg`Activity Input Placeholder`,
  fill_in_the_blank: msg`Fill in the Blank`,
  image_associated_text: msg`Image Associated Text`,
  image_overlay: msg`Image Overlay`,
  math: msg`Math`,
  standalone_text: msg`Standalone Text`,
  header_text: msg`Header Text`,
  footer_text: msg`Footer Text`,
  page_number: msg`Page Number`,
  other: msg`Other`,
}

const TEXT_GROUP_LABEL_MESSAGES: Record<string, MessageDescriptor> = {
  heading: msg`Heading`,
  paragraph: msg`Paragraph`,
  stanza: msg`Stanza`,
  list: msg`List`,
  table: msg`Table`,
  other: msg`Other`,
}

export function getTextTypeLabel(type: string): string {
  const descriptor = TEXT_TYPE_LABEL_MESSAGES[type]
  if (descriptor) return i18n._(descriptor)
  return type.replace(/_/g, " ")
}

export function getTextGroupLabel(groupType: string): string {
  const descriptor = TEXT_GROUP_LABEL_MESSAGES[groupType]
  if (descriptor) return i18n._(descriptor)
  return groupType.replace(/_/g, " ")
}
