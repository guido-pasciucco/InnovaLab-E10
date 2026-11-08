# Recharts — Gráficos de resultados

`recharts` (`3.10.1`) es la librería de gráficos del proyecto. Se usa para el gráfico de ingresos vs. costos de la vista de punto de equilibrio.

## Problema que resuelve

La vista de resultados necesita un gráfico de líneas con tres series (ingresos, costos totales y costos fijos), un punto de cruce y guías punteadas hacia los ejes. Escribirlo a mano en SVG obliga a mantener escalas, márgenes, ejes y etiquetas; una librería de gráficos concentra ese trabajo y deja el componente enfocado en los datos y el diseño.

## Cómo se usa en este proyecto

| Aspecto | Decisión |
| --- | --- |
| Dónde vive | `components/charts/`; el gráfico del punto de equilibrio es `break-even-chart.tsx` |
| Frontera | Componente cliente (`"use client"`). La página y la tarjeta que lo contienen siguen siendo Server Components |
| Datos | Llegan por props como coordenadas del gráfico; la UI no calcula el punto de equilibrio |
| Dinero | Los montos visibles se formatean con `lib/money/format.ts`; `number` se usa solo para ubicar puntos en el SVG |
| Accesibilidad | El SVG va dentro de un `figure` con `figcaption` descriptivo; las series tienen etiqueta visible y no dependen solo del color |
| Versión | Fijada en `package.json`; `bun.lock` es la fuente de la versión instalada |

El gráfico se importa solo en la ruta que lo usa para no enviar Recharts a todas las páginas.

## Alternativas evaluadas

| Librería | Por qué no se eligió |
| --- | --- |
| Chart.js + `react-chartjs-2` | Renderiza en canvas: el texto no es inspeccionable, la accesibilidad requiere trabajo extra y el wrapper agrega otra capa |
| visx | Es un conjunto de primitivas de bajo nivel; el gráfico simple de esta historia requeriría más código propio |
| Nivo | Más pesado y apoyado en D3; su capacidad extra no se aprovecha en este gráfico |
| SVG a mano | Sin dependencia, pero hay que mantener escalas, ejes, etiquetas y guías a medida |

Recharts ofrece `ReferenceLine` y `ReferenceDot` de fábrica, que son exactamente las piezas del cruce y las guías, y sus peer dependencies declaran soporte para React 19.

## Consecuencias

- **Peso:** Recharts y sus dependencias agregan bundle al cliente. Queda acotado al componente del gráfico.
- **Lockfile:** la versión se actualiza con `bun add recharts@<versión>`; no se edita a mano.
- **Responsive:** `ResponsiveContainer` necesita un contenedor con altura explícita. Sin altura, el gráfico mide 0 px.
- **Render:** el SVG se dibuja en el cliente después de medir el contenedor; la página no depende del gráfico para su HTML principal.
- **Revisión:** si aparece un gráfico mucho más simple o más complejo, se evalúa de nuevo; la decisión no obliga a usar Recharts en todos los gráficos futuros.

## Errores comunes

- **Poner `"use client"` en toda la página.** Solo lo necesita el componente que importa Recharts.
- **Anidar `ResponsiveContainer` en un padre sin altura.** El gráfico desaparece sin error visible.
- **Calcular el equilibrio dentro del gráfico.** El gráfico recibe puntos ya resueltos; la fórmula pertenece a `lib/calc/`.
- **Confiar solo en el color.** Cada serie lleva etiqueta visible y el gráfico tiene un resumen textual.

## Paso siguiente

Ver `docs/producto/03-definiciones.md` para el significado de punto de equilibrio, unidades de equilibrio y ventas de equilibrio.
