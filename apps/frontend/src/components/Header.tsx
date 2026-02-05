import { Link } from "@tanstack/react-router";

export default function Header() {
  return (
    <header className="scv-masthead sticky top-0 z-40">
      <div className="scv-container flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <Link to="/cases" search={{ sort: "desc" }} className="scv-brand">
            <img
              src="/saikousai.svg"
              alt="再考裁"
              className="scv-logo"
              loading="eager"
              decoding="async"
            />
            <span className="sr-only">再考裁</span>
          </Link>
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
