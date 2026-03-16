/** Optional i18n message key (Paraglide) for the label; descKey for the description. */
export const SECTION_TYPES = [
  // Content
  { value: "text_only", label: "Text Only", labelKey: "section_type_text_only" as const, descKey: "section_type_desc_text_only" as const },
  { value: "text_and_single_image", label: "Text & Single Image", labelKey: "section_type_text_and_single_image" as const, descKey: "section_type_desc_text_and_single_image" as const },
  { value: "text_and_images", label: "Text & Images", labelKey: "section_type_text_and_images" as const, descKey: "section_type_desc_text_and_images" as const },
  { value: "images_only", label: "Images Only", labelKey: "section_type_images_only" as const, descKey: "section_type_desc_images_only" as const },
  { value: "boxed_text", label: "Boxed Text", labelKey: "section_type_boxed_text" as const, descKey: "section_type_desc_boxed_text" as const },
  // Activities
  { value: "activity_matching", label: "Activity: Matching", labelKey: "storyboard_settings_activity_matching" as const, descKey: "section_type_desc_activity_matching" as const },
  { value: "activity_fill_in_a_table", label: "Activity: Fill in a Table", labelKey: "storyboard_settings_activity_fill_in_a_table" as const, descKey: "section_type_desc_activity_fill_in_a_table" as const },
  { value: "activity_multiple_choice", label: "Activity: Multiple Choice", labelKey: "storyboard_settings_activity_multiple_choice" as const, descKey: "section_type_desc_activity_multiple_choice" as const },
  { value: "activity_true_false", label: "Activity: True / False", labelKey: "storyboard_settings_activity_true_false" as const, descKey: "section_type_desc_activity_true_false" as const },
  { value: "activity_open_ended_answer", label: "Activity: Open-Ended Answer", labelKey: "storyboard_settings_activity_open_ended_answer" as const, descKey: "section_type_desc_activity_open_ended_answer" as const },
  { value: "activity_fill_in_the_blank", label: "Activity: Fill in the Blank", labelKey: "storyboard_settings_activity_fill_in_the_blank" as const, descKey: "section_type_desc_activity_fill_in_the_blank" as const },
  { value: "activity_sorting", label: "Activity: Sorting", labelKey: "storyboard_settings_activity_sorting" as const, descKey: "section_type_desc_activity_sorting" as const },
  // Structure
  { value: "front_cover", label: "Front Cover", labelKey: "section_type_front_cover" as const, descKey: "section_type_desc_front_cover" as const },
  { value: "inside_cover", label: "Inside Cover", labelKey: "section_type_inside_cover" as const, descKey: "section_type_desc_inside_cover" as const },
  { value: "back_cover", label: "Back Cover", labelKey: "section_type_back_cover" as const, descKey: "section_type_desc_back_cover" as const },
  { value: "separator", label: "Separator", labelKey: "section_type_separator" as const, descKey: "section_type_desc_separator" as const },
  { value: "credits", label: "Credits", labelKey: "section_type_credits" as const, descKey: "section_type_desc_credits" as const },
  { value: "foreword", label: "Foreword", labelKey: "section_type_foreword" as const, descKey: "section_type_desc_foreword" as const },
  { value: "table_of_contents", label: "Table of Contents", labelKey: "section_type_table_of_contents" as const, descKey: "section_type_desc_table_of_contents" as const },
  // Other
  { value: "other", label: "Other", labelKey: "section_type_other" as const, descKey: "section_type_desc_other" as const },
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

export function getSectionTypeLabel(value: string): string {
  const found = SECTION_TYPES.find((t) => t.value === value)
  return found?.label ?? value
}

/** Return the i18n message key for the section type label, or undefined if not found (use fallback label). */
export function getSectionTypeLabelKey(value: string): (typeof SECTION_TYPES)[number]["labelKey"] | undefined {
  const found = SECTION_TYPES.find((t) => t.value === value)
  return found?.labelKey
}

/** Return the i18n message key for the section type description, or undefined if not found (use config description). */
export function getSectionTypeDescKey(value: string): (typeof SECTION_TYPES)[number]["descKey"] | undefined {
  const found = SECTION_TYPES.find((t) => t.value === value)
  return found?.descKey
}
