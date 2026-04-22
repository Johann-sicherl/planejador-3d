import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planejador de Impressão 3D",
  description: "Sistema web para gestão de impressão 3D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
