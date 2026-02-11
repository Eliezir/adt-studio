import { useRef, useMemo, useEffect } from "react"
import DOMPurify from "dompurify"

/**
 * Renders HTML content and gracefully handles broken images by replacing
 * them with a styled placeholder showing the alt text.
 */
export function RenderedHtml({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const sanitizedHtml = useMemo(
    () => DOMPurify.sanitize(html),
    [html]
  )

  useEffect(() => {
    if (!ref.current) return

    // Strip inline font-family from all elements so the app font is used consistently
    const allEls = ref.current.querySelectorAll("*")
    for (const el of allEls) {
      if (el instanceof HTMLElement && el.style.fontFamily) {
        el.style.fontFamily = ""
      }
    }

    const imgs = ref.current.querySelectorAll("img")
    for (const img of imgs) {
      img.onerror = () => {
        const placeholder = document.createElement("div")
        placeholder.style.cssText =
          "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;" +
          "min-height:120px;padding:16px;border-radius:8px;" +
          "border:2px dashed #d1d5db;background:#f9fafb;"

        // Icon (SVG inline since we can't use React components here)
        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        icon.setAttribute("width", "32")
        icon.setAttribute("height", "32")
        icon.setAttribute("viewBox", "0 0 24 24")
        icon.setAttribute("fill", "none")
        icon.setAttribute("stroke", "#9ca3af")
        icon.setAttribute("stroke-width", "1.5")
        icon.innerHTML =
          '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
          '<circle cx="9" cy="9" r="2"/>' +
          '<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>' +
          '<line x1="2" y1="2" x2="22" y2="22" stroke="#ef4444" stroke-width="2"/>'
        placeholder.appendChild(icon)

        // Alt text label
        if (img.alt) {
          const label = document.createElement("span")
          label.style.cssText = "font-size:13px;font-weight:500;color:#6b7280;text-align:center;"
          label.textContent = img.alt
          placeholder.appendChild(label)
        }

        // Error detail with src path
        const detail = document.createElement("span")
        detail.style.cssText = "font-size:11px;color:#9ca3af;text-align:center;word-break:break-all;max-width:100%;"
        const src = img.getAttribute("src") || ""
        detail.textContent = src ? `Image not found: ${src}` : "Image source unavailable"
        placeholder.appendChild(detail)

        img.replaceWith(placeholder)
      }
    }
  }, [sanitizedHtml])

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
