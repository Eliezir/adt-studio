import { useState, useEffect, useCallback, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"

export type StepName =
  | "extract"
  | "metadata"
  | "text-classification"
  | "image-classification"
  | "page-sectioning"
  | "web-rendering"

export interface StepProgress {
  step: StepName
  page?: number
  totalPages?: number
  message?: string
}

export interface PipelineProgress {
  isRunning: boolean
  isComplete: boolean
  error: string | null
  currentStep: StepName | null
  completedSteps: Set<StepName>
  stepProgress: Map<StepName, StepProgress>
}

const INITIAL_PROGRESS: PipelineProgress = {
  isRunning: false,
  isComplete: false,
  error: null,
  currentStep: null,
  completedSteps: new Set(),
  stepProgress: new Map(),
}

/**
 * Hook to subscribe to real-time pipeline progress via SSE.
 * Connects to the SSE endpoint when `enabled` is true.
 */
export function usePipelineSSE(label: string, enabled: boolean) {
  const [progress, setProgress] = useState<PipelineProgress>(INITIAL_PROGRESS)
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled || !label) {
      setProgress(INITIAL_PROGRESS)
      return
    }

    setProgress({
      ...INITIAL_PROGRESS,
      isRunning: true,
    })

    const url = `/api/books/${label}/pipeline/status`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.addEventListener("progress", (e) => {
      const data = JSON.parse(e.data)
      setProgress((prev) => {
        const next = { ...prev }
        const stepProgress = new Map(prev.stepProgress)
        const completedSteps = new Set(prev.completedSteps)

        if (data.type === "step-start") {
          next.currentStep = data.step
        } else if (data.type === "step-progress") {
          stepProgress.set(data.step, {
            step: data.step,
            page: data.page,
            totalPages: data.totalPages,
            message: data.message,
          })
          next.currentStep = data.step
        } else if (data.type === "step-complete") {
          completedSteps.add(data.step)
          stepProgress.delete(data.step)
        } else if (data.type === "step-error") {
          next.error = `${data.step}: ${data.error}`
        }

        next.stepProgress = stepProgress
        next.completedSteps = completedSteps
        return next
      })
    })

    es.addEventListener("complete", () => {
      setProgress((prev) => ({
        ...prev,
        isRunning: false,
        isComplete: true,
        currentStep: null,
      }))
      // Invalidate book data to refresh metadata/page count
      queryClient.invalidateQueries({ queryKey: ["books", label] })
      queryClient.invalidateQueries({ queryKey: ["books"] })
      es.close()
    })

    es.addEventListener("error", (e) => {
      // SSE error can be a connection issue or a pipeline error event
      if (es.readyState === EventSource.CLOSED) {
        return
      }
      // Try to parse error data if it's a MessageEvent
      const messageEvent = e as MessageEvent
      if (messageEvent.data) {
        try {
          const data = JSON.parse(messageEvent.data)
          setProgress((prev) => ({
            ...prev,
            isRunning: false,
            error: data.error ?? "Pipeline failed",
          }))
        } catch {
          setProgress((prev) => ({
            ...prev,
            isRunning: false,
            error: "Connection lost",
          }))
        }
      }
      es.close()
    })

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [label, enabled, queryClient])

  const reset = useCallback(() => {
    setProgress(INITIAL_PROGRESS)
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  return { progress, reset }
}

/**
 * Hook to start a pipeline run.
 */
export function useRunPipeline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      label,
      apiKey,
      options,
    }: {
      label: string
      apiKey: string
      options?: { startPage?: number; endPage?: number; concurrency?: number }
    }) => api.runPipeline(label, apiKey, options),
    onSuccess: (_data, { label }) => {
      queryClient.invalidateQueries({
        queryKey: ["pipeline-status", label],
      })
    },
  })
}

/**
 * Hook to poll pipeline status (non-SSE fallback).
 */
export function usePipelineStatus(label: string) {
  return useQuery({
    queryKey: ["pipeline-status", label],
    queryFn: () => api.getPipelineStatus(label),
    enabled: !!label,
    refetchInterval: false,
  })
}
