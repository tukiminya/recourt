import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cases/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/cases/"!</div>;
}
