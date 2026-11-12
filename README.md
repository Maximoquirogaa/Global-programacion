# Evaluación Global — Librería Web Integrada y Desplegada en Easypanel

**Materia:** Programación III  
**Carrera:** Tecnicatura Universitaria en Programación a Distancia — Universidad Tecnológica Nacional (UTN)  
**Proyecto:** Integración de Frontend nativo con API FastAPI y PostgreSQL  
**Url:** libreriafront.maximoquiroga.me
---

## 👥 Integrantes del Grupo
* **Máximo Juan Cruz Quiroga**
* **Fabrizio Simón**
* **Franco Rios**
* **Santino Barone**

---

## 📖 1. Descripción y Alcance del Proyecto

Este trabajo práctico integrador consolida la aplicación completa de la **Librería**, fusionando las pantallas desarrolladas en el **Primer Parcial (Frontend nativo en HTML, CSS y JavaScript)** con la API asincrónica del TP **«Librería: catálogo, clientes y ventas con FastAPI y PostgreSQL»** (Capítulos 1 a 4).

### Componentes de la Arquitectura
1. **Frontend (`frontend/`):**
   - **HTML5 semántico y accesible:** Estructurado en cinco vistas funcionales (`Catálogo`, `Libros`, `Clientes`, `Ventas` e `Historial`) con atributos ARIA y mensajes de estado interactivos.
   - **CSS3 nativo:** Identidad visual sobria con paleta borgoña (`#6B1D2A`) y crema (`#F5EFE6`), tipografía fluida y diseño responsivo adaptado a dispositivos móviles y de escritorio. Sin frameworks ni CDNs externas.
   - **JavaScript Vanilla (ES6+):** Conexión a la API mediante peticiones asincrónicas con `fetch` centralizadas en `api.js` bajo el prefijo `/api` y preservación estricta de barras finales (e.g. `/api/libros/`). Manejo de borrador en memoria para ventas.
   - **Servidor Web y Proxy Inverso:** Imagen `nginx:1.30-alpine` que sirve los archivos estáticos desde `public/` y reenvía las peticiones `/api/` hacia el servicio backend configurado mediante la plantilla `default.conf.template` y la variable `API_UPSTREAM`.

2. **Backend (`backend/`):**
   - **FastAPI + SQLModel + SQLAlchemy 2.0 (asincrónico) + asyncpg:** Arquitectura en capas desacopladas (Router → Service → Modelos).
   - **Manejo transaccional atómico:**
     - Registro de libros con autorías intermedias (`LibroAutor` con `rol` y `orden`).
     - Registro de ventas con renglones calculados en servidor, copia de precios unitarios vigentes e integridad referencial.
   - **Manejo de errores estandarizado:** Traducción global de excepciones de integridad a HTTP `409 Conflict` (duplicados de ISBN o email, claves foráneas inexistentes) y validación de esquemas con HTTP `422 Unprocessable Entity`.
   - **Versionado de base de datos:** Migraciones automáticas gestionadas con **Alembic** (`alembic upgrade head`) en el arranque del contenedor.
   - **Contenedorización:** Imagen `python:3.12-slim` con Uvicorn escuchando en `0.0.0.0:8000`.

---

## 📁 2. Estructura del Repositorio

```text
Tp_integrador/
├── frontend/
│   ├── Dockerfile                 # FROM nginx:1.30-alpine con sustitución de variables
│   ├── .dockerignore              # Exclusión de archivos sensibles y node_modules
│   ├── default.conf.template      # Plantilla Nginx: proxy_pass http://${API_UPSTREAM}/
│   └── public/                    # Archivos servidos por Nginx
│       ├── index.html             # Shell de la aplicación (5 vistas y modales)
│       ├── css/
│       │   └── styles.css         # Identidad visual borgoña + crema
│       └── js/
│           ├── api.js             # Cliente HTTP centralizado con base /api
│           ├── navegacion.js      # Controlador de navegación entre vistas
│           ├── catalogo.js        # Catálogo, filtros, paginación y detalle GET /libros/{id}
│           ├── libros.js          # Alta de libro, stock, autorías y listado
│           ├── clientes.js        # Alta de clientes y consulta GET /clientes/{id}
│           ├── ventas.js          # Borrador de venta, cálculo y confirmación POST /ventas/
│           └── historial.js       # Historial de ventas y detalle histórico GET /ventas/{id}
├── backend/
│   ├── Dockerfile                 # FROM python:3.12-slim con migración en arranque
│   ├── .dockerignore              # Exclusión de .env, venv y cachés
│   ├── requirements.txt           # Dependencias de producción
│   ├── alembic.ini                # Configuración de migraciones
│   ├── env.example                # Plantilla de variables de entorno
│   ├── seed.py                    # Carga inicial de datos de prueba
│   ├── app/
│   │   ├── core/                  # Configuración, motor asincrónico y sesiones
│   │   ├── modules/               # Módulos: libros, clientes, ventas, autores, etc.
│   │   └── main.py                # Instancia FastAPI, routers, CORS y handlers
│   ├── migrations/                # Versiones de migraciones de Alembic
│   └── test/                      # Scripts de pruebas automatizadas y contratos HTTP
├── evidencia/
│   ├── ejecutar_casos_g01_g07.py  # Script de verificación automatizada contra /api
│   ├── G01_G07_ejecucion_resultados.txt # Log completo de ejecución exitosa
│   └── INFORME_CASOS_G01_G07.md   # Informe paso a paso de los casos G-01 a G-07
├── docker-compose.yml             # Orquestación local (db, backend, frontend)
├── DEPLOY.md                      # Guía de despliegue en VPS / Easypanel
└── README.md                      # Este documento
```

---

## 🚀 3. Guía de Puesta en Marcha Local

### Opción A: Orquestación completa con Docker Compose (Recomendada)

Permite levantar todo el ecosistema (PostgreSQL, FastAPI y Nginx) con un solo comando:

1. **Construir y levantar los servicios:**
   ```bash
   docker compose up -d --build
   ```
   *Esto iniciará la base de datos PostgreSQL en el puerto `5433` (interno `5432`), el backend en el puerto `8000` y el frontend en el puerto `8080`.*

2. **Cargar los datos semilla de prueba:**
   ```bash
   docker exec libreria-backend python seed.py
   ```

3. **Abrir la aplicación en el navegador:**
   - Navegue a: [http://localhost:8080](http://localhost:8080)
   - Compruebe la salud del sistema a través del proxy: [http://localhost:8080/api/health/ready](http://localhost:8080/api/health/ready) (debe devolver HTTP `200 OK`).

4. **Detener los servicios:**
   ```bash
   docker compose down
   ```

---

### Opción B: Ejecución nativa con entorno virtual local

Si desea ejecutar el backend directamente con Python en el sistema anfitrión:

1. **Activar el entorno virtual e instalar dependencias:**
   ```bash
   cd backend
   python -m venv venv
   # En Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   # En Linux / macOS:
   source venv/bin/activate

   pip install -r requirements.txt
   ```

2. **Configurar la base de datos en `backend/.env`:**
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/libreria_db
   SQL_ECHO=false
   ```

3. **Aplicar las migraciones de Alembic y sembrar datos:**
   ```bash
   python -m alembic upgrade head
   python seed.py
   ```

4. **Iniciar el servidor Uvicorn:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

5. **Construir y ejecutar el contenedor del frontend:**
   ```bash
   cd ../frontend
   docker build -t libreria-frontend .
   docker run --rm --name libreria-frontend -p 8080:80 -e API_UPSTREAM=host.docker.internal:8000 --add-host=host.docker.internal:host-gateway libreria-frontend
   ```

---

## 🎯 4. Decisiones de Diseño y Reglas de Negocio Implementadas

### A. Catálogo y Paginación (Ejercicio 1)
- **Ruta:** `GET /libros/`
- Parámetros soportados: `limit` (1 a 100, valor por defecto `20`), `offset` (desplazamiento desde 0) y `titulo` (búsqueda parcial insensible a mayúsculas mediante `ilike`).
- Al modificar el término de búsqueda, el frontend reinicia automáticamente el desplazamiento a `offset = 0`.
- **Carga de autores:** El listado general devuelve editorial y género; para los autores se consulta `GET /libros/{id}`, renderizándolos dinámicamente en cada tarjeta y en el botón "Ver Detalle Completo".
- Manejo integral de estados en UI: Carga en curso, catálogo vacío, búsqueda sin coincidencias y error de conexión.

### B. Alta de Libros y Clientes (Ejercicio 2)
- **Alta de Libro (`POST /libros/`):**
  - Envía `titulo`, `isbn`, `precio` (> 0), `stock` (entero >= 0), `editorial_id`, `genero_id` (opcional o null) y una lista de autorías con `autor_id`, `rol` (`autor`, `coautor`, `traductor`, `ilustrador`) y `orden` (>= 1).
  - Selectores dinámicos: Editoriales cargadas desde `GET /editoriales/` y géneros desde `GET /generos/`.
  - **Selector de Autores:** Dado que el contrato de referencia expone `GET /autores/{id}`, el formulario permite ingresar un ID numérico, presionar "Verificar ID" para validar su existencia y mostrar su nombre antes de agregarlo con su rol y orden a la tabla de autorías.
- **Alta de Cliente (`POST /clientes/`):**
  - Envía `nombre` y `email`.
  - La interfaz incluye un panel de consulta `GET /clientes/{id}` para verificar clientes existentes por su identificador. Los clientes creados o consultados se almacenan en memoria para alimentar automáticamente el selector de la pantalla de Ventas.
- **Validación y Errores:** Respuestas 201 Created actualizan inmediatamente las tablas y selectores; respuestas 409 Conflict (ISBN o email duplicado) o 422 Unprocessable Entity muestran el mensaje detallado provisto por el servidor.

### C. Venta y Detalle Histórico (Ejercicio 3)
- **Borrador de Venta:** Mantenido en la memoria del navegador. Permite agregar libros desde el catálogo, ajustar cantidades y quitar renglones.
- **Validaciones:** Exige cliente seleccionado, al menos un renglón, cantidades enteras positivas y prohíbe duplicar un mismo libro en más de un renglón.
- **Confirmación (`POST /ventas/`):**
  - El botón se deshabilita mientras la petición viaja a la API.
  - El backend copia el precio unitario del catálogo y calcula los subtotales y el total.
  - Ante éxito (201), se muestra el comprobante oficial devuelto por el servidor, se limpia el borrador y se actualiza el historial.
  - Ante rechazo (409 o 422), **el borrador se conserva intacto** para que el usuario pueda corregirlo sin perder los renglones cargados.
- **Historial (`GET /ventas/` y `GET /ventas/{id}`):**
  - Permite abrir cualquier venta anterior para ver sus renglones e importes históricos. Si el precio de un libro se modifica posteriormente en el catálogo (`PATCH /libros/{id}`), los importes de las ventas previas permanecen inalterados.

---

## 🧪 5. Casos de Prueba Verificados (G-01 a G-07)

Todos los casos requeridos por la consigna fueron verificados exitosamente tanto en el entorno local (`http://127.0.0.1:8080/api`) como en el **entorno público desplegado en Easypanel** ([https://libreriafront.maximoquiroga.me](https://libreriafront.maximoquiroga.me)):

| Caso | Escenario Evaluado | Resultado Observado | Estado |
|---|---|---|:---:|
| **G-01** | Catálogo: Búsqueda parcial por título, paginación con `limit`/`offset`, búsqueda sin coincidencias (`[]`) y consulta de detalle con autores (`GET /libros/{id}`). | 200 OK. Paginación correcta, lista vacía ante término inexistente y detalle cargado sin N+1. | **APROBADO** |
| **G-02** | Alta de libro: Registro con stock, género opcional y autorías. Consulta de detalle. Repetición de ISBN. | 201 Created en alta. 200 OK en consulta de detalle. 409 Conflict ante duplicación de ISBN. | **APROBADO** |
| **G-03** | Alta de cliente: Registro con nombre y email. Recuperación por ID (`GET /clientes/{id}`). Repetición de email. | 201 Created en alta. 200 OK en consulta por ID. 409 Conflict ante duplicación de email. | **APROBADO** |
| **G-04** | Venta: Registro de venta válida con dos renglones. Verificación de 201 y consulta de detalle persistido tras recargar. | 201 Created. Precios unitarios copiados del catálogo. Detalle recuperado idéntico desde PostgreSQL. | **APROBADO** |
| **G-05** | Precio histórico: Modificación de precio con `PATCH /libros/{id}` y verificación de importes de venta previa. | 200 OK en actualización de catálogo. Venta histórica conserva su precio original y total inalterados. | **APROBADO** |
| **G-06** | Rechazo: Venta con cliente/libro inexistente (409) y con renglones repetidos (422). Historial inalterado. | 409 Conflict y 422 Unprocessable Entity devueltos correctamente. Historial protegido sin alteraciones. | **APROBADO** |
| **G-07** | Despliegue y salud: Construcción de imágenes Docker, verificación de `/health/ready` y persistencia. | 200 OK en `/health/ready` (`{"estado":"listo","base_de_datos":"conectada"}`). Proxy funcional. | **APROBADO** |

Para reproducir la batería completa de pruebas automatizadas contra producción:
```bash
python evidencia/ejecutar_casos_g01_g07.py "https://libreriafront.maximoquiroga.me/api"
```

---

## 📄 6. Archivos de Entrega
- `frontend/`: Código fuente, `Dockerfile`, `.dockerignore`, `default.conf.template` y assets públicos.
- `backend/`: Código de la API, `Dockerfile`, `.dockerignore`, migraciones, `seed.py`, `env.example`.
- `README.md`: Este informe de arquitectura y ejecución.
- `DEPLOY.md`: Manual operativo para el despliegue en VPS con Easypanel.
- `evidencia/`: Script de validación, logs de ejecución, capturas de pantalla de la interfaz web y de Easypanel (`G01` a `G07`, `EP01` a `EP03`) e informe `INFORME_CASOS_G01_G07.md`.
