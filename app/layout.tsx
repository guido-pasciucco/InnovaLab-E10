import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HelpWidget } from "@/components/help/help-widget";
import { isHelpEnabled, isHelpPreviewEnabled } from "@/lib/help/config";
import { getOptionalUser } from "@/lib/auth/optional-user";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Calculadora Inteligente de Costos",
  description: "Calculá tus costos, definí tus precios y encontrá tu punto de equilibrio.",
};

// Mora is a floating bubble: it must never reserve space in the layout.
const MORA_PLACEMENT: "edge" | "floating" = "floating";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const helpEnabled = isHelpEnabled();
  const helpPreview = !helpEnabled && isHelpPreviewEnabled();
  const user = helpEnabled ? await getOptionalUser() : null;

  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-clip`}>
      <body 
        suppressHydrationWarning
        className="relative flex min-h-full flex-col overflow-x-clip bg-gradient-to-br from-background via-page-gradient-via to-page-gradient-to text-fg"
      >
        {/* Capas de luces difuminadas de Figma */}
        <div className="pointer-events-none absolute -top-20 right-0 h-[420px] w-[420px] max-w-full rounded-full bg-page-glow/30 blur-[110px]" />

        {/* Elemento decorativo global: Carrito (Esquina inferior izquierda - fijo al viewport) */}
        <div 
          className="pointer-events-none fixed bottom-4 left-4 z-0 h-[300px] w-[300px] overflow-hidden opacity-90 [contain:paint]"
        >
          <img 
            src="/images/carrito.png" 
            alt="" 
            aria-hidden="true"
            className="h-full w-full -rotate-[20deg] object-contain"
          />
        </div>

        {/* Elemento decorativo global: Monedas (Esquina inferior derecha - fijo al viewport) */}
        <div 
          className="pointer-events-none fixed bottom-4 right-4 z-0 h-[270px] w-[270px] overflow-hidden opacity-90 [contain:paint]"
        >
          <img 
            src="/images/monedas.png" 
            alt="" 
            aria-hidden="true"
            className="h-full w-full rotate-[20deg] object-contain"
          />
        </div>

        {/* Elemento decorativo global: Calculadora (Vértice superior derecho - fijo al viewport) */}
        <div 
          className="pointer-events-none fixed top-6 right-6 z-0 h-[260px] w-[260px] overflow-hidden opacity-90 [contain:paint]"
        >
          <img 
            src="/images/calculadora.png" 
            alt="" 
            aria-hidden="true"
            className="h-full w-full rotate-[20deg] object-contain"
          />
        </div>

        {/* Wrapper presentacional para evitar duplicar <main> */}
        <div id="numora-app-content" className="relative z-10 flex min-h-full min-w-0 flex-1 flex-col">
          {children}
          <HelpWidget
            enabled={helpEnabled}
            placement={MORA_PLACEMENT}
            preview={helpPreview}
            userId={user?.id ?? null}
          />
        </div>
      </body>
    </html>
  );
}
