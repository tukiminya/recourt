import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Header, HeaderLogo } from "../Header";
import { Logo } from "../Logo";

export function GridSystem({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-12 auto-cols-[64px] gap-8">{children}</div>;
}

export function BasicBaseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl min-h-screen flex flex-col">
      <Header>
        <Link to="/">
          <HeaderLogo />
        </Link>
        <div>
          <button
            type="button"
            className="hover:bg-neutral-100 hover:underline underline-offset-2 rounded-full px-4 py-2 cursor-pointer text-sm flex items-center gap-2"
          >
            <span>Create by</span>
            <img
              className="h-4 aspect-square object-cover rounded-full"
              src="https://pbs.twimg.com/profile_images/2022328782808621061/nGP4-_HO_400x400.jpg"
              alt="つきみんのアイコン"
            />
            <span>つきみん</span>
          </button>
        </div>
      </Header>
      {children}
      <footer className="border-t border-neutral-200 py-12 mt-16">
        <div className="text-neutral-700 text-xs w-fit mx-auto">
          <Logo className="h-5 mx-auto mb-4" />
          <span>© {new Date().getFullYear()} 再考裁</span>
        </div>
      </footer>
    </div>
  );
}
