# Guía de QA de licitaciones

Guía para validar a mano la primera versión de licitaciones (PR #277) contra las reglas de negocio ([01](01-reglas-de-negocio.md)), las especificaciones ([04](04-especificaciones.md)) y las decisiones de implementación ([06](06-decisiones-de-implementacion.md)).

Cada caso tiene un ID (`QA-NN`), las reglas que valida, los pasos y el resultado esperado. Los textos entre comillas son los que tiene que mostrar la aplicación, tal cual. Si algo no coincide, anotá el ID del caso, qué pasó y una captura.

## 1. Preparación

### 1.1 Entorno local

> Si ya habías migrado tu base local con una versión anterior de esta rama, las migraciones de licitaciones se unificaron en una sola (`*_licitaciones.sql`). Borrá las tablas de licitaciones y sus filas en `drizzle.__drizzle_migrations` posteriores a `20261121040018_burly_molly_hayes`, o recreá la base local, antes de migrar.

1. Levantá la base local y aplicá las migraciones:

   ```bash
   bun run e2e:up
   ```

2. Levantá la aplicación **en el puerto 3100 y con las variables de `.env.test`**. Los mails de confirmación apuntan a `http://127.0.0.1:3100` (es el `site_url` de `supabase/config.toml`), y las variables de `.env.test` garantizan que la aplicación use la base local y no la del deploy:

   ```bash
   set -a; . ./.env.test; set +a
   node node_modules/next/dist/bin/next build && node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100
   ```

3. Abrí `http://127.0.0.1:3100`. Los mails llegan a Mailpit: `http://127.0.0.1:54324`.

### 1.2 Personas de prueba

Usá una ventana del navegador por persona (una normal y otras privadas, o perfiles distintos), así cada una tiene su sesión:

| Persona | Qué es | Cómo se crea |
| --- | --- | --- |
| **E1** | Emprendedor principal | Alta normal en `/signup`, confirmando el mail en Mailpit. |
| **E2** | Otro emprendedor | Igual que E1. Sirve para probar el aislamiento y la vinculación a dos emprendedores. |
| **P1** y **P2** | Proveedores de E1 | Con enlaces de E1 (casos QA-02 y QA-03). |
| **P3** | Cuenta común que se suma como proveedor | Alta normal, después abre un enlace de E1 (QA-08). |

E1 necesita al menos dos insumos en `/insumos`. Por ejemplo: "Harina 000" comprada en 25 kg a $ 18.750 y "Azúcar" comprada en 1 kg a $ 1.200.

### 1.3 Mover el reloj de una licitación

Las rondas y el cierre se calculan con el reloj del servidor, y no hay forma de adelantarlo desde la pantalla. Para no esperar horas, movés las horas de la licitación en la base local. Reemplazá `<N>` por el número de la licitación y `<email>` por el mail del emprendedor:

```bash
docker exec -i supabase_db_numora psql -U postgres -c "<SQL>"
```

- **Pasar a la ronda 2** (la ronda 1 terminó hace un minuto):

  ```sql
  update tenders set
    starts_at = now() - interval '1 minute' - make_interval(hours => round_hours),
    ends_at   = now() - interval '1 minute' - make_interval(hours => round_hours) + make_interval(hours => round_hours * round_count)
  where number = <N> and owner_user_id = (select id from auth.users where email = '<email>');
  ```

- **Cerrar la licitación** (terminó hace un minuto):

  ```sql
  update tenders set
    ends_at   = now() - interval '1 minute',
    starts_at = now() - interval '1 minute' - make_interval(hours => round_hours * round_count)
  where number = <N> and owner_user_id = (select id from auth.users where email = '<email>');
  ```

- **Vencer un enlace de invitación:**

  ```sql
  update supplier_invites set expires_at = now() - interval '1 minute'
  where label = '<para quién es>';
  ```

Después de mover el reloj, recargá la página. Al mover las horas, el historial puede mostrar eventos en un orden que en la vida real no se daría (por ejemplo, el cierre antes de una oferta). No es un error de la aplicación.

## 2. Registro de proveedores (RN-22, RN-23, ES-08, ES-09)

| ID | Pasos | Resultado esperado |
| --- | --- | --- |
| QA-01 | E1: en `/proveedores`, escribí "Molino San José" en "¿Para quién es el enlace?" y tocá "Generar enlace". | Aparece el enlace con "Copiar enlace" y el aviso de que no se vuelve a mostrar, sirve una vez y vence en 7 días. Al recargar, la lista muestra para quién es, cuándo se generó, cuándo vence y su estado, pero no el enlace. |
| QA-02 | En una ventana sin sesión, abrí el enlace y completá el formulario: negocio, CUIT válido, contacto, teléfono, rubros, mail, contraseña y términos. Tocá "Crear cuenta de proveedor". | Se ve "Revisá tu mail". **Antes de confirmar:** E1 no ve a P1 en su lista y el enlace sigue sin usar. |
| QA-03 | Abrí el mail de confirmación en Mailpit, en la misma ventana. | Entra directo a `/proveedor` con "Todavía no te invitó a ninguna licitación." E1 ya lo ve en `/proveedores` y el enlace figura como usado. |
| QA-04 | Abrí de nuevo el mismo enlace, en cualquier ventana. | "Este enlace de invitación ya no sirve: puede haber vencido o ya se usó. Pedile uno nuevo a quien te invitó." |
| QA-05 | Con un enlace nuevo, cargá el CUIT `20-12345678-0`. | "El CUIT no es válido: revisá el último número." Lo demás que cargaste sigue en el formulario. Con `20123456786` o `20-12345678-6` (con o sin guiones) lo acepta. |
| QA-06 | Con un enlace nuevo, registrá otro proveedor con el CUIT de P1. | "Ese CUIT ya tiene una cuenta de proveedor. Ingresá con esa cuenta y abrí de nuevo el enlace para quedar vinculado." |
| QA-07 | E1 abre un enlace que generó él. | "Este enlace lo generaste vos: mandáselo al proveedor para que se registre." |
| QA-08 | P3 (cuenta común, con sesión iniciada) abre un enlace de E1. | El formulario no pide mail ni contraseña. El botón dice "Registrarme como proveedor". Al enviarlo, entra a `/proveedor`. |
| QA-09 | E2 genera un enlace y P1 lo abre con su sesión. | Ve "Vincularme con <nombre de E2>", sin volver a cargar datos. En su panel aparecen los dos emprendedores, cada uno por separado. |
| QA-10 | Generá un enlace, vencelo (sección 1.3) y abrilo. | El mismo aviso de QA-04. |
| QA-11 | Registrá un proveedor nuevo y abrí el mail de confirmación **en otro navegador**, sin sesión. | Lo manda a `/login`. Al ingresar con el mail y la contraseña del proveedor, termina el alta y entra a `/proveedor`. |
| QA-12 | Cerrá la sesión e ingresá como P1. Después, como E1. | P1 entra directo a `/proveedor`. E1 entra a `/insumos` (flujo 1). |
| QA-13 | E1 abre `/proveedor`. | Lo manda a `/insumos`: el panel es solo para proveedores. |

## 3. Publicación y borrador (RN-01 a RN-07, RN-09, ES-01 a ES-03, ES-07, N-31)

| ID | Pasos | Resultado esperado |
| --- | --- | --- |
| QA-14 | E2, sin insumos, abre `/licitaciones/nueva`. | En vez del formulario ve "Solo se licitan insumos de tu catálogo.", con el acceso a `/insumos`. |
| QA-14b | E2 carga un insumo, sin proveedores, y abre `/licitaciones/nueva`. | Ve el formulario. "Publicar licitación" está deshabilitado con "Para publicar necesitás al menos un proveedor registrado con vos. Mientras tanto, guardá el borrador." En proveedores invitados está el acceso para invitarlos. |
| QA-14c | E2 tilda el insumo, completa parte de los datos (por ejemplo, sin el % de baja) y toca "Guardar borrador". | "Borrador guardado. Podés seguir cuando quieras desde Licitaciones." |
| QA-14d | E2 va a `/licitaciones`. | El botón dice "Seguir con el borrador". Al tocarlo, el formulario se abre con lo que guardó, incluso lo que estaba incompleto. |
| QA-14e | E2 registra un proveedor (con un enlace) y vuelve al borrador. | El proveedor aparece tildado y E2 puede publicar. Al publicar, el borrador desaparece: el botón de Licitaciones vuelve a decir "Nueva licitación". |
| QA-14f | Con un borrador guardado, tocá "Descartar borrador". | Vuelve a `/licitaciones`, sin borrador. |
| QA-14g | Guardá un borrador con dos insumos y borrá uno del catálogo en `/insumos`. | Al abrir el borrador, solo queda el insumo que sigue en el catálogo. |
| QA-15 | E1 abre `/licitaciones/nueva` y tilda "Harina 000". | El precio de partida sugerido es $ 750 por kg (18.750 / 25). Al lado está el aviso de que los proveedores ven ese precio. |
| QA-16 | Elegí rondas de 6 horas, 2 rondas y 10 % de baja, con precio de partida 1000. | Muestra "Precio objetivo por ronda: $ 1.000,00 → $ 900,00" y que la licitación dura 12 horas desde que se publica. |
| QA-17 | Probá en "% de baja por ronda" los valores `0`, `51`, `10,555` y vacío. | "El % de baja tiene que ser mayor a 0.", "El % de baja puede ser como máximo 50 %.", "El % de baja es un número con hasta 2 decimales." y "Escribí el % de baja por ronda.", cada uno debajo del campo. |
| QA-18 | Dejá la cantidad o el precio de partida de un insumo vacío o en 0, y tocá "Publicar licitación". | El error aparece debajo del campo de ese insumo, sin perder lo demás que cargaste. |
| QA-19 | No tildes ningún insumo. Después, destildá a todos los proveedores. | "Elegí entre 1 y 20 insumos." y "Dejá al menos un proveedor invitado." |
| QA-20 | Publicá con los dos insumos e invitá solo a P1 (destildá a P2). | Va al detalle "Licitación N° 1" en curso, con sus términos, insumos y proveedores invitados. Solo P1 la ve en su panel. P2 no la ve, ni abriendo su dirección (ve "no encontrado"). |
| QA-21 | Con la N° 1 en curso, abrí `/licitaciones/nueva`. | El formulario se abre para preparar un borrador, pero "Publicar licitación" está deshabilitado con el aviso de la licitación en curso y su enlace. |
| QA-22 | P1 abre la licitación. | Ve inicio y fin, insumos, cantidades, especificaciones, precio de partida y precio objetivo de la ronda en curso. **No** ve el % de baja, el precio de catálogo de E1 ni los otros proveedores. |
| QA-23 | E1 cancela una licitación en curso con "Cancelar licitación" y confirma. | Pide confirmación antes de cancelar. Queda cancelada y P1 ve el aviso de cancelación en su panel. P1 ya no puede ofertar. Después de cancelar, E1 puede publicar otra, que toma el número siguiente. |

## 4. Ofertas (RN-06, RN-08, RN-10, RN-20, ES-05, ES-12)

Usá una licitación con dos insumos (precio de partida $ 1.000 y $ 500) e invitá a P1 y P2.

| ID | Pasos | Resultado esperado |
| --- | --- | --- |
| QA-24 | P1 oferta 1.200 por el primer insumo. | "Tu primera oferta no puede superar el precio de partida ($ 1.000,00)." debajo del insumo. |
| QA-25 | P1 oferta 950 solo por el primer insumo y deja el otro vacío. | "Listo: registramos tu oferta de la ronda 1." El segundo insumo queda sin oferta. |
| QA-26 | P1 envía sin escribir ningún precio. | "Escribí el precio de al menos un insumo." |
| QA-27 | P1 oferta 960 por el primer insumo (más que su 950). | "No podés ofertar por encima de tu último precio ($ 950,00). Podés bajarlo o mantenerlo." |
| QA-28 | P1 oferta 900 por el primero y 600 por el segundo (que supera el precio de partida de $ 500). | No se guarda **ninguno** de los dos precios: el error aparece debajo del segundo y el primero sigue en 950. |
| QA-29 | P1 vuelve a ofertar 950 por el primero, en la misma ronda. | Se acepta: es una ratificación y queda en el historial. |
| QA-30 | P2 oferta 980 por el primero. Mirá la pantalla de P1 y la de E1. | P1 no ve nada de P2. E1 ve, en "Ofertas", la última oferta de cada proveedor por insumo, con su nombre. |
| QA-31 | Pasá a la ronda 2 (sección 1.3). P1 abre su panel. | Ve el aviso de ronda nueva con el nuevo precio objetivo ($ 900,00 con 10 %). El botón dice "Enviar ofertas de la ronda 2". |
| QA-32 | En la ronda 2, P1 deja vacío el primer insumo y oferta solo el segundo. | Su oferta de 950 por el primero sigue vigente: no responder ratifica. |
| QA-33 | Cerrá la licitación (sección 1.3) e intentá ofertar desde una pestaña que P1 tenía abierta. | "La licitación ya cerró o fue cancelada." |

## 5. Aviso sin ofertas, cierre y licitación desierta (RN-12, RN-13, RN-18, RN-19, RN-24, ES-04, ES-13)

| ID | Pasos | Resultado esperado |
| --- | --- | --- |
| QA-34 | En una licitación de dos insumos, que nadie oferte por el segundo. Pasá a la ronda 2. | E1 ve en la licitación y en `/licitaciones` el aviso de insumos sin ofertas, con "Dejar que siga" y "Cancelar la licitación". |
| QA-35 | Tocá "Dejar que siga". | El aviso desaparece y no vuelve en las rondas siguientes. |
| QA-36 | Cerrá la licitación. E1 la abre. | Ve el "Cuadro comparativo": por insumo, cada proveedor con su última oferta, de la más baja a la más alta. La más baja está resaltada. Cada oferta muestra la diferencia en pesos y en % contra el precio de partida y contra el catálogo al publicar. La aplicación no elige por E1. |
| QA-37 | En el mismo cuadro, mirá el insumo sin ofertas. | Figura aparte, marcado "Desierto": "Nadie ofertó por este insumo. Podés publicar una licitación nueva para él." |
| QA-38 | Cerrá una licitación sin ninguna oferta. | La licitación queda desierta. E1 ve el aviso de que cerró sin ofertas y, en el historial, el cierre marcado como desierta. |
| QA-39 | Revisá los paneles después de un cierre. | E1 ve en `/licitaciones` el aviso de licitación cerrada. Los proveedores invitados ven el aviso de cierre en su panel. Ninguno de los dos recibe un mail. |

## 6. Elección, negociación, orden de compra y nota (RN-14 a RN-17, RN-21, ES-06, ES-11)

Partí de una licitación cerrada donde P1 y P2 ofertaron por el primer insumo y solo P1 por el segundo.

| ID | Pasos | Resultado esperado |
| --- | --- | --- |
| QA-40 | Antes del cierre, E1 busca la sección de elección. | No aparece: elegir proveedor solo se puede después del cierre. |
| QA-41 | En "¿A quién le comprás cada insumo?", elegí a P2 para el primer insumo. | El precio acordado arranca en la última oferta de P2 y se puede cambiar. En la lista solo aparecen los proveedores que ofertaron por ese insumo. |
| QA-42 | Cambiá la elección del primer insumo a P1 y bajá el precio acordado. | Se guarda ("Cambiar"). En "Compra por proveedor", P1 muestra sus insumos y el total. El historial registra las dos elecciones. |
| QA-43 | Tocá "Pedir negociar" en P2, dejá el contacto sugerido y tocá "Avisar al proveedor". | E1 ve la fecha del pedido y el contacto que compartió. P2 ve en su panel el pedido y el contacto. Al proveedor que no ofertó no se le ofrece "Pedir negociar". |
| QA-44 | Para P1, completá las condiciones de entrega y de pago y tocá "Generar orden de compra". | Abre "Orden de compra N° 1", con comprador, proveedor, insumos, cantidades, precio acordado, subtotales, total, condiciones y fecha. El total es la suma de los subtotales. El botón imprime o guarda como PDF. |
| QA-45 | Volvé a la licitación y mirá los insumos que ya están en la orden. | En vez del formulario de elección dice "Está en la orden de compra N° 1: ya no se puede cambiar." En "Compra por proveedor", P1 muestra "Ver orden de compra N° 1" y ya no ofrece generar otra. |
| QA-46 | Tocá "Mostrar la nota de agradecimiento". | Los proveedores sin insumos elegidos, incluidos los que no ofertaron, ven la nota en su panel: "¡Gracias por participar en esta licitación! Vamos a tenerte en cuenta en las próximas." Sin precios ni resultados. P1, que fue elegido, no la ve. |
| QA-47 | Revisá el "Historial" de E1 y la licitación desde P1. | E1 ve todo, con fecha y hora: publicación, rondas, ofertas, cierre, elecciones, negociación, orden y nota. P1 ve solo lo suyo. |

## 7. Aislamiento y seguridad

| ID | Pasos | Resultado esperado |
| --- | --- | --- |
| QA-48 | Copiá la dirección de una licitación de E1 (`/licitaciones/<id>`) y abrila como E2. | "No encontrado". Lo mismo con la dirección de una orden de compra de E1. |
| QA-49 | Abrí `/proveedor/licitaciones/<id>` de una licitación de E1 como un proveedor que no fue invitado. | "No encontrado". |
| QA-50 | Sin sesión, abrí `/licitaciones`, `/proveedores` y `/proveedor`. | Va a ingresar. |
| QA-51 | Abrí `/login?next=//sitio-externo.com` e ingresá. | Entra a la aplicación: nunca sale a otro sitio. |

## 8. Regresión de lo existente

El cambio tocó piezas compartidas (ver C-03 en [06](06-decisiones-de-implementacion.md)).

| ID | Pasos | Resultado esperado |
| --- | --- | --- |
| QA-52 | Alta común en `/signup` y confirmación por mail. | Igual que antes: "¡Cuenta creada!" y después el login. |
| QA-53 | Abrí un enlace de confirmación ya usado de un alta común. | Vuelve a `/login` con el aviso de enlace inválido, como antes. |
| QA-54 | Recuperar contraseña desde `/reset-password`. | Igual que antes. |
| QA-55 | Dashboard de un emprendedor (flujo 2). | Sigue mostrando sus cálculos, sin accesos ni avisos de licitaciones. |
| QA-56 | En el flujo 1, tocá "Licitaciones" en el navbar. | Va a `/licitaciones`. El sidebar muestra Licitaciones y Proveedores. "Catálogo" vuelve a `/insumos`, con Insumos y Productos en el sidebar. |
| QA-57 | En el navbar del flujo 1, tocá "Flujo 2". En el dashboard, tocá "Flujo 1". | Pasa al dashboard y vuelve a `/insumos`. En el flujo 1 el selector está en el navbar y no aparece flotante. |
| QA-58 | Abrí una orden de compra y tocá imprimir. | La impresión no incluye el navbar ni el sidebar. |

## 9. Fuera de alcance

No lo pruebes como error: no está en esta versión.

- Actualizar el costo del insumo en el catálogo con el precio acordado (CC-01 a CC-05, ver E-02).
- Anular un enlace antes de que venza, desvincular un proveedor, programar una hora de inicio y marcar avisos como leídos (N-10, N-12, N-24).
- Mails o mensajes por fuera de la aplicación (RN-24).
- Repartir un mismo insumo entre dos proveedores (N-26).
