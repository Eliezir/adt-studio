import * as m from "@/paraglide/messages"

const TEXT_TYPE_LABEL_KEYS: Record<string, string> = {
  book_title: "text_type_book_title",
  book_subtitle: "text_type_book_subtitle",
  book_author: "text_type_book_author",
  book_metadata: "text_type_book_metadata",
  section_heading: "text_type_section_heading",
  section_text: "text_type_section_text",
  instruction_text: "text_type_instruction_text",
  activity_number: "text_type_activity_number",
  activity_title: "text_type_activity_title",
  activity_option: "text_type_activity_option",
  activity_input_placeholder_text: "text_type_activity_input_placeholder_text",
  fill_in_the_blank: "text_type_fill_in_the_blank",
  image_associated_text: "text_type_image_associated_text",
  image_overlay: "text_type_image_overlay",
  math: "text_type_math",
  standalone_text: "text_type_standalone_text",
  header_text: "text_type_header_text",
  footer_text: "text_type_footer_text",
  page_number: "text_type_page_number",
  other: "text_type_other",
}

const TEXT_GROUP_LABEL_KEYS: Record<string, string> = {
  heading: "text_group_heading",
  paragraph: "text_group_paragraph",
  stanza: "text_group_stanza",
  list: "text_group_list",
  table: "text_group_table",
  other: "text_group_other",
}

const messages = m as unknown as Record<string, () => string>

export function getTextTypeLabel(type: string): string {
  const key = TEXT_TYPE_LABEL_KEYS[type]
  if (key && key in messages) return messages[key]()
  return type.replace(/_/g, " ")
}

export function getTextGroupLabel(groupType: string): string {
  const key = TEXT_GROUP_LABEL_KEYS[groupType]
  if (key && key in messages) return messages[key]()
  return groupType.replace(/_/g, " ")
}

