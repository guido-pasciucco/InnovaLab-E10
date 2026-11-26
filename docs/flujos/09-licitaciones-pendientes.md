# 09 — Licitación de insumos: pendientes y dudas

Todo lo que sigue abierto en licitaciones, consolidado de los ocho documentos originales. Lo vigente y decidido corresponde a la primera versión de la funcionalidad. Los textos citados son los de los documentos de origen, retirados del árbol de documentación y conservados en el historial de git.

Los IDs `ES-NN`, `DD-NN`, `N-NN`, `D-NN`, `C-NN` y `E-NN` son los originales. Los subpuntos que no tenían ID en el original se identifican como `ES-NN/n` y se indica siempre su fuente. Estados: **abierta** (sin decidir), **en duda** (decidido para esta versión pero sujeto a revisión), **resuelta-parcialmente** (resuelto en otro documento o implementado, sin reflejo en las reglas de negocio o con un resguardo pendiente).

## Resumen

| ID | Tema | Estado | Origen |
| --- | --- | --- | --- |
| ES-Abiertas | Puntos abiertos de especificaciones | resuelta (sin puntos) | 04-especificaciones.md |
| ES-01/1 | Cambiar el % de baja después de publicar | resuelta-parcialmente | 04-especificaciones.md |
| ES-02/1 | Aviso de que el precio de partida es visible | resuelta-parcialmente | 04-especificaciones.md |
| ES-03/1 | Inicio programable y cambios de duración | resuelta-parcialmente | 04-especificaciones.md |
| ES-04/1 | Canal del aviso sin ofertas | resuelta-parcialmente | 04-especificaciones.md |
| ES-05/1 | Insumo sin ofertas dentro de una canasta | resuelta-parcialmente | 04-especificaciones.md |
| ES-06/1 | Negociar con varios y aviso al confirmar sin negociar | resuelta-parcialmente | 04-especificaciones.md |
| ES-07/1 | Recordar los proveedores destildados | abierta | 04-especificaciones.md |
| ES-08/1 | Desvincular proveedores y aceptación de términos | resuelta-parcialmente | 04-especificaciones.md |
| ES-09/1 | Anular un enlace antes de que venza | resuelta-parcialmente | 04-especificaciones.md |
| ES-10/1 | Ayuda para avisar a los proveedores por cuenta propia | abierta | 04-especificaciones.md |
| ES-11/1 | Nota a invitados que no ofertaron | resuelta-parcialmente | 04-especificaciones.md |
| ES-12/1 | Para qué servía excluir proveedores | en duda | 04-especificaciones.md → DD-02 |
| DD-01 | Registro público de proveedores y licitaciones visibles | resuelta: se implementa en #309 (26 nov 2026) | 05-decisiones-en-duda.md |
| DD-02 | Excluir proveedores durante la licitación | en duda | 05-decisiones-en-duda.md |
| N-03 | Lista cerrada de rubros | abierta (diferida) | 06-decisiones-de-implementacion.md |
| N-10 | Puntos cerrados por la opción más simple | resuelta-parcialmente | 06-decisiones-de-implementacion.md |
| N-11 | Otro tope para el % de baja | abierta (diferida) | 06-decisiones-de-implementacion.md |
| N-24 | Avisos marcados como leídos | abierta (diferida) | 06-decisiones-de-implementacion.md |
| D-09 | Oferta en el instante de la cancelación y trigger | abierta (límite conocido) | 06-decisiones-de-implementacion.md |
| C-01 | Validación en vivo con react-hook-form | abierta (diferida) | 06-decisiones-de-implementacion.md |
| E-02 | Actualizar el Maestro de Insumos con el precio acordado | abierta (próxima versión) | 06-decisiones-de-implementacion.md, 07-guia-qa.md |
| 01-HIST | Texto anterior de las reglas conservado | resuelta-parcialmente | 01-reglas-de-negocio.md |
| DIAG-02 | Diagrama de compra desactualizado | resuelta-parcialmente | 02-proceso-compra-insumos.md |
| DIAG-03 | Diagrama de registro desactualizado | resuelta-parcialmente | 03-registro-del-proveedor.md |
| QA-FUERA | Temas fuera de alcance de la 1ª versión | abierta (diferida) | 07-guia-qa.md |

## 1. Especificaciones

### ES-Abiertas — sin puntos abiertos

- **Estado:** resuelta-parcialmente. **Origen:** 04-especificaciones.md, sección *Abiertas*.
- El documento dice: "No quedan puntos abiertos. Los puntos nuevos se agregan acá con la plantilla del final." Las 13 especificaciones pasaron a *Decididas* y rigen hoy la primera versión.

Los puntos siguientes son los items de la sección *Qué no decide* de cada especificación decidida. No son reglas nuevas: son las preguntas que cada decisión dejó explícitamente sin responder.

| ID | Pendiente | Estado | Origen |
| --- | --- | --- | --- |
| ES-01/1 | "Si el % de baja puede cambiarse después de publicar." | resuelta-parcialmente: RN-03 implica que no, pero no hay una regla explícita sobre el % | 04, ES-01 |
| ES-02/1 | "Si la pantalla avisa que el precio de partida lo van a ver los proveedores. Se recomendó […]. No está decidido." | resuelta-parcialmente: se implementó en N-15, sin pasarlo a reglas de negocio | 04, ES-02 |
| ES-03/1 | "Si la licitación arranca al publicarse o puede programarse una hora de inicio posterior" y "si la duración de ronda o la cantidad de rondas pueden cambiarse después de publicar". | resuelta-parcialmente: N-12 fija el inicio al publicar; RN-03 cubre los cambios | 04, ES-03 |
| ES-04/1 | "Por qué canal llega el aviso." | resuelta-parcialmente: ES-10 y RN-24 fijan el panel como único canal | 04, ES-04 |
| ES-05/1 | "Qué pasa si un insumo de la canasta no recibe ninguna oferta." | resuelta-parcialmente: ES-13 y RN-19 lo resuelven | 04, ES-05 |
| ES-06/1 | "Si el emprendedor puede negociar a la vez con varios proveedores por el mismo insumo" y "si el proveedor recibe algún aviso cuando el emprendedor confirma sin negociar". | resuelta-parcialmente: N-27 permite varios a la vez y ningún aviso al confirmar sin negociar | 04, ES-06 |
| ES-07/1 | "Si la aplicación recuerda a quién destildó el emprendedor la vez anterior para el mismo insumo." | abierta: nadie lo resolvió en los documentos posteriores | 04, ES-07 |
| ES-08/1 | "Si el proveedor puede desvincularse de un emprendedor, o el emprendedor quitar a un proveedor de su lista" y "si los términos y los avisos se aceptan una sola vez o con cada emprendedor". | resuelta-parcialmente: N-10 decide que no se puede desvincular y que se aceptan una sola vez | 04, ES-08 |
| ES-09/1 | "Si el emprendedor puede anular un enlace antes de que venza." | resuelta-parcialmente: N-10 decide que no; vence a los 7 días o al usarse | 04, ES-09 |
| ES-10/1 | "Si la aplicación ofrece algo para que el emprendedor avise más fácil por su cuenta, como copiar un mensaje listo para WhatsApp." | abierta: el emprendedor sigue avisando por su cuenta, sin ayuda de la aplicación | 04, ES-10 |
| ES-11/1 | "Si la nota también les llega a los proveedores invitados que no ofertaron." | resuelta-parcialmente: N-29 la muestra a todos los invitados sin insumo elegido | 04, ES-11 |
| ES-12/1 | "Para qué servía excluir y si hace falta en una versión siguiente." | en duda: queda registrado como DD-02 | 04, ES-12 |

## 2. Decisiones en duda

### <a id="DD-01"></a>DD-01. Registro público de proveedores y licitaciones visibles para todos

- **Estado:** resuelta el 26 de noviembre de 2026 por la issue #309: se implementa el registro público y todas las licitaciones activas son visibles para cualquier proveedor registrado. **Origen:** 05-decisiones-en-duda.md. Planteada el 21 de noviembre de 2026.
- **Qué está decidido hoy:** RN-05 invita solo a proveedores registrados con ese emprendedor; RN-07 impide que un proveedor vea el precio de referencia, catálogo o recetas; la nota *Queda ligado a un emprendedor* dice que para trabajar con otro se registra otra vez; el único camino de registro empieza con el enlace que difunde el emprendedor.
- **La duda:** el proveedor debería poder registrarse públicamente, sin invitación, y ver las licitaciones publicadas para poder ofertar. Aunque la duda sigue abierta, para la primera versión se implementó lo que ya estaba escrito.

| A favor del cambio | En contra / riesgos |
| --- | --- |
| Una aplicación nueva suma proveedores que ningún emprendedor conoce: más ofertas y competencia. | Un competidor puede registrarse y ver qué compra cada emprendedor, cuánto y con qué precio de partida (RN-07). |
| El proveedor descubre emprendedores a los que venderles y tiene un motivo propio para entrar. | Ofertas de desconocidos: las ofertas no obligan (RN-14) y un precio irreal ensucia el cuadro. |
| El emprendedor no tiene que conseguir y mandar un enlace a cada proveedor. | Proveedores lejanos o poco confiables: el precio es puesto en destino (RN-04), pero no se sabe quién está del otro lado. |
| — | Contradice RN-05 y la nota del registro, que habría que reescribir. |

- **Resguardos posibles si se cambia** (ideas, no decisiones): licitación privada o pública elegida por el emprendedor; verificar el CUIT antes de ofertar (ES-09); mostrar solo licitaciones del rubro o zona; que el emprendedor pueda bloquear a un proveedor; mostrar las licitaciones públicas sin el nombre del emprendedor hasta que elija negociar (RN-21 ya le pasa el contacto en ese momento).
- **Puntos relacionados:** ES-07, ES-08, ES-09.
- **Resolución (#309, 26 nov 2026):** se adopta el cambio con los resguardos ya decididos: cualquier persona se registra como proveedor con CUIT válido y mail confirmado; ve todas las licitaciones activas con insumos, cantidades, precio de partida y objetivo; no ve ofertas ajenas ni el catálogo del emprendedor. Se eliminan los enlaces de invitación, `supplier_links`, `tender_invitations` y la selección de invitados al publicar. Las ofertas, adjudicaciones, órdenes y negociaciones se identifican por proveedor. Siguen sin decidirse los resguardos adicionales (licitación pública/privada, verificación de CUIT antes de ofertar, rubros/zonas, bloqueos, ocultar el nombre del emprendedor).

### <a id="DD-02"></a>DD-02. ¿Para qué sirve excluir proveedores durante la licitación?

- **Estado:** en duda — preguntar al equipo. **Origen:** 05-decisiones-en-duda.md. Planteada el 21 de noviembre de 2026.
- **Qué estaba decidido:** el término *En carrera* definía a los proveedores a los que el emprendedor decide notificar cada ronda, y RN-11 permitía excluir a uno "sin aviso", conservando su última oferta a título informativo.
- **Qué rige hoy:** ES-12 sacó la exclusión para la primera versión: todos los invitados siguen en carrera hasta el cierre.
- **La duda:** no está claro qué problema resolvía la exclusión. Antes de sumarla en una versión siguiente hay que saber para qué se pensó.
- **Preguntas para el equipo:**
  1. ¿Qué caso concreto llevó a escribir RN-11? Por ejemplo: precios absurdos, un proveedor con mala experiencia previa u otro.
  2. ¿Por qué "sin aviso"? ¿Qué se gana con que el proveedor no se entere de que quedó afuera?
  3. Si se vuelve a sumar: ¿se excluye en cualquier momento o solo entre rondas? ¿Se puede volver a incluir a un proveedor excluido?
- **Posibles motivos** (hipótesis sin confirmar): que quien ya no interesa deje de ver el precio objetivo de cada ronda, que muestra hacia dónde quiere llegar el emprendedor; concentrar la competencia en los proveedores que de verdad están en juego.
- **Por qué no se incluyó en la primera versión:** con rondas automáticas (ES-01) el emprendedor no interviene ronda por ronda; las ofertas no obligan (RN-14), así que puede no elegir a ese proveedor al cierre; suma pantallas y casos (volver a sumarlo, o que fuera el único que ofertaba un insumo, ES-13).
- **Puntos relacionados:** ES-01, ES-12, ES-13.
- **Resolución:** — (sin resolver). **Fecha:** —.

## 3. Decisiones de implementación

- **N-03 — Lista cerrada de rubros.** **Estado:** abierta (diferida). **Origen:** 06-decisiones-de-implementacion.md. Hoy los rubros son texto libre porque el Maestro de Insumos no tiene categorías; la alternativa queda para cuando exista una clasificación de insumos.
- **N-10 — Puntos cerrados por la opción más simple.** **Estado:** resuelta-parcialmente. **Origen:** 06. No anular enlaces antes de vencer, no desvincular proveedores y aceptar términos una sola vez resuelven ES-09 y ES-08, pero son decisiones técnicas que nunca pasaron a las reglas de negocio; conviene revisarlas con el equipo si se reconsideran.
- **N-11 — Otro tope para el % de baja.** **Estado:** abierta (diferida). **Origen:** 06. El tope actual es 50 % con dos decimales; la alternativa es cambiarlo si aparecen casos reales que lo justifiquen.
- **N-24 — Avisos marcados como leídos.** **Estado:** abierta (diferida). **Origen:** 06. Se dejó para cuando haga falta: exige guardar qué vio cada persona.
- **N-27 y N-29 — Preguntas que ES-06 y ES-11 dejaban abiertas.** **Estado:** resuelta-parcialmente. **Origen:** 06. Se decidieron en la implementación (negociar con varios a la vez, sin aviso al confirmar sin negociar; nota a todos los invitados sin insumo elegido), sin reflejo en las reglas de negocio.
- **D-09 — Carrera oferta/cancelación y trigger.** **Estado:** abierta (límite conocido). **Origen:** 06. Una oferta que llega en el mismo instante en que se cancela puede quedar guardada un instante después; no cambia nada porque una licitación cancelada no tiene cuadro ni compra. Quedó pendiente un trigger en la base que prohíba modificar o borrar ofertas: se dejó para más adelante porque impediría también el borrado en cascada al eliminar una cuenta.
- **C-01 — Validación en vivo con react-hook-form.** **Estado:** abierta (diferida). **Origen:** 06. Los formularios usan validación en el servidor; la alternativa es migrar las pantallas que necesiten validación en vivo.
- **E-02 — Actualizar el Maestro de Insumos.** **Estado:** abierta, prevista para la próxima versión. **Origen:** 06 y 07. Las reglas CC-01 a CC-05 no se implementaron: falta el historial de precios del insumo. Es la principal pieza pendiente de la funcionalidad y se conserva como pieza pendiente para no perderla.
- **Alternativas descartadas, no reaperturas.** **Estado:** resuelta. **Origen:** 06. Quedan registradas como rationale, no como trabajo pendiente: N-01 (guardar el enlace para volver a mostrarlo), N-12 (programar inicio posterior), N-31 (varios borradores), D-12 (reutilizar `tenders` con estado "borrador").

## 4. Reglas y diagramas de origen

- **01-HIST — Texto anterior de las reglas.** **Estado:** resuelta-parcialmente. **Origen:** 01-reglas-de-negocio.md. El documento conserva el texto previo de cada cambio decidido entre el 20 y el 21 de noviembre de 2026. Al leerlo, prevalece el texto vigente de las reglas; las referencias internas a DD-02 y a las especificaciones siguen siendo válidas pero apuntan ahora a este consolidado.
- **DIAG-02 — Diagrama de compra desactualizado.** **Estado:** resuelta-parcialmente. **Origen:** 02-proceso-compra-insumos.md, sección *Diferencias con decisiones posteriores*. El diagrama es del 13 de noviembre de 2026; las decisiones posteriores cambian lo que muestra y no se redibujó:

  | Decisión | Qué cambia en el diagrama |
  | --- | --- |
  | ES-01 | La cotización es por rondas automáticas con precio objetivo, no en ventana única. |
  | ES-02 | La nota *Techo opcional* queda reemplazada: precio de partida obligatorio y sugerido por la aplicación. |
  | ES-04 | La nota *Temporizador* queda definida: aviso al terminar la primera ronda sin ofertas y cierre desierto. |
  | ES-05 | *Cotiza canasta o ítems* se hace siempre por ítem; el proveedor puede cotizar solo algunos. |
  | ES-06 | *Habilita datos del proveedor* significa avisar y pasar el contacto; el emprendedor ya veía los datos desde el inicio. |
  | ES-10 | Los avisos se ven solo en el panel de la aplicación, sin mails. |
  | ES-11 | Después de *Adjudica* aparecen la orden de compra y la nota de agradecimiento: no están en el diagrama. |

- **DIAG-03 — Diagrama de registro desactualizado.** **Estado:** resuelta-parcialmente. **Origen:** 03-registro-del-proveedor.md, sección *Diferencias con decisiones posteriores*. El diagrama es del 17 de noviembre de 2026:

  | Decisión | Qué cambia en el diagrama |
  | --- | --- |
  | DD-01 / #309 | El proveedor se registra públicamente, sin enlace ni vínculo, y ve todas las licitaciones activas. |
  | ES-07 / #309 | La nota *Al publicar* cambia: no hay selección de proveedores; participa cualquier registrado. |
  | ES-08 / #309 | La nota *Queda ligado a un emprendedor* desaparece: una sola cuenta, un panel con todas las licitaciones activas. |
  | ES-09 / #309 | *Difunde el enlace* desaparece: se confirma mail y se controla CUIT en el registro público. |
  | ES-10 | No se piden avisos por separado ni hay mails opcionales: todo ocurre en el panel. |

Los dos diagramas quedaron desactualizados frente a las decisiones posteriores; el proceso vigente se describe por escrito.

## 5. Fuera de alcance de la primera versión

- **QA-FUERA — Temas que no se prueban como error.** **Estado:** abierta (diferida). **Origen:** 07-guia-qa.md, sección *Fuera de alcance*. Reúne E-02 (actualizar el costo, CC-01 a CC-05), N-10/N-12/N-24 (anular enlaces, desvincular, programar inicio, marcar avisos como leídos), RN-24 (mails o mensajes fuera de la aplicación) y N-26 (repartir un mismo insumo entre dos proveedores). Son los candidatos naturales de la siguiente versión, junto con DD-01, DD-02, ES-07/1 y ES-10/1.
