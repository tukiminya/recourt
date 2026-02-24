import { LogoWithCatchCopy } from "./Logo";

export default function Header() {
  return (
    <header className="fixed p-12 top-0 left-1/2 z-50 w-full max-w-500 -translate-x-1/2">
      <LogoWithCatchCopy className="[&>path]:fill-black mix-blend-difference" />
    </header>
  );
}
