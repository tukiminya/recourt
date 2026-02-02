import { Link } from "@tanstack/react-router";

export default function Header() {
  return (
    <header className="scv-masthead sticky top-0 z-40">
      <div className="scv-container flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <Link to="/cases" search={{ sort: "desc" }} className="scv-brand">
            最高裁判例アーカイブ
          </Link>
          <span className="hidden md:inline text-xs text-[var(--ink-3)] tracking-[0.3em]">
            Supreme Court Viewer
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <Link to="/cases" search={{ sort: "desc" }} className="scv-navlink">
            判例一覧
          </Link>
        </nav>
      </div>
    </header>
  );
}
