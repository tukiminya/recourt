import { Link } from "@tanstack/react-router";
import RecourtLogo from "./logo/RecourtLogo";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e8edfa] bg-white/95 backdrop-blur-sm">
      <nav
        className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-5 md:px-8"
        aria-label="メインナビゲーション"
      >
        <Link to="/" search={{ topics: "" }} className="inline-flex shrink-0 items-center gap-4" aria-label="再考裁 ホーム">
          <RecourtLogo variant="header" className="h-6 fill-recourt-brandblue" />
          <span className="hidden border-l border-[#dce5fa] pl-4 text-xs leading-snug text-[#61708f] sm:block">
            判例を読むときの、
            <br />
            開かれた入り口に。
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-[#edf2ff] px-3 py-1 text-xs font-medium text-recourt-brandblue sm:inline-flex">
            体験検証中
          </span>
          <a
            href="/#try"
            className="rounded-lg bg-recourt-brandblue px-4 py-2 text-xs font-medium text-white hover:bg-[#1523a0] sm:text-sm"
          >
            判例を探す
          </a>
        </div>
      </nav>
    </header>
  );
}
