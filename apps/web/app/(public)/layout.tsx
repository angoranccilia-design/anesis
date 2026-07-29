import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const c = getCopy(lang);
  return (
    <>
      <Header lang={lang} nav={c.nav} />
      <main>{children}</main>
      <Footer footer={c.footer} nav={c.nav} />
    </>
  );
}
