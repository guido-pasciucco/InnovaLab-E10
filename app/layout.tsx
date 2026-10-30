import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    template: "%s | InnovaLab E10",
    default: "InnovaLab E10",
  },
  description: "Calculadora de costos, precios y punto de equilibrio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col bg-gradient-to-br from-[#EAFCF1] via-[#D3F5E1] to-[#BDEBCF] text-slate-800 overflow-x-hidden">
        
        {/* Capas de luces difuminadas de Figma */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full bg-[#39FF14]/30 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-[460px] h-[460px] rounded-full bg-[#5EEAD4]/45 blur-[130px]" />
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[360px] h-[360px] rounded-full bg-white/70 blur-[100px]" />

        {/* Elemento decorativo global: Carrito (Esquina inferior izquierda) */}
        <div className="pointer-events-none absolute bottom-4 left-4 w-[300px] h-[300px] -rotate-8 opacity-90 z-0">
          <img 
            src="/images/carrito.png" 
            alt="Carrito decorativo" 
            className="w-full h-full object-contain"
          />
        </div>

        {/* Elemento decorativo global: Monedas (Esquina inferior derecha) */}
        <div className="pointer-events-none absolute bottom-4 right-4 w-[270px] h-[270px] rotate-8 opacity-90 z-0">
          <img 
            src="/images/monedas.png" 
            alt="Monedas decorativas" 
            className="w-full h-full object-contain"
          />
        </div>

        {/* Contenido principal de la aplicación */}
        <main className="relative z-10 flex flex-col min-h-full flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}