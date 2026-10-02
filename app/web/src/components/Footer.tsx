import RecourtLogo from "./logo/RecourtLogo";

export default function Footer() {
  return (
    <footer className="border-t border-[#e7ecf6] bg-white px-5 py-10">
      <div className="mx-auto flex max-w-[1160px] flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <RecourtLogo variant="footer" className="h-6 fill-recourt-brandblue" />
          <p className="mt-3 text-xs leading-relaxed text-[#657391]">
            わかりやすい判例で人をアップデートする。
          </p>
        </div>
        <p className="text-xs leading-relaxed text-[#7784a1]">
          © 2026 Recourt · 対話型読解の試作版
        </p>
      </div>
    </footer>
  );
}
