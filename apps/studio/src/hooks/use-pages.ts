import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"

export function usePages(label: string, options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ["books", label, "pages"],
    queryFn: () => api.getPages(label),
    enabled: !!label,
    refetchInterval: options?.refetchInterval ?? false,
  })
}

export function usePage(label: string, pageId: string) {
  return useQuery({
    queryKey: ["books", label, "pages", pageId],
    queryFn: () => api.getPage(label, pageId),
    enabled: !!label && !!pageId,
  })
}

export function usePageImage(label: string, pageId: string) {
  return useQuery({
    queryKey: ["books", label, "pages", pageId, "image"],
    queryFn: () => api.getPageImage(label, pageId),
    enabled: !!label && !!pageId,
    staleTime: Infinity, // Images don't change
  })
}
