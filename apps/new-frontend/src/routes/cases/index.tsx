import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cases/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen">
      <section className="bg-linear-to-br from-neutral-50 to-neutral-100 min-h-72"></section>
    </div>
  );
}
