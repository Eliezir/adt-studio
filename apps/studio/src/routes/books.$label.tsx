import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/books/$label")({
  component: BookLayout,
})

function BookLayout() {
  return <Outlet />
}
