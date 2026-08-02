# TechTrack ERP

Crea una aplicación web moderna y responsive para un negocio de venta y reparación de computadoras. El sistema debe funcionar como un pequeño ERP y permitir registrar ventas, garantías y productos.

MÓDULOS PRINCIPALES

PANEL PRINCIPAL (Dashboard)

Total de computadoras vendidas.

Garantías activas.

Garantías próximas a vencer (30 días).

Garantías vencidas.

Ventas del mes.

Productos en stock.

Alertas automáticas de garantías por vencer.

REGISTRO DE PRODUCTOS
Campos:

Código/SKU.

Nombre del producto.

Marca.

Modelo.

Número de serie.

Categoría (Laptop, PC, Monitor, Impresora, SSD, etc.).

Precio de compra.

Precio de venta.

Stock disponible.

Estado (Nuevo, Usado, Reacondicionado).

Funciones:

Crear, editar y eliminar productos.

Buscar por nombre, modelo o número de serie.

Control de stock automático.

REGISTRO DE CLIENTES
Campos:

DNI/RUC.

Nombres y apellidos.

Teléfono.

Dirección.

Correo electrónico.

Funciones:

Buscar clientes existentes.

Historial de compras por cliente.

REGISTRO DE VENTAS
Campos:

Número de boleta/factura.

Fecha de venta.

Cliente.

Productos vendidos (múltiples).

Cantidad.

Precio unitario.

Descuento.

Total.

Método de pago (Efectivo, Yape, Transferencia, Tarjeta).

Funciones:

Calcular subtotal, IGV y total automáticamente.

Descontar stock al vender.

Generar boleta imprimible en formato térmico de 80 mm y formato A4.

Permitir reimpresión de boletas.

GARANTÍAS
Al registrar una venta, el sistema debe generar automáticamente la garantía de cada equipo.

Campos:

Producto.

Número de serie.

Cliente.

Fecha de venta.

Duración de garantía (3, 6, 12, 24 meses o personalizada).

Fecha de vencimiento (calculada automáticamente).

Estado (Activa, Próxima a vencer, Vencida, Anulada).

Observaciones.

Funciones:

Ver todas las garantías.

Buscar por número de serie, cliente o boleta.

Mostrar cuántos días faltan para vencer.

Enviar alerta visual cuando falten 30 días.

Marcar garantía como atendida o anulada.

CONSULTA RÁPIDA DE GARANTÍA
Crear una pantalla donde se pueda ingresar:

Número de serie
o

Número de boleta

Y el sistema muestre:

Producto.

Cliente.

Fecha de compra.

Fecha de vencimiento.

Días restantes.

Estado de la garantía.

REPORTES

Ventas por día, mes y año.

Productos más vendidos.

Garantías activas y vencidas.

Equipos vendidos por marca.

Ingresos totales.

Exportar reportes a Excel y PDF.

TECNOLOGÍA Y DISEÑO

Interfaz moderna, limpia y rápida.

Tema oscuro y claro.

Responsive para PC y celular.

Base de datos MySQL o PostgreSQL.

Autenticación de usuarios (Administrador y Vendedor).

DATOS IMPORTANTES
El negocio vende computadoras, laptops, componentes y accesorios. El número de serie debe ser único y servir como clave principal para consultar garantías. El sistema debe priorizar rapidez en la búsqueda y facilidad para imprimir boletas y verificar garantías frente al cliente.

EXTRA
Agregar un botón grande en el menú principal llamado “CONSULTAR GARANTÍA” para que el vendedor pueda verificar una garantía en segundos escribiendo solo el número de serie.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9fd4549f-834e-4886-b28a-f3e5deeef1dc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
