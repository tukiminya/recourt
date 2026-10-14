import { useEffect, useId, useState } from "react";

let mermaidModule: Promise<typeof import("mermaid").default> | null = null;

function loadMermaid() {
  mermaidModule ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
    return mermaid;
  });
  return mermaidModule;
}

export default function MermaidDiagram({ source, label }: { source: string; label: string }) {
  const rawId = useId();
  const id = `legal-diagram-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setSvg("");
    setFailed(false);
    void loadMermaid()
      .then((mermaid) => mermaid.render(id, source))
      .then(({ svg: rendered }) => {
        if (active) setSvg(rendered);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [id, source]);

  if (failed) {
    return (
      <p role="status" className="rounded-lg bg-[#f8faff] p-3 text-xs text-[#657391]">
        図を表示できませんでした。下の説明と法令の出典をご確認ください。
      </p>
    );
  }
  if (!svg)
    return (
      <p role="status" className="text-xs text-[#657391]">
        図を読み込んでいます…
      </p>
    );

  return (
    <div
      role="img"
      aria-label={label}
      className="overflow-x-auto rounded-xl border border-[#e4eafa] bg-white p-4 [&_svg]:mx-auto [&_svg]:max-w-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
