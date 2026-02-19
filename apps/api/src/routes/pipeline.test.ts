import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"
import {
  createPipelineService,
  type PipelineRunner,
} from "../services/pipeline-service.js"
import { createPipelineRoutes } from "./pipeline.js"
import { errorHandler } from "../middleware/error-handler.js"

function createMockRunner(behavior?: {
  delay?: number
  shouldFail?: boolean
  errorMessage?: string
}): PipelineRunner {
  return {
    run: vi.fn(async (_label, _options, progress) => {
      if (behavior?.delay) {
        await new Promise((r) => setTimeout(r, behavior.delay))
      }
      if (behavior?.shouldFail) {
        throw new Error(behavior.errorMessage ?? "Pipeline failed")
      }
      progress.emit({ type: "step-start", step: "extract" })
      progress.emit({ type: "step-complete", step: "extract" })
    }),
  }
}

function createTestApp(runner: PipelineRunner): { app: Hono; runner: PipelineRunner } {
  const service = createPipelineService(runner)
  const routes = createPipelineRoutes(service, "/tmp/books", "/tmp/prompts")
  const app = new Hono()
  app.onError(errorHandler)
  app.route("/api", routes)
  return { app, runner }
}

describe("Pipeline routes", () => {
  let runner: PipelineRunner
  let app: Hono

  beforeEach(() => {
    runner = createMockRunner()
    const result = createTestApp(runner)
    app = result.app
    runner = result.runner
  })

  describe("POST /api/books/:label/pipeline/run", () => {
    it("starts pipeline and returns status", async () => {
      const res = await app.request(
        "/api/books/my-book/pipeline/run",
        {
          method: "POST",
          headers: {
            "X-OpenAI-Key": "sk-test-key",
          },
        }
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe("started")
    })

    it("requires API key header", async () => {
      const res = await app.request(
        "/api/books/my-book/pipeline/run",
        { method: "POST" }
      )

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("API key")
    })

    it("rejects duplicate runs", async () => {
      const slowRunner = createMockRunner({ delay: 500 })
      const { app: testApp } = createTestApp(slowRunner)

      // First run
      const res1 = await testApp.request(
        "/api/books/my-book/pipeline/run",
        {
          method: "POST",
          headers: { "X-OpenAI-Key": "sk-test" },
        }
      )
      expect(res1.status).toBe(200)

      // Wait for the first run to be registered
      await new Promise((r) => setTimeout(r, 20))

      // Second run while first is still running
      const res2 = await testApp.request(
        "/api/books/my-book/pipeline/run",
        {
          method: "POST",
          headers: { "X-OpenAI-Key": "sk-test" },
        }
      )
      expect(res2.status).toBe(409)
    })

    it("accepts optional run config in body", async () => {
      const res = await app.request(
        "/api/books/my-book/pipeline/run",
        {
          method: "POST",
          headers: {
            "X-OpenAI-Key": "sk-test-key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startPage: 1,
            endPage: 5,
          }),
        }
      )

      expect(res.status).toBe(200)

      // Wait for async pipeline to complete
      await new Promise((r) => setTimeout(r, 50))

      expect(runner.run).toHaveBeenCalledWith(
        "my-book",
        expect.objectContaining({
          startPage: 1,
          endPage: 5,
        }),
        expect.anything()
      )
    })

    it("rejects unsupported run options", async () => {
      const res = await app.request(
        "/api/books/my-book/pipeline/run",
        {
          method: "POST",
          headers: {
            "X-OpenAI-Key": "sk-test-key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            concurrency: 4,
          }),
        }
      )

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("Invalid pipeline run options")
    })

    it("rejects invalid page range", async () => {
      const res = await app.request(
        "/api/books/my-book/pipeline/run",
        {
          method: "POST",
          headers: {
            "X-OpenAI-Key": "sk-test-key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startPage: 5,
            endPage: 1,
          }),
        }
      )

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("endPage")
    })

    it("rejects invalid JSON body", async () => {
      const res = await app.request(
        "/api/books/my-book/pipeline/run",
        {
          method: "POST",
          headers: {
            "X-OpenAI-Key": "sk-test-key",
            "Content-Type": "application/json",
          },
          body: "{not-json",
        }
      )

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("Invalid JSON body")
    })
  })

  describe("GET /api/books/:label/pipeline/status", () => {
    it("returns status for a book", async () => {
      // Start a pipeline first
      await app.request("/api/books/my-book/pipeline/run", {
        method: "POST",
        headers: { "X-OpenAI-Key": "sk-test" },
      })

      // Wait for completion
      await new Promise((r) => setTimeout(r, 50))

      const res = await app.request(
        "/api/books/my-book/pipeline/status"
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe("completed")
      expect(body.label).toBe("my-book")
    })

    it("returns idle for unknown book", async () => {
      const res = await app.request(
        "/api/books/unknown/pipeline/status"
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe("idle")
    })
  })
})
