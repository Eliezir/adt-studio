import { msg } from "@lingui/core/macro";
import type { MessageDescriptor } from "@lingui/core";

/**
 * Real screenshots of ADT Studio v0.8 (1440×900 @2x), captured from the
 * packaged app on a demo library. Files live in `public/screens/`.
 */
export type Screen = {
  key: string;
  file: string;
  alt: MessageDescriptor;
  width: number;
  height: number;
};

const SIZE = { width: 2880, height: 2000 };

export const SCREENS = {
  homeEmpty: {
    key: "home-empty",
    file: "home-empty",
    alt: msg`ADT Studio home screen on first launch, with the welcome card and the reader features.`,
    ...SIZE,
  },
} satisfies Record<string, Screen>;

export function screenSrc(screen: Screen): string {
  return `${import.meta.env.BASE_URL}screens/${screen.file}.webp`;
}
