# Guía de Despliegue en VPS administrada con Easypanel

**Materia:** Programación III  
**Carrera:** Tecnicatura Universitaria en Programación a Distancia — UTN  
**Proyecto:** Librería Web Integrada y Desplegada  

---

## 👥 Datos del Grupo
* **Integrantes:** Máximo Juan Cruz Quiroga, Fabrizio Simón, Franco Rios, Santino Barone
* **Repositorio:** Unificado con carpetas `/frontend` y `/backend`

---

## 🌐 1. Datos del Despliegue en Producción

| Parámetro | Configuración / Valor |
|---|---|
| **Plataforma de Despliegue** | VPS administrada mediante Easypanel |
| **URL Pública del Frontend (HTTPS)** | `https://libreria-frontend.tudominio.com` *(o subdominio asignado por la cátedra)* |
| **Dominio del Backend** | **Ninguno (Privado).** El backend opera exclusivamente en la red interna de Docker. |
| **Puerto Interno Frontend** | `80` (HTTP) |
| **Puerto Interno Backend** | `8000` (HTTP) |
| **Servicio de Base de Datos** | PostgreSQL (Servicio Postgres dentro del mismo proyecto de Easypanel) |
| **Driver de Conexión** | `postgresql+asyncpg` |

---

## 🛠️ 2. Arquitectura de Servicios en Easypanel

El despliegue se organiza en tres servicios dentro del mismo proyecto de Easypanel (por ejemplo, proyecto `grupo_libreria`):

```
                   Internet (HTTPS)
                          │
                          ▼
            ┌───────────────────────────┐
            │   Servicio App Frontend   │
            │   (Nginx 1.30-alpine)     │
            │   Puerto interno: 80      │
            └─────────────┬─────────────┘
                          │ Red Interna Docker
           /api/* ────────┼────────┐
                          ▼        ▼
       ┌────────────────────────┐  Archivos estáticos
       │  Servicio App Backend  │  (index.html, css/, js/)
       │  (FastAPI / Uvicorn)   │
       │  Puerto interno: 8000  │
       └───────────┬────────────┘
                   │
                   ▼ (Conexión asincrónica asyncpg)
       ┌────────────────────────┐
       │ Servicio DB Postgres   │
       │ Puerto interno: 5432   │
       └────────────────────────┘
```

---

## 📋 3. Procedimiento de Despliegue Paso a Paso

### Paso 1: Configurar el Servicio de Base de Datos (Postgres)
1. En el proyecto de tu grupo en Easypanel, hacé clic en **New Service → Database → Postgres**.
2. Asignale el nombre `db` (o `postgres`).
3. En la pestaña **Credentials**, consultá los datos de acceso generados automáticamente:
   - Host interno (ej. `db` o `<proyecto>_db`)
   - Puerto interno (generalmente `5432`)
   - Database (ej. `libreria_db` o el nombre configurado)
   - User y Password
4. Asegurate de mantener el puerto público deshabilitado para preservar la privacidad de la base.

---

### Paso 2: Crear y Desplegar el Servicio Backend (`backend`)
1. En el mismo proyecto, seleccioná **New Service → App** y nombralo `backend`.
2. En la sección **Source**:
   - Seleccioná el repositorio Git y la rama correspondiente.
   - En **Build Path**, establecé: `/backend`
3. En la sección **Build**:
   - Tipo de builder: **Dockerfile**
   - Ruta relativa al Dockerfile: `Dockerfile`
4. En la sección **Environment**, definí la variable con las credenciales de PostgreSQL:
   ```env
   DATABASE_URL=postgresql+asyncpg://<usuario>:<password>@<host_interno_db>:5432/<nombre_base>
   SQL_ECHO=false
   ```
   *(Reemplazá con los valores provistos en la pestaña Credentials del servicio Postgres).*
5. En la sección **Domains**:
   - Si Easypanel le asignó un dominio público por defecto, **eliminalo**. El backend debe residir exclusivamente en la red interna privada de la VPS.
6. Presioná **Deploy** y supervisá los logs de construcción.
   - El Dockerfile ejecuta automáticamente `alembic upgrade head` antes de lanzar Uvicorn en `0.0.0.0:8000`. Verificá en los logs que las migraciones se hayan aplicado correctamente.
7. **Verificación de Salud en Shell del Backend:**
   Abrí la pestaña **Shell** del servicio `backend` en Easypanel y ejecutá:
   ```bash
   URL=http://127.0.0.1:8000/health/ready
   python -c "from urllib.request import urlopen; print(urlopen('$URL').status)"
   ```
   El comando debe imprimir `200`.
8. **Carga Inicial de Datos Semilla:**
   En la misma consola Shell, ejecutá:
   ```bash
   python seed.py
   ```
   Confirmá que indique *"Datos iniciales cargados exitosamente."*

---

### Paso 3: Crear y Publicar el Servicio Frontend (`frontend`)
1. En el mismo proyecto, seleccioná **New Service → App** y nombralo `frontend`.
2. En la sección **Source**:
   - Seleccioná el repositorio Git y la rama.
   - En **Build Path**, establecé: `/frontend`
3. En la sección **Build**:
   - Tipo de builder: **Dockerfile**
   - Ruta relativa al Dockerfile: `Dockerfile`
4. En la sección **Environment**, configurá la variable `API_UPSTREAM` apuntando al servicio backend:
   ```env
   API_UPSTREAM=<nombre_interno_backend>:8000
   ```
   *Ejemplo:* Si el proyecto se llama `grupo1` y el servicio es `backend`, el nombre suele ser `grupo1_backend:8000` o simplemente `backend:8000` según la resolución interna de Easypanel.
5. En la sección **Domains**:
   - Asigná el dominio HTTPS asignado a tu grupo (ej. `libreria.tudominio.com`).
   - Protocolo interno: **HTTP**
   - Puerto de destino interno: **80**
6. Presioná **Deploy**.

---

## 🔍 4. Verificación y Comprobación en Producción

1. **Salud del sistema a través de la URL pública:**
   Accedé desde tu navegador a:
   ```text
   https://<tu-dominio>/api/health/ready
   ```
   Debe responder HTTP `200 OK` con:
   ```json
   {"estado": "listo", "base_de_datos": "conectada"}
   ```
2. **Navegación en la interfaz gráfica:**
   - Abrí `https://<tu-dominio>/`
   - Comprobá que el catálogo cargue los libros sembrados (`Rayuela`, `Respiración artificial`, etc.) con sus autores correspondientes.
   - Hacé clic en "Ver Detalle Completo" para validar la respuesta de `GET /libros/{id}`.
   - Dirigite a **Libros**, creá un nuevo libro con stock y autorías, y verificá que aparezca en el catálogo.
   - Dirigite a **Clientes**, registrá un cliente y buscalo por ID con el botón de consulta.
   - Dirigite a **Ventas**, agregá dos renglones de libros y confirmá la venta.
   - Recargá la página (`F5`), abrí **Historial** y seleccioná "Ver Detalle" para verificar que los renglones e importes históricos permanecen persistidos.

3. **Batería de pruebas automatizadas contra la URL pública:**
   Desde cualquier máquina con Python:
   ```bash
   python evidencia/ejecutar_casos_g01_g07.py "https://<tu-dominio>/api"
   ```

---

## 🔄 5. Procedimiento de Actualización y Redespliegue

Cuando se realicen cambios en el código fuente:
1. Subí los cambios a la rama principal del repositorio Git.
2. En Easypanel, ingresá al servicio modificado (`backend` o `frontend`).
3. Presioná el botón **Deploy** (o activá la opción de auto-deploy por Webhook de GitHub).
4. **Persistencia garantizada:** Al redesplegar, los datos almacenados en el volumen de PostgreSQL permanecen intactos. Si existen nuevas migraciones de Alembic, el contenedor de la API las aplicará automáticamente al iniciar.

---

## 🩺 6. Diagnóstico y Resolución de Problemas

| Síntoma Observado | Causa Probable | Acciones de Diagnóstico y Corrección |
|---|---|---|
| **Falla en el comando `COPY` durante el build** | Error en el Build Path o estructura de carpetas. | Revisá que en Easypanel el Build Path sea `/frontend` o `/backend`. Verificá que la carpeta `public/` exista dentro de `frontend/`. |
| **Nginx responde con HTTP `502 Bad Gateway` al acceder a `/api/`** | `API_UPSTREAM` incorrecto o backend no operativo. | Revisá los logs de `libreria-frontend`. Confirmá que el backend esté en estado *Running* y que `API_UPSTREAM` use el nombre de red interna correcto y el puerto `8000` (sin `http://` ni barra final). |
| **`/api/health/ready` devuelve error o no responde 200** | Problema de conectividad con PostgreSQL o migraciones pendientes. | Verificá los logs del servicio `backend`. Revisá que `DATABASE_URL` contenga el driver `postgresql+asyncpg` y que el contenedor de base de datos esté activo. |
| **Una petición devuelve HTTP `404 Not Found`** | Prefijo `/api` ausente o falta de barra final. | En las herramientas de desarrollador (Red / Network), comprobá que las peticiones vayan a `/api/.../` conservando la barra final requerida por FastAPI. |
| **Falla en el alta con HTTP `409 Conflict`** | Registro duplicado o clave foránea inexistente. | El servidor rechaza duplicados de ISBN o de correo electrónico, así como autorías o editoriales cuyos IDs no existan en la base de datos. |
