import RecourtLogo from "./logo/RecourtLogo";

const footerColumns = [
  {
    title: "判例を見つける",
    links: ["検索で見つける", "裁判所から見つける", "裁判官から見つける", "符号・種類から見つける"],
  },
  {
    title: "判例を見つける",
    links: ["検索で見つける", "裁判所から見つける", "裁判官から見つける", "符号・種類から見つける"],
  },
  {
    title: "再考裁について",
    links: [
      "運営者情報",
      "オープンソース",
      "著作権について",
      "免責事項",
      "利用規約・プライバシーポリシー",
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-24 bg-[#eaeaea] px-5 py-[69px] text-[#5a5a5a]">
      <div className="mx-auto grid max-w-[980px] gap-10 md:grid-cols-4 md:gap-5">
        <div className="flex min-h-[154px] flex-col justify-between md:w-[225px]">
          <div>
            <RecourtLogo variant="footer" />
            <p className="mt-4 text-[12px] leading-normal font-medium">
              判例を誰でも読める時代に。
            </p>
          </div>
          <p className="mt-8 text-[10px] leading-[1.6] font-medium md:mt-0">
            ©︎ 2026 Recourt
            <br />
            著作権についてはこちら
          </p>
        </div>

        {footerColumns.map((column, index) => (
          <div key={`${column.title}-${index}`} className="md:w-[225px]">
            <h2 className="text-[10px] leading-[1.6] font-medium text-[#5a5a5a]">{column.title}</h2>
            <ul className="mt-3 space-y-1 text-[12px] leading-[1.6] font-medium text-black">
              {column.links.map((label) => (
                <li key={label}>
                  <a href="#" className="hover:text-recourt-brandblue">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
