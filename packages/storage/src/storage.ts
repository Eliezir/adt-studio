import type { ExtractedPage, PdfMetadata } from "@adt/pdf"

export interface Storage {
  putPdfMetadata(data: PdfMetadata): void
  putExtractedPage(page: ExtractedPage): void
  close(): void
}
