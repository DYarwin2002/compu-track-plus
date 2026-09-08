# Pedidos directos desde el catálogo

## Experiencia del cliente
- Convertir la lista actual del catálogo en un pedido real con cantidades por producto.
- Añadir un formulario breve con nombre, DNI, WhatsApp y dirección de entrega; validar los campos obligatorios con los modales de la aplicación.
- Al confirmar, comprobar stock, guardar el pedido y mostrar un código único de seguimiento.
- Ofrecer botones para copiar el código, ir al portal y avisar por WhatsApp a la tienda.
- Mantener la descarga de cotización y el pedido por WhatsApp como alternativas.

## Seguimiento público
- Ampliar el portal para consultar pedidos web por código y DNI.
- Mostrar fecha, productos, total y avance: Pendiente, Confirmado, En preparación, Enviado, Entregado o Cancelado.
- No mostrar datos personales en búsquedas que no coincidan con el código y DNI del pedido.

## Gestión interna
- Añadir una sección “Pedidos web” en el panel.
- Mostrar pedidos recientes, datos de entrega, productos y total.
- Permitir que el administrador actualice el estado; no se generará boleta hasta que la tienda convierta o registre la venta.

## Datos y seguridad
- Crear tablas separadas para pedidos web y sus productos, con número único y código privado de consulta.
- Permitir creación pública únicamente mediante una función validada que recalcula precios y comprueba stock en el servidor.
- Bloquear acceso directo público a las tablas; el personal autenticado podrá leer y el administrador actualizar estados.
- Registrar los cambios estructurales mediante una migración y actualizar los tipos usados por la aplicación.

## Verificación
- Probar pedido completo desde catálogo, confirmación y seguimiento en el portal.
- Probar gestión y cambio de estado desde el panel.
- Revisar escritorio y móvil, errores visibles y permisos.
