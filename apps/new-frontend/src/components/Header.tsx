import { LogoWithCatchCopy } from "./Logo";

export default function Header() {
  return (
    <header className="fixed p-12 top-0 left-0 z-50">
      <LogoWithCatchCopy className="[&>path]:fill-white mix-blend-difference" />
    </header>
  );
}
