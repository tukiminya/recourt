import type { AnchorHTMLAttributes } from "react";

export function Link({ className, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={[
        "font-medium text-recourt-brandblue underline underline-offset-4 hover:opacity-75",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </a>
  );
}
