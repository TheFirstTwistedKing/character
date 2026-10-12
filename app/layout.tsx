import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rasyancut : Vanguard Character Maker",
  description: "캐릭터 사진, 신체와 취향, 대사, 대표색, 능력치, 무기와 전투 스타일을 한 곳에서 만드는 다크모드 창작 스튜디오.",
  icons: {
    icon: "/rasyancut-logo.png",
    shortcut: "/rasyancut-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
