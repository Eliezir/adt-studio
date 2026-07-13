import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/shell')({
  component: Shell,
});

function Shell() {
  return null;
}
