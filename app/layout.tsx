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
  title: "Calculadora Inteligente de Costos",
  description: "Calculá tus costos, definí tus precios y encontrá tu punto de equilibrio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-clip`}>
      <body 
        suppressHydrationWarning
        className="relative min-h-full flex flex-col overflow-x-clip bg-gradient-to-br from-[#EAFCF1] via-[#D3F5E1] to-[#BDEBCF] text-slate-800"
      >
        {/* Capas de luces difuminadas de Figma */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full bg-[#39FF14]/30 blur-[110px]" />

        {/* Elemento decorativo global: Carrito (Esquina inferior izquierda - fijo al viewport) */}
        <div 
          className="pointer-events-none fixed bottom-4 left-4 w-[300px] h-[300px] opacity-90 z-0"
          style={{ transform: 'rotate(-20deg)' }}
        >
          <img 
            src="/images/carrito.png" 
            alt="" 
            aria-hidden="true"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Elemento decorativo global: Monedas (Esquina inferior derecha - fijo al viewport) */}
        <div 
          className="pointer-events-none fixed bottom-4 right-4 w-[270px] h-[270px] opacity-90 z-0"
          style={{ transform: 'rotate(20deg)' }}
        >
          <img 
            src="/images/monedas.png" 
            alt="" 
            aria-hidden="true"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Elemento decorativo global: Calculadora (Vértice superior derecho - fijo al viewport) */}
        <div 
          className="pointer-events-none fixed top-6 right-6 w-[260px] h-[260px] opacity-90 z-0"
          style={{ transform: 'rotate(20deg)' }}
        >
          <img 
            src="/images/calculadora.png" 
            alt="" 
            aria-hidden="true"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Wrapper presentacional para evitar duplicar <main> */}
        <div className="relative z-10 flex flex-col min-h-full flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}