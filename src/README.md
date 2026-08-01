# Arquitectura

    src/
      backend/        <- TODO lo del servidor
        functions/    - funciones RPC que llama la app (createServerFn)
        services/     - lógica de negocio y acceso a datos (solo servidor)
        api/          - utilidades HTTP (CORS, respuestas JSON)
      frontend/       <- TODO lo de la interfaz
        pages/        - pantallas completas (home, portal, app/, admin/)
        components/   - componentes reutilizables + UI
        hooks/        - estado de sesión, permisos, responsive
        lib/          - utilidades de cliente (PDF, formato, negocio)
      database/       <- cliente y tipos de la base de datos (PostgreSQL)
      routes/         <- solo el mapa de URLs (obligatorio del framework)
                         cada archivo apunta a una pantalla de frontend/pages
                         routes/api/public/* son endpoints HTTP reales

## APIs públicas

| Método | Endpoint                        | Descripción                                   |
| ------ | ------------------------------- | --------------------------------------------- |
| GET    | /api/public/catalog             | Catálogo de productos con stock (sin costos)   |
| GET    | /api/public/warranties?q=SERIE  | Garantías por serie o número de boleta (sin datos personales) |
