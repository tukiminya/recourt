import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cases/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/cases/$id"!</div>
}
