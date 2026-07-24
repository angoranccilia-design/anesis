import type { Metadata } from "next";
import { cormorant, inter } from "@/lib/fonts";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Anesis Acquisition — Hospitality Acquisition Firm",
    template: "%s · Anesis Acquisition",
  },
  description:
    "We measure, in pounds, the direct revenue your hotel is quietly losing — then we take financial responsibility for recovering it.",
  metadataBase: new URL("https://anesis.co.uk"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${cormorant.variable} ${inter.variable}`}>
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
