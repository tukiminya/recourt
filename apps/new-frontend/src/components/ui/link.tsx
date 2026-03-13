import { type LinkProps, Link as OriginalTanStackLink } from "@tanstack/react-router";
import { cva, type VariantProps } from "cva";
import { type LucideProps, LucideSquareArrowOutUpRight } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

const link = cva(
  "text-blue-800 underline decoration-1 hover:decoration-2 underline-offset-2 visited:text-purple-900 w-fit inline-flex gap-1 items-center",
  {
    variants: {
      size: {
        default: "text-base [&>.lucide]:size-4 [&>.lucide]:stroke-2",
        large: "text-xl [&>.lucide]:size-5 [&>.lucide]:stroke-2",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

function Link(props: ComponentPropsWithoutRef<"a"> & VariantProps<typeof link>) {
  return (
    <a className={link({ size: props.size })} {...props}>
      {props.children}
      <LucideSquareArrowOutUpRight />
    </a>
  );
}

function TanStackLink(props: LinkProps & VariantProps<typeof link>) {
  return (
    <OriginalTanStackLink className={link({ size: props.size })} {...props}>
      {props.children}
    </OriginalTanStackLink>
  );
}

function LinkExternalIcon(props: LucideProps) {
  return <LucideSquareArrowOutUpRight {...props} />;
}

export { Link, TanStackLink, LinkExternalIcon };
