import { cva, type VariantProps } from "cva";
import { type LucideProps, LucideSquareArrowOutUpRight } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

const link = cva(
  "text-blue-800 border-dashed border-b-2 border-blue-800 visited:text-purple-900 visited:border-purple-900 hover:border-solid w-fit flex gap-1 items-center",
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

function LinkExternalIcon(props: LucideProps) {
  return <LucideSquareArrowOutUpRight {...props} />;
}

export { Link, LinkExternalIcon };
