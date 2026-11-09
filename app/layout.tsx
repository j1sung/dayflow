import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "DayFlow · 나다운 한 주",
  description: "할 일을 시간으로 바꾸는 나만의 주간 플래너",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
