import type { ReadingCase } from "@recourt/types";
import MermaidDiagram from "./MermaidDiagram";
import { legalDiagrams } from "./legal-diagrams";

export default function CaseLegalDiagrams({ courtCase }: { courtCase: ReadingCase }) {
  const topicIds = new Set(courtCase.topics.map((topic) => topic.id));
  const diagrams = legalDiagrams.filter((diagram) =>
    diagram.topicIds.some((topicId) => topicIds.has(topicId)),
  );
  if (diagrams.length === 0) return null;

  return (
    <section
      aria-labelledby="legal-diagrams-heading"
      className="border-b border-[#e8edfa] bg-[#fbfcff] px-5 py-6 sm:px-8"
    >
      <h2 id="legal-diagrams-heading" className="text-lg font-semibold text-[#1d2b4f]">
        法律のしくみを図で見る
      </h2>
      <div className="mt-4 space-y-5">
        {diagrams.map((diagram) => (
          <article
            key={diagram.id}
            className="rounded-xl border border-[#dce5fa] bg-white p-4 sm:p-5"
          >
            <h3 className="font-semibold text-recourt-brandblue">{diagram.title}</h3>
            <p className="mt-2 text-sm leading-[1.8] text-[#536183]">{diagram.summary}</p>
            <p className="mt-2 text-xs leading-[1.8] text-[#657391]">{diagram.scope}</p>
            <div className="mt-4">
              <MermaidDiagram source={diagram.mermaid} label={diagram.title} />
            </div>
            <p className="mt-3 text-xs text-[#7784a1]">
              {diagram.asOf} · 図の版: {diagram.version}
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {diagram.sources.map((source) => (
                <li key={source.label}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-recourt-brandblue underline"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
