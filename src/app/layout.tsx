import "./globals.css";
import AppShell from "../components/app-shell";

export const metadata = {
  title: "AsoBaby",
  description: "Sistema de gestión AsoBaby",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}