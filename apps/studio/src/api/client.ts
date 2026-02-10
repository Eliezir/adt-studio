const BASE_URL = "/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(!options?.body || options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }

  return res.json()
}

export interface BookSummary {
  label: string
  title: string | null
  authors: string[]
  pageCount: number
  hasSourcePdf: boolean
}

export interface BookDetail extends BookSummary {
  metadata: {
    title: string | null
    authors: string[]
    publisher: string | null
    language_code: string | null
    cover_page_number: number | null
    reasoning: string
  } | null
}

export interface PipelineStatus {
  label: string
  status: "idle" | "running" | "completed" | "failed"
  error?: string
  startedAt?: number
  completedAt?: number
}

export interface RunPipelineOptions {
  startPage?: number
  endPage?: number
  concurrency?: number
}

export const api = {
  getBooks: () => request<BookSummary[]>("/books"),

  getBook: (label: string) => request<BookDetail>(`/books/${label}`),

  createBook: (label: string, pdf: File, config?: Record<string, unknown>) => {
    const formData = new FormData()
    formData.append("label", label)
    formData.append("pdf", pdf)
    if (config) {
      formData.append("config", JSON.stringify(config))
    }
    return request<BookSummary>("/books", {
      method: "POST",
      body: formData,
    })
  },

  deleteBook: (label: string) =>
    request<{ ok: boolean }>(`/books/${label}`, { method: "DELETE" }),

  runPipeline: (
    label: string,
    apiKey: string,
    options?: RunPipelineOptions
  ) =>
    request<{ status: string; label: string }>(
      `/books/${label}/pipeline/run`,
      {
        method: "POST",
        headers: { "X-OpenAI-Key": apiKey },
        body: options ? JSON.stringify(options) : undefined,
      }
    ),

  getPipelineStatus: (label: string) =>
    request<PipelineStatus>(`/books/${label}/pipeline/status`),
}
