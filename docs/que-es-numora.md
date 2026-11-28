# Qué es Numora

Numora es una aplicación web SaaS para **emprendedores**: les permite calcular cuánto les cuesta producir, a cuánto vender y cuántas unidades necesitan para no perder plata, y gestionar sus compras de insumos mediante licitaciones con proveedores.

El mensaje central: muchos emprendedores ponen el precio a ojo; Numora los lleva paso a paso hasta saber su costo, su precio y su punto de equilibrio.

## Usuarios

| Usuario | Qué hace |
| --- | --- |
| Emprendedor | Carga insumos, recetas, gastos y obtiene precios y equilibrio; publica licitaciones (área privada con sesión obligatoria) |
| Proveedor | Participa en licitaciones con ofertas selladas por rondas |
| Visitante | Ve la landing de marketing |

## Funcionalidades principales

Área privada del emprendedor (`/app/(business)/`):

| Sección | Qué hace |
| --- | --- |
| Inicio | Resumen del catálogo, tareas pendientes y tarjeta de equilibrio |
| Insumos | Catálogo de insumos y packaging con precio, cantidad y unidad de medida (unidades de masa, volumen, longitud y unidad contable, con conversión automática) |
| Productos | Recetas (insumo + cantidad + unidad), rendimiento, capacidad mensual y CVU calculado en vivo; presentaciones ("Caja x6") con envases propios |
| Gastos del período | Costos fijos e indirectos del mes, una sola carga para todo el negocio |
| Costo total | Reparto de indirectos por capacidad; costo total unitario (solo lectura) |
| Precios | Precio = costo × (1 + recargo), con recargo por defecto del negocio y por presentación |
| Punto de equilibrio | Contribución, mezcla por capacidad, equilibrio en unidades y pesos, y gráfico de ingresos, costos y gastos fijos |
| Histórico | Fotos ("cierres") append-only del estado de cada mes, por versión |
| Licitaciones | Subasta inversa por rondas con ofertas selladas: el emprendedor publica la compra, los proveedores compiten sin verse entre sí, y al cierre emite órdenes de compra |
| Chateá con tus datos | Agente con LLM que busca en la documentación del producto y consulta los datos del usuario mediante vistas SQL de solo lectura (detrás del flag `CHAT_DATOS_ENABLED`) |

## Stack técnico

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19, un solo despliegue en Vercel |
| Estilos | Tailwind CSS 4 |
| Lenguaje | TypeScript strict, Bun (package manager), Node 24 |
| Base de datos | PostgreSQL en Supabase + Drizzle ORM (persistencia solo en servidor) |
| Auth | Supabase Auth (signup, login, recuperación de contraseña) |
| IA | AWS Bedrock (asistente de ayuda y chat-datos), embeddings pgvector |
| Dinero | `decimal.js` para aritmética exacta (nunca floats) |
| Formularios | Zod como fuente única de validación + react-hook-form |
| Tests | Vitest (unitarios e integración) + Playwright contra Supabase local (E2E) |

Arquitectura: monorepo fullstack con Clean/Hexagonal lite (`app → components → lib/calc`). El dominio (`lib/calc`, `lib/money`, `lib/schemas`) es puro y universal; la infraestructura (`lib/db`, `lib/supabase`) es solo servidor. Las mutaciones van por Server Actions; las decisiones de negocio y técnicas están registradas en [`decisiones.md`](decisiones.md).

## Estado actual

El proyecto está más allá del MVP inicial de Fase 1: el asistente por pasos fue reemplazado por el catálogo completo del negocio (ver D33 en [`decisiones.md`](decisiones.md)). Están implementados el catálogo (insumos, productos, presentaciones, gastos), precios, equilibrio, histórico y licitaciones de punta a punta; el chat con datos existe detrás de un feature flag.

## Detalle por flujo

La documentación de negocio vive en [`flujos/`](flujos/) (un archivo por flujo: navegación, acceso, insumos, productos, cálculo de costos, chat con datos, demo, despliegue y licitaciones). El glosario de nombres y conceptos está en [`producto/`](producto/). Las tablas de la base de datos están documentadas en [`tablas.md`](tablas.md).
