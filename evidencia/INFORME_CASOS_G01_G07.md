# Informe de Verificación de Casos de Prueba (G-01 a G-07)

**Materia:** Programación III — Tecnicatura Universitaria en Programación a Distancia (UTN)  
**Evaluación:** Global — Integración y Despliegue  
**Grupo:** Máximo Juan Cruz Quiroga, Fabrizio Simón, Franco Rios, Santino Barone  
**Entorno de Ejecución:** Contenedores Docker (Proxy Nginx + API FastAPI + Base PostgreSQL)  
**URL de Pruebas:** `http://127.0.0.1:8080/api`  

---

## Resumen Ejecutivo de Resultados

Todos los casos de prueba obligatorios estipulados por la cátedra fueron ejecutados de manera automatizada e interactiva a través del origen público del frontend (puerto 8080 con Nginx proxy_pass a FastAPI en puerto 8000).

```
================================================================================
CASO DE PRUEBA          DESCRIPCIÓN OPERACIONAL                          ESTADO
================================================================================
G-01 - Catálogo         Búsqueda por título, limit/offset, vacía, detalle APROBADO [✓]
G-02 - Alta de Libro    Stock, género opcional, autorías, unicidad ISBN   APROBADO [✓]
G-03 - Alta de Cliente  Nombre y email, consulta GET /clientes/{id}, 409  APROBADO [✓]
G-04 - Venta            2 renglones, cálculo servidor, detalle post-F5   APROBADO [✓]
G-05 - Precio Histórico PATCH precio libro, preservación venta anterior   APROBADO [✓]
G-06 - Rechazos         409 ID inexistente, 422 libros repetidos, hist.   APROBADO [✓]
G-07 - Despliegue/Salud Endpoint /health/ready 200, Nginx proxy inverso   APROBADO [✓]
================================================================================
RESULTADO GENERAL: 7 / 7 CASOS EXITOSOS (100% DE EFECTIVIDAD)
================================================================================
```

---

## Detalle Paso a Paso de Cada Caso

### Caso G-01 — Catálogo y Cliente HTTP
- **Objetivo:** Consultar `GET /libros/`, búsqueda parcial insensible a mayúsculas por `titulo`, paginación con `limit` y `offset`, caso sin coincidencias y detalle con autores mediante `GET /libros/{id}`.
- **Acciones y Resultados:**
  1. `GET /libros/?titulo=rayuela`: Retornó HTTP 200 OK con el registro de "Rayuela" (Editorial Sudamericana, Género Novela).
  2. `GET /libros/?limit=1&offset=0`: Retornó exactamente 1 libro (ID #1).
  3. `GET /libros/?limit=1&offset=1`: Retornó exactamente 1 libro con desplazamiento (ID #2).
  4. `GET /libros/?titulo=inexistente_xyz_totalmente`: Retornó HTTP 200 OK con lista vacía `[]`. En el frontend se activó el mensaje `#catalogo-sin-resultados`.
  5. `GET /libros/1`: Retornó HTTP 200 OK con el detalle completo precargado, mostrando la autoría de Julio Cortázar con rol `autor` y orden `1`.

### Caso G-02 — Alta de Libro
- **Objetivo:** Registrar un libro nuevo con stock, género opcional y autorías (`POST /libros/`), verificar su detalle y probar duplicado de ISBN (409 Conflict).
- **Acciones y Resultados:**
  1. `POST /libros/`: Se envió payload con título, ISBN `978-950-66090-1`, precio `$38500.00`, stock `25`, editorial 1, género 1 y dos autorías compuestas (Julio Cortázar como `autor` [orden 1] y Adolfo Bioy Casares como `coautor` [orden 2]).
  2. Respuesta: HTTP 201 Created con el ID asignado (#7).
  3. Consulta `GET /libros/7`: Confirmó la persistencia en PostgreSQL con sus dos autorías precargadas sin consultas N+1.
  4. Repetición de `POST /libros/` con el mismo ISBN: Rechazado con HTTP 409 Conflict y mensaje `"Error de integridad: verifique que el ISBN no esté repetido..."`.

### Caso G-03 — Alta de Cliente
- **Objetivo:** Registrar cliente con nombre y email (`POST /clientes/`), recuperarlo por ID (`GET /clientes/{id}`) y probar duplicado de email (409 Conflict).
- **Acciones y Resultados:**
  1. `POST /clientes/`: Se envió `nombre: "Estudiante Global"` y `email: "estudiante_global@frvm.utn.edu.ar"`.
  2. Respuesta: HTTP 201 Created con ID #5.
  3. Consulta `GET /clientes/5`: Retornó HTTP 200 OK con los datos del cliente persistido.
  4. Repetición de `POST /clientes/` con el mismo email: Rechazado con HTTP 409 Conflict y mensaje `"Ya existe un cliente registrado con ese correo electrónico."`.

### Caso G-04 — Venta con Dos Renglones
- **Objetivo:** Registrar una venta con cliente y dos renglones de libros (`POST /ventas/`), validar cálculo en servidor, verificar HTTP 201 y consultar detalle post-recarga.
- **Acciones y Resultados:**
  1. `POST /ventas/`: Se envió payload con `cliente_id: 5` y renglones:
     - Libro #1 (precio catálogo `$85000.00`, cantidad `2` -> subtotal `$170000.00`).
     - Libro #7 (precio catálogo `$38500.00`, cantidad `1` -> subtotal `$38500.00`).
  2. Respuesta: HTTP 201 Created con venta ID #3 y total confirmado por el backend de `$208500.00`.
  3. Simulación de recarga (`F5`): Consulta `GET /ventas/3`: Devolvió el mismo detalle completo con fecha, cliente, renglones y total de `$208500.00`.

### Caso G-05 — Preservación de Importes Históricos tras Modificación de Catálogo
- **Objetivo:** Modificar el precio de un libro mediante `PATCH /libros/{id}` y verificar que la venta registrada previamente conserva sus importes históricos inalterados.
- **Acciones y Resultados:**
  1. `PATCH /libros/1`: Se modificó el precio en catálogo del libro 1 a `$90000.00` (HTTP 200 OK).
  2. Consulta de la venta previa `GET /ventas/3`:
     - El precio unitario histórico del renglón con libro 1 se mantuvo en `$85000.00` (el precio vigente al momento de la venta).
     - El subtotal histórico se mantuvo en `$170000.00`.
     - El total general histórico de la venta se mantuvo exactamente en `$208500.00`.

### Caso G-06 — Rechazos Controlados y Protección de Historial
- **Objetivo:** Validar rechazo con HTTP 409 ante cliente o libro inexistente, rechazo con HTTP 422 ante renglones repetidos, y constatar que el historial no se corrompe.
- **Acciones y Resultados:**
  1. Venta con cliente inexistente (`cliente_id: 888888`): Rechazada con HTTP 409 Conflict.
  2. Venta con libro inexistente (`libro_id: 999999`): Rechazada con HTTP 409 Conflict.
  3. Venta con libros repetidos en dos renglones: Rechazada por validación de Pydantic con HTTP 422 Unprocessable Entity (`"Un mismo libro no puede aparecer en dos renglones de la misma venta."`).
  4. Consulta `GET /ventas/`: El historial de ventas mantuvo la cantidad exacta de ventas válidas sin registros espurios ni estados inconsistentes. En el frontend, el borrador de venta se conservó intacto.

### Caso G-07 — Verificación de Despliegue y Salud
- **Objetivo:** Comprobar la construcción de imágenes de frontend y backend, la resolución del proxy inverso de Nginx y la salud de la API.
- **Acciones y Resultados:**
  1. Frontend construido con `nginx:1.30-alpine` y plantilla `default.conf.template`.
  2. Backend construido con `python:3.12-slim` ejecutando Uvicorn en `0.0.0.0:8000`.
  3. `GET http://127.0.0.1:8080/api/health/ready`: Devuelve HTTP 200 OK con payload:
     ```json
     {"estado": "listo", "base_de_datos": "conectada"}
     ```
  4. La aplicación completa corre integrada bajo el mismo origen HTTP.
