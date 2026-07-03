import { Link as RouterLink } from "@tanstack/react-router";
import { LucideChevronDown, LucideSearch } from "lucide-react";
import RecourtLogo from "./logo/RecourtLogo";

const navItems = ["コラム", "再考裁について"];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 h-[72px] overflow-hidden bg-white border-b border-neutral-100">
      <nav className="flex h-full items-center justify-between px-5 lg:px-[49px]">
        <div className="flex items-center gap-8 lg:gap-12">
          <RouterLink to="/" className="inline-flex shrink-0" aria-label="再考裁 ホーム">
            <RecourtLogo variant="header" />
          </RouterLink>

          <div className="hidden items-center gap-9 md:flex">
            <RouterLink
              to="/judges/$id"
              params={{ id: "religious-corporation-dissolution" }}
              className="flex items-center gap-0.5 text-[14px] leading-none font-normal whitespace-nowrap text-neutral-900"
            >
              判例を見つける
              <LucideChevronDown className="h-[15px] w-[15px]" strokeWidth={1.5} />
            </RouterLink>
            {navItems.map((item) => (
              <button
                key={item}
                type="button"
                className="flex items-center gap-0.5 text-[14px] leading-none font-normal whitespace-nowrap text-neutral-900"
              >
                {item}
                <LucideChevronDown className="h-[15px] w-[15px]" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>

        <form
          className="relative hidden h-[30px] w-[300px] items-center overflow-hidden rounded-lg border border-[#dadada] md:flex"
          role="search"
        >
          <LucideSearch
            className="pointer-events-none absolute left-3 h-3 w-3 text-neutral-600"
            strokeWidth={1.7}
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="フリーワード検索"
            className="h-full w-full border-0 bg-white pr-3 pl-8 text-[12px] text-neutral-700 outline-none placeholder:text-[#5a5a5a]"
          />
        </form>
      </nav>
    </header>
  );
}
