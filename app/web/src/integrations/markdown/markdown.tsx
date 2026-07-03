import { Link } from "#/components/Link";
import Markdown from "react-markdown";
import remarkCjkFriendly from "remark-cjk-friendly";

type MarkdownRendererProps = {
  children: string;
  paragraphClassName?: string;
  inline?: boolean;
};

const defaultParagraphClassName = "text-[16px] leading-[1.7] tracking-[0.02em] text-neutral-900";

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function MarkdownRenderer({
  children,
  paragraphClassName = defaultParagraphClassName,
  inline = false,
}: MarkdownRendererProps) {
  return (
    <Markdown
      remarkPlugins={[remarkCjkFriendly]}
      components={{
        a(props) {
          return <Link {...props} />;
        },
        p({ children }) {
          if (inline) {
            return <>{children}</>;
          }

          return <p className={paragraphClassName}>{children}</p>;
        },
        strong({ className, ...props }) {
          return (
            <strong
              className={classNames("font-bold underline underline-offset-4", className)}
              {...props}
            />
          );
        },
      }}
    >
      {children}
    </Markdown>
  );
}
