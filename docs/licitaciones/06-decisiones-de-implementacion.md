# Decisiones de implementación

Documento técnico. Registra las decisiones que se tomaron al implementar la primera versión de licitaciones y que las reglas de negocio ([01](01-reglas-de-negocio.md)) y las especificaciones ([04](04-especificaciones.md)) no fijaban. Fecha de todas las decisiones: 21 de noviembre de 2026, salvo que se indique otra.

Cada decisión dice qué se eligió, por qué y qué alternativa queda si el equipo prefiere otra cosa. Las marcadas **Negocio** cambian lo que ve o puede hacer una persona: conviene revisarlas con el equipo y, si se confirman, pasarlas a las reglas de negocio.

## Negocio

### N-01. El enlace de invitación se muestra una sola vez

El emprendedor ve el enlace completo solo al generarlo, con un botón para copiarlo. Después, la lista muestra para quién era, cuándo vence y si se usó, pero no el enlace.

- **Por qué:** la base guarda solo una huella del enlace, no el enlace. Si alguien lee la base, no puede armar enlaces que sirvan. RN-23 ya prevé generar otro si hace falta.
- **Alternativa:** guardar el enlace para volver a mostrarlo. Es más cómodo, pero un acceso indebido a la base permitiría registrarse como proveedor de cualquier emprendedor.

### N-02. Cada enlace lleva el nombre de para quién es

Al generar un enlace, el emprendedor escribe para quién es (por ejemplo, "Molino San José"). Ese nombre solo lo ve él, en su lista de enlaces.

- **Por qué:** RN-23 pide un enlace personal por proveedor. Sin un nombre, la lista de enlaces sería una lista de fechas imposible de distinguir.

### N-03. Rubros en texto libre

El proveedor escribe sus rubros separados por coma, hasta 10. Se descartan los repetidos.

- **Por qué:** el Maestro de Insumos no tiene rubros ni categorías de donde elegir. Una lista cerrada exigiría definir y mantener un catálogo de rubros.
- **Alternativa:** una lista cerrada de rubros, cuando exista una clasificación de insumos.

### N-04. Qué se controla del CUIT

Se controla que tenga 11 números y que el último coincida con el dígito verificador. El proveedor puede escribirlo con o sin guiones. No se controla el prefijo (20, 23, 27, 30, etc.) contra una lista.

- **Por qué:** RN-23 pide formato y dígito verificador. AFIP agregó prefijos con el tiempo, y una lista fija podría rechazar un CUIT real. El dígito verificador ya rechaza los números mal tipeados.

### N-05. Datos de contacto del proveedor

El registro pide nombre del negocio, CUIT, persona de contacto, teléfono y rubros. El mail de contacto es el de la cuenta, ya confirmado.

- **Por qué:** el anexo de registro dice "negocio, CUIT, contacto y rubros" sin detallar el contacto. RN-21 necesita un contacto para negociar, y RN-08 que el emprendedor identifique al proveedor.

### N-06. La cuenta de proveedor se crea al confirmar el mail

El proveedor completa sus datos y elige mail y contraseña. La aplicación le manda el mail de confirmación. Recién cuando lo abre quedan guardados sus datos de proveedor y su vínculo con el emprendedor. Si el enlace de invitación venció mientras tanto, el proveedor ve el aviso y le pide uno nuevo al emprendedor; con el enlace nuevo solo vuelve a cargar los datos de proveedor, no la cuenta.

- **Por qué:** RN-23 dice "antes de crear la cuenta, el proveedor confirma su mail". El enlace se consume al final, para que un mail que nunca se confirma no gaste el enlace.

### N-07. Una cuenta existente puede sumarse como proveedor

Si quien abre el enlace ya tiene una cuenta en la aplicación (por ejemplo, un emprendedor que también vende insumos), carga solo sus datos de proveedor con esa misma cuenta. Si ya es proveedor, solo confirma la vinculación con el nuevo emprendedor (RN-22).

- **Por qué:** RN-22 dice que un proveedor tiene una sola cuenta. Pedirle otra cuenta a quien ya tiene una contradice esa regla.

### N-08. El emprendedor no puede usar su propio enlace

Si el emprendedor abre un enlace que generó él, la aplicación le recuerda que es para mandárselo al proveedor.

### N-09. A dónde entra cada cuenta

Una cuenta de proveedor sin negocio propio entra directo a su panel de proveedor. Si la cuenta también tiene un negocio (vende y compra), entra al dashboard del emprendedor, desde donde llega a todo.

### N-10. Lo que la primera versión no permite

Puntos que las especificaciones dejaron abiertos y que la primera versión resuelve por la opción más simple:

- No se puede anular un enlace antes de que venza (ES-09). Vence solo a los 7 días o al usarse.
- El proveedor no puede desvincularse de un emprendedor, ni el emprendedor quitarlo de su lista (ES-08).
- Los términos se aceptan una sola vez, al registrarse como proveedor, y no con cada emprendedor (ES-08).

### N-11. Límites del % de baja

El % de baja tiene que ser mayor a 0 y como máximo 50 %, con hasta dos decimales.

- **Por qué:** con 0 % el precio objetivo no cambia y las rondas no tienen sentido. Con más de 50 % por ronda, en pocas rondas el objetivo queda en una fracción del precio de partida, lo que es casi seguro un error de tipeo.
- **Alternativa:** otro tope, si el equipo tiene casos reales que lo justifiquen.

### N-12. La licitación arranca al publicarse

No se puede programar una hora de inicio posterior (ES-03 lo dejó abierto). La primera ronda empieza en el momento de publicar.

### N-13. Cantidades cargadas a mano

RN-01 dice que las cantidades se sugieren a partir de recetas y producción planificada "si existen". La aplicación todavía no guarda una producción planificada, así que el emprendedor escribe la cantidad de cada insumo.

### N-14. Unidad y precio sugerido de cada insumo

Cada insumo se licita en su unidad de compra del Maestro de Insumos (kg, litro, unidad, etc.). El precio de partida sugerido es el precio de compra dividido por la cantidad comprada: si el catálogo dice 25 kg a $18.750, sugiere $750 por kg. Los proveedores ofertan por esa misma unidad.

- **Por qué:** RN-04 pide precios por unidad de medida, en la misma base que la Calculadora. La unidad de compra es la que el emprendedor ya usa para comprar.

### N-15. Aviso de que el precio de partida es visible

Junto al precio de partida, la pantalla avisa que los proveedores lo ven, y que si deja el precio del catálogo van a saber cuánto paga hoy. ES-02 lo había recomendado sin decidirlo; se agregó porque protege lo que pide RN-07 sin quitarle la decisión al emprendedor.

### N-16. También se licita packaging

El packaging vive en el mismo Maestro de Insumos que los insumos. Se puede licitar igual que un insumo.

### N-17. Tamaño de una licitación

Una licitación lleva entre 1 y 20 insumos, cada uno una sola vez. Las especificaciones son opcionales, de hasta 500 caracteres.

### N-18. Redondeo del precio objetivo

El precio objetivo de cada ronda se redondea a centavos, y la ronda siguiente se calcula desde ese valor redondeado. Así, lo que ve el proveedor y la cuenta siempre coinciden. Ejemplo: $333,33 con 15 % de baja da $283,33 en la segunda ronda y $240,83 en la tercera.

### N-19. "Último precio registrado del insumo"

RN-13 compara cada oferta con el último precio registrado del insumo. Se toma el precio del catálogo en el momento de publicar y se guarda con la licitación. El cuadro comparativo no cambia si después se edita el catálogo, y queda igual en el historial (RN-17).

### N-20. Número correlativo por emprendedor

Cada emprendedor numera sus licitaciones desde 1. Las órdenes de compra tienen su propia numeración, también por emprendedor.

### N-21. El proveedor no ve el % de baja

RN-06 lista lo que ve el proveedor: hora de inicio y fin, insumos, cantidades, precio de partida y precio objetivo vigente. El % de baja no está en la lista, así que el proveedor ve el objetivo de la ronda en curso y no la fórmula.

### N-22. Cómo oferta el proveedor

- En cada ronda, el proveedor escribe un precio por cada insumo que cotiza. Si deja un insumo en blanco, su oferta anterior sigue vigente (RN-10: "si no responde, se considera que ratifica"); si nunca cotizó ese insumo, queda sin oferta (RN-20).
- Puede enviar más de una vez en la misma ronda. Vale el último envío, y cada envío respeta la misma regla: nunca por encima de su último precio.
- Volver a escribir el mismo precio queda registrado como una ratificación expresa, con su ronda y su hora.
- Si un precio del envío no cumple la regla, no se guarda ninguno de ese envío y el error aparece debajo del insumo. Así nunca queda una oferta a medias.
- La pantalla le muestra el máximo que puede ofertar en cada insumo: su último precio o, si todavía no ofertó, el precio de partida.

### N-23. Cuánto dura el aviso de insumos sin ofertas

El aviso de RN-18 aparece cuando termina la primera ronda y sigue visible en la licitación y en los paneles del emprendedor hasta que pasa una de tres cosas: elige "Dejar que siga", cancela la licitación o la licitación cierra. "Una sola vez" se interpretó como un único aviso, no uno por ronda.

### N-24. Qué avisos ve cada uno y por cuánto tiempo

Todos los avisos se ven solo en los paneles de la aplicación (RN-24).

- **Emprendedor**, en el dashboard y en Licitaciones: insumos sin ofertas tras la primera ronda (mientras esté pendiente) y licitación cerrada, con el cuadro listo o desierta (durante 7 días).
- **Proveedor**, en su panel: invitación nueva (mientras no haya ofertado), ronda nueva con nuevo precio objetivo (desde la segunda ronda, una vez que ofertó), pedido de negociación, nota de agradecimiento, licitación cerrada y licitación cancelada (estas dos, durante 7 días).
- El aviso de cancelación al proveedor no está en RN-24. Se agregó porque, sin él, un proveedor no se entera de que ya no puede ofertar.
- **Alternativa:** marcar los avisos como leídos. Necesita guardar qué vio cada persona; se dejó para cuando haga falta.

### N-25. Ofertas en vivo y cuadro comparativo

Mientras la licitación está en curso, el emprendedor ve la última oferta de cada proveedor por insumo (RN-08). Al cierre, esa tabla se reemplaza por el cuadro comparativo de RN-13, ordenado de la oferta más baja a la más alta, con la diferencia en pesos y en porcentaje contra el precio de partida y contra el precio del catálogo al publicar. La oferta más baja se resalta. La aplicación no elige ni recomienda: la decisión es del emprendedor (RN-14).

## Base de datos

### D-01. Tres tablas para el registro de proveedores

- `suppliers`: los datos del proveedor. Su clave es el id de la cuenta, así que hay una sola fila por cuenta. El CUIT es único: es lo que impide una segunda cuenta para el mismo CUIT (RN-23).
- `supplier_links`: el vínculo entre un emprendedor y un proveedor, único por par. Es la lista "proveedores registrados con ese emprendedor" de RN-05.
- `supplier_invites`: los enlaces. Guarda la huella SHA-256 del enlace, para quién es, el vencimiento y quién lo usó.

### D-02. El enlace se consume con una sola actualización condicional

Marcar el enlace como usado es una única sentencia que solo actualiza si el enlace no se usó y no venció. Si dos personas usan el mismo enlace a la vez, solo una lo consigue. El alta del proveedor, el consumo del enlace y el vínculo van en la misma transacción.

### D-03. Sin RLS en las tablas nuevas

Las tablas nuevas siguen el criterio de `supplies`: no tienen políticas RLS. La API pública de la base está cerrada para todas las tablas, incluidas las futuras (privilegios por defecto revocados), y cada consulta de los servicios filtra por el usuario de la sesión.

### D-04. El mail de contacto se copia en la tabla de proveedores

El mail de la cuenta vive en el esquema de autenticación, fuera del alcance de las consultas de la aplicación. Se copia al registrarse para mostrárselo al emprendedor.

### D-05. Las rondas no se guardan: se calculan

Una licitación guarda la hora de inicio, la duración de cada ronda, la cantidad de rondas y la hora de cierre. La ronda en curso, el precio objetivo y si la licitación cerró se calculan en el momento con el reloj del servidor.

- **Por qué:** así las rondas avanzan y la licitación cierra sola (RN-09, RN-12) sin una tarea programada que pueda fallar o atrasarse. Una oferta que llega después del cierre se rechaza porque el servidor compara contra la hora de cierre guardada.
- **Consecuencia:** "estado de la licitación" no es una columna. En curso, cerrada o cancelada se deriva de la hora de cierre y de la fecha de cancelación.

### D-06. Copia del insumo en cada ítem

Cada ítem de la licitación copia el nombre, la unidad y el precio de catálogo del insumo al publicar. Si después el insumo se borra del catálogo, el ítem queda igual y pierde solo el enlace al insumo. Borrar un insumo que está en una licitación no está bloqueado.

### D-07. Publicar bloquea al emprendedor un instante

Al publicar, la transacción bloquea la fila del perfil del emprendedor. Así, dos publicaciones simultáneas no pueden tomar el mismo número correlativo ni saltarse la regla de una licitación activa por vez (RN-03).

### D-08. Tablas de la licitación

`tenders` (la licitación), `tender_items` (los insumos) y `tender_invitations` (un proveedor invitado por fila, con el pedido de negociación de RN-21). Las ofertas, las elecciones y las órdenes de compra tienen tablas propias, descriptas más abajo. Si un proveedor borra su cuenta, se borran sus invitaciones y sus ofertas: se priorizó que nadie guarde datos de una cuenta borrada.

### D-09. Ofertas sin modificación

`tender_offers` guarda una fila por oferta, con su ronda y su hora, y los servicios nunca la modifican ni la borran (RN-17). La oferta vigente de un proveedor en un insumo es su fila más reciente. Para que dos envíos simultáneos del mismo proveedor no salteen la regla de "nunca por encima del último precio", cada envío bloquea la invitación de ese proveedor mientras se guarda.

- **Alternativa:** un trigger en la base que rechace cualquier modificación o borrado de ofertas. Se dejó para más adelante. Hoy ninguna parte del código modifica ofertas, y un trigger impediría también el borrado en cascada al borrar una cuenta.

### D-10. Los avisos no se guardan

No hay tabla de avisos. Cada vez que se abre un panel, los avisos se calculan a partir del estado de las licitaciones: ronda en curso, ofertas, cierre, cancelación, pedidos de negociación y nota de agradecimiento. No hay nada que sincronizar ni ningún envío fuera de la aplicación (RN-24).

## Estructura de código

### C-01. Formularios nativos validados en el servidor

Los formularios nuevos son formularios HTML comunes que llaman a una Server Action. La validación vive una sola vez, en el servicio, con las reglas de `lib/schemas/suppliers/fields.ts` (y las de licitaciones, más adelante). Un hook (`useFormDataAction`) muestra los errores de cada campo y conserva lo tipeado cuando el servidor rechaza el envío.

- **Por qué:** son muchas pantallas nuevas. Sumar `react-hook-form` en cada una duplicaría los contratos de formulario sin cambiar lo que valida el servidor.
- **Alternativa:** migrar a `react-hook-form` las pantallas que necesiten validación en vivo.

### C-02. Rutas en español, código en inglés

Las páginas usan rutas en español, como `/insumos`: `/proveedores` (emprendedor), `/proveedores/invitacion/<enlace>` (pública), `/proveedor` (panel del proveedor) y `/licitaciones`. Tablas, servicios y componentes están en inglés (`suppliers`, `tenders`).

### C-03. Cambios en piezas compartidas

- El servicio de alta de cuentas acepta datos extra para guardar en la cuenta. El alta de proveedor guarda ahí sus datos hasta que confirma el mail. El alta normal no cambia.
- La ruta que recibe los enlaces de confirmación trata la confirmación de un proveedor como un alta: si falla, vuelve a `/login`, igual que el alta común.
- El login acepta `?next=` (saneado con `safeNextPath`) para volver al enlace de invitación después de ingresar.
- El dashboard manda al panel de proveedor a las cuentas de proveedor sin negocio propio y suma accesos a Licitaciones y Proveedores.
- Un marco de página compartido (`components/ui/page-shell.tsx`) da a las pantallas nuevas el mismo encabezado que el dashboard y el catálogo.

### C-04. La lógica de rondas es pura y el reloj se inyecta

El cálculo de rondas, precios objetivo y cierre vive en `lib/calc/tenderRounds.ts`, sin base de datos ni React. Los servicios reciben la hora actual como parámetro, con el reloj del servidor por defecto: los tests prueban "tres horas después" o "después del cierre" sin esperar.

### C-05. El formulario de publicación valida también en el navegador

Publicar implica varias filas de insumos. El formulario revisa cada fila con las mismas reglas de campo antes de enviar, para mostrar cada error debajo de su campo. El servidor vuelve a validar todo con esas mismas reglas.

## Entrega

### E-01. Un solo PR con commits por unidad de trabajo

Toda la implementación va en un único PR, como se pidió. Cada commit es una unidad que se puede revisar sola: registro de proveedores, publicación, ofertas, cierre y compra. El PR parte de la rama de la documentación de licitaciones, para que la revisión no mezcle los documentos con el código.

### E-02. Fuera de esta versión: actualizar el costo del insumo

La sección 4 de las reglas (actualizar el Maestro de Insumos con el precio acordado, CC-01 a CC-05) queda para una versión siguiente. Las especificaciones no la trataron, y necesita un historial de precios del insumo que todavía no existe.
