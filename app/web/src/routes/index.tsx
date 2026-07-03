import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <main className="mx-auto max-w-[1040px] px-5 py-16">
      <p>ここは現時点で空</p>
    </main>
  );
}
