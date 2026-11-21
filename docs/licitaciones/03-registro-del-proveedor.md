# Registro del proveedor

Anexo A, antes de la primera licitación. El enlace es el camino feliz. La invitación directa entra en la misma verificación. 17 de noviembre de 2026.

![Diagrama BPMN: registro del proveedor](assets/registro-del-proveedor.png)

## Carriles

| Carril | Responsable |
| --- | --- |
| Emprendedor | Persona que invita a sus proveedores. |
| Aplicación | Pasos que ejecuta la aplicación. |
| Proveedor | Proveedor que se registra. |

## Recorrido

| Paso | Carril | Tarea |
| --- | --- | --- |
| 1 | Emprendedor | **Inicio.** |
| 2 | Emprendedor | Difunde el enlace para registrarse como proveedor. |
| 3 | Proveedor | Abre el enlace para el registro (recibe el *Enlace para registro*). |
| 4 | Aplicación | Abre el registro de ese emprendedor. |
| 5 | Proveedor | Completa negocio, CUIT, contacto y rubros. |
| 6 | Proveedor | Acepta los términos y, aparte, los avisos. |
| 7 | Aplicación | Crea la cuenta y lo suma al registro de proveedores, en el **Listado de proveedores de ese emprendedor**. |
| 8 | Proveedor | **Registrado.** |
| 9 | Proveedor | Recibe la invitación de una licitación (en cada licitación). |
| 10 | Aplicación | Entra a dashboard unificado de emprendedores y observa los detalles de las licitaciones en curso. |
| 11 | Aplicación | **A la licitación** (continúa en [Compra de insumos por licitación abierta](02-proceso-compra-insumos.md)). |

## Notas del diagrama

| Nota | Ubicación | Texto |
| --- | --- | --- |
| Invitación directa | Difunde el enlace | El enlace es de un solo uso y vence. |
| Queda ligado a un emprendedor | Completa negocio, CUIT, contacto y rubros | Solo recibe invitaciones de él. Para trabajar con otro, se registra otra vez. |
| Al publicar | Crea la cuenta | Se invita a quienes venden ese insumo. El emprendedor puede quitar a alguno antes de enviar. |
| Dashboard | Entra a dashboard unificado | Funciona en el navegador. No abre la calculadora ni el catálogo del emprendedor. |
