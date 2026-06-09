import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "우리 언제?",
  description: "모두의 가능한 시간을 모아, 가장 잘 맞는 시간을 찾아주는 모임 조율 서비스",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
