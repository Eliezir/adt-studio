// @vitest-environment jsdom
import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

const interpolate = (strings: TemplateStringsArray, ...values: unknown[]) => {
  let text = ""
  for (let index = 0; index < strings.length; index += 1) {
    text += strings[index]
    if (index < values.length) text += String(values[index])
  }
  return text
}

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLingui: () => ({ t: interpolate, i18n: { _: (d: { id?: string }) => d?.id ?? "" } }),
}))

const { ParamGrid } = await import("./LlmLogsTab")

describe("ParamGrid", () => {
  afterEach(cleanup)

  // The point of the request-settings block: the user can read which
  // voice_settings produced a given audio file.
  it("renders each parameter with a human-readable label", () => {
    render(
      <ParamGrid
        title="Request settings"
        data={{ stability: 0.7, similarityBoost: 0.5, outputFormat: "mp3_44100_128" }}
      />
    )

    expect(screen.getByText("Request settings")).toBeTruthy()
    expect(screen.getByText("Stability")).toBeTruthy()
    expect(screen.getByText("0.7")).toBeTruthy()
    expect(screen.getByText("Similarity")).toBeTruthy()
    expect(screen.getByText("Format")).toBeTruthy()
    expect(screen.getByText("mp3_44100_128")).toBeTruthy()
  })

  it("renders booleans as Yes/No rather than raw values", () => {
    render(<ParamGrid title="Request settings" data={{ contextBefore: true, contextAfter: false }} />)

    expect(screen.getByText("Yes")).toBeTruthy()
    expect(screen.getByText("No")).toBeTruthy()
  })

  // A style of 0 is meaningful — it's the recommended value that suppresses
  // hallucinated filler sounds — so it must not be dropped as falsy.
  it("renders a zero value", () => {
    render(<ParamGrid title="Request settings" data={{ style: 0 }} />)

    expect(screen.getByText("Style")).toBeTruthy()
    expect(screen.getByText("0")).toBeTruthy()
  })

  // A param added by a future provider must still show up, keyed by its raw
  // name, rather than being silently dropped for lacking a translation.
  it("falls back to the raw key for an unlabelled parameter", () => {
    render(<ParamGrid title="Request settings" data={{ someNewKnob: "abc" }} />)

    expect(screen.getByText("someNewKnob")).toBeTruthy()
    expect(screen.getByText("abc")).toBeTruthy()
  })

  it("renders nothing when there are no parameters", () => {
    const { container } = render(<ParamGrid title="Request settings" data={{}} />)

    expect(container.textContent).toBe("")
  })
})
