# Decisiones en duda

Decisiones que ya figuran en las [reglas de negocio](01-reglas-de-negocio.md) o en los diagramas, pero que alguien quiere revisar. No son puntos abiertos: los puntos abiertos van en [Especificaciones](04-especificaciones.md). Acá se junta la discusión hasta resolver si la decisión se mantiene o se cambia.

## Cómo se usa

- Cada duda tiene un ID `DD-NN` que no se reutiliza.
- Estados: **En duda** (en discusión), **Se mantiene** (con fecha y porqué), **Se mantiene en la primera versión** (se implementa como está, pero la duda queda para una versión siguiente), **Se cambia** (con fecha).
- Cada duda cita textual lo que está decidido hoy, junta los argumentos a favor y en contra del cambio, y anota los resguardos posibles.
- Si se cambia, el cambio se registra como un punto nuevo en [Especificaciones](04-especificaciones.md) y se actualizan las reglas afectadas, con su historial.

## Resumen

| ID | Tema | Estado |
| --- | --- | --- |
| DD-01 | Registro público de proveedores y licitaciones visibles para todos | Se mantiene en la primera versión (21 nov 2026) |
| DD-02 | ¿Para qué sirve excluir proveedores durante la licitación? | En duda (preguntar al equipo) |

## DD-01. Registro público de proveedores y licitaciones visibles para todos

- **Estado:** Se mantiene en la primera versión
- **Planteada:** 21 de noviembre de 2026.
- **Qué está decidido hoy:**
  - **RN-05:** "Participan solo proveedores registrados con ese emprendedor. Al publicar, se invita a todos los proveedores registrados que venden ese insumo y antes de publicar, el emprendedor puede quitar de esa lista a quienes no quiere invitar."
  - **RN-07:** "Ningún proveedor ve el precio de compra de referencia del emprendedor, su catálogo ni sus recetas."
  - **Diagrama de registro, nota *Queda ligado a un emprendedor*:** "Solo recibe invitaciones de él. Para trabajar con otro, se registra otra vez."
  - **Diagrama de registro:** el único camino para registrarse empieza con el enlace que difunde el emprendedor. No hay registro sin enlace.
- **La duda:** el proveedor debería poder registrarse públicamente, sin que un emprendedor lo invite, y ver las licitaciones que publican los emprendedores para poder ofertar.
- **A favor del cambio:**
  - La aplicación es nueva. Un registro público suma proveedores que ningún emprendedor conoce todavía, y con eso llegan más ofertas y más competencia.
  - El proveedor descubre emprendedores a los que venderles, y eso le da un motivo propio para entrar a la aplicación.
  - El emprendedor no tiene que conseguir y mandar un enlace a cada proveedor.
- **En contra del cambio / riesgos:**
  - Un competidor puede registrarse como proveedor y ver qué compra cada emprendedor, cuánto y con qué precio de partida. Va contra la idea de RN-07.
  - Ofertas de desconocidos: como las ofertas no obligan a nada (RN-14), alguien puede ofertar un precio irreal y ensuciar el cuadro comparativo.
  - Proveedores lejanos o poco confiables: el precio es puesto en destino (RN-04), pero el emprendedor no sabe quién está del otro lado.
  - Contradice RN-05 y la nota del registro, que habría que reescribir.
- **Resguardos posibles si se cambia** (ideas, no decisiones):
  - Que el emprendedor elija en cada licitación si es privada (solo sus proveedores) o pública.
  - Verificar el CUIT del proveedor antes de dejarlo ofertar (ES-09).
  - Mostrarle a cada proveedor solo las licitaciones de su rubro o de su zona.
  - Que el emprendedor pueda bloquear a un proveedor.
  - Mostrar las licitaciones públicas sin el nombre del emprendedor hasta que elija negociar. RN-21 ya le pasa su contacto al proveedor en ese momento.
- **Puntos relacionados:** ES-07 (a quién se invita), ES-08 (una cuenta o varias por proveedor), ES-09 (enlace de registro y verificación).
- **Resolución:** la primera versión se implementa con lo que dicen las reglas: el proveedor entra a la aplicación solo invitado por un emprendedor, y no hay registro público. Para implementar hace falta una decisión tomada, y esta es la que ya está escrita. La duda sigue abierta para revisarla en una versión siguiente, con los resguardos de arriba como punto de partida.
- **Fecha:** 21 de noviembre de 2026.

## DD-02. ¿Para qué sirve excluir proveedores durante la licitación?

- **Estado:** En duda (preguntar al equipo)
- **Planteada:** 21 de noviembre de 2026.
- **Qué estaba decidido:**
  - **En carrera:** "Proveedores a los que el emprendedor decide notificar cada ronda."
  - **RN-11:** "El emprendedor decide a qué proveedores se notifica cada ronda. Un proveedor excluido deja de recibir comunicaciones, sin aviso y su última oferta se conserva a título informativo."
- **Qué rige hoy:** para la primera versión, [ES-12](04-especificaciones.md#es-12-proveedores-en-carrera-con-rondas-automáticas) sacó la exclusión: todos los proveedores invitados siguen en carrera hasta el cierre.
- **La duda:** no está claro qué problema resolvía la exclusión. Antes de sumarla en una versión siguiente, hay que saber para qué se pensó.
- **Preguntas para el equipo:**
  1. ¿Qué caso concreto llevó a escribir RN-11? Por ejemplo: precios absurdos, un proveedor con mala experiencia previa, u otro.
  2. ¿Por qué "sin aviso"? ¿Qué se gana con que el proveedor no se entere de que quedó afuera?
  3. Si se vuelve a sumar: ¿se excluye en cualquier momento o solo entre rondas? ¿Se puede volver a incluir a un proveedor excluido?
- **Posibles motivos** (hipótesis, sin confirmar):
  - Que un proveedor que ya no interesa deje de ver el precio objetivo de cada ronda, que muestra hacia dónde quiere llegar el emprendedor.
  - Concentrar la competencia en los proveedores que de verdad están en juego.
- **Por qué no se incluyó en la primera versión:**
  - Con rondas automáticas (ES-01), el emprendedor no interviene ronda por ronda.
  - Las ofertas no obligan (RN-14): el emprendedor puede simplemente no elegir a ese proveedor al cierre.
  - Suma pantallas y casos: volver a sumarlo, o qué pasa si era el único que ofertaba un insumo (ES-13).
- **Puntos relacionados:** ES-01, ES-12, ES-13.
- **Resolución:** —
- **Fecha:** —
