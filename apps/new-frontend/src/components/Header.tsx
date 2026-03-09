import { Logo, LogoWithCatchCopy } from "./Logo";

export function Header({ children }: { children: React.ReactNode }) {
  return (
    <header className="flex gap-6 items-center justify-between py-16 w-full">{children}</header>
  );
}

export function HeaderWithFixed({ children }: { children: React.ReactNode }) {
  return (
    <header className="fixed py-12 top-0 left-1/2 z-50 w-full max-w-500 -translate-x-1/2">
      {children}
    </header>
  );
}

export function HeaderLogo() {
  return <Logo className="h-6 [&>path]:fill-black mix-blend-difference" />;
}

export function HeaderLogoWithCatchCopy() {
  return <LogoWithCatchCopy className="h-6 [&>path]:fill-black mix-blend-difference" />;
}
