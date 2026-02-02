import type { ReactNode } from "react";

type SearchFieldProps = {
  label: string;
  htmlFor?: string;
  labelAs?: "label" | "span";
  children: ReactNode;
};

export default function SearchField({
  label,
  htmlFor,
  labelAs = "label",
  children,
}: SearchFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      {labelAs === "label" ? (
        <label className="scv-label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <span className="scv-label">{label}</span>
      )}
      {children}
    </div>
  );
}
