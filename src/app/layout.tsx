import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: "Bellaroma | Costura artesanal para a sua casa",
  description:
    "Peças de costura artesanal feitas com cuidado para vestir a casa de afeto, textura e personalidade.",
  keywords: [
    "Bellaroma",
    "costura artesanal",
    "decoração afetiva",
    "jogos americanos",
    "capas de almofada",
    "peças personalizadas",
  ],
  openGraph: {
    title: "Bellaroma | Costura artesanal",
    description: "Entre. Sinta-se em casa.",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#778873",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${newsreader.variable}`}>
      <body>
        <a className="skipLink" href="#conteudo">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
