/**
 * libros.js - Alta y gestión de libros conectado a la API de FastAPI
 * Cumple Ejercicio 2 y Casos G-02, G-05.
 */
(function () {
    'use strict';

    var document = window.document;

    // Elementos del formulario y vistas
    var selectEditorial = document.getElementById('libro-editorial');
    var selectGenero = document.getElementById('libro-genero');
    var inputTitulo = document.getElementById('libro-titulo');
    var inputIsbn = document.getElementById('libro-isbn');
    var inputPrecio = document.getElementById('libro-precio');
    var inputStock = document.getElementById('libro-stock');
    var formLibro = document.querySelector('#vista-libros form');
    var mensajeExito = document.getElementById('libros-exito');
    var mensajeError = document.getElementById('libros-error');
    var tablaLibrosBody = document.getElementById('tabla-libros');
    var librosVacio = document.getElementById('libros-vacio');

    // Elementos para selección y verificación de autores
    var inputAutorId = document.getElementById('libro-autor-id');
    var btnVerificarAutor = document.getElementById('libro-autor-verificar');
    var spanAutorVerificado = document.getElementById('libro-autor-info');
    var selectAutorRol = document.getElementById('libro-autor-rol');
    var inputAutorOrden = document.getElementById('libro-autor-orden');
    var btnAgregarAutor = document.getElementById('libro-autor-agregar');
    var tablaAutoresBody = document.getElementById('tabla-autores-libro');

    var autorVerificadoActual = null;
    var listaAutoresSeleccionados = [];

    function limpiarNodo(nodo) {
        if (!nodo) return;
        while (nodo.firstChild) {
            nodo.removeChild(nodo.firstChild);
        }
    }

    function mostrarExito(mensaje) {
        if (mensajeError) {
            mensajeError.hidden = true;
            mensajeError.textContent = '';
        }
        if (mensajeExito) {
            mensajeExito.textContent = mensaje;
            mensajeExito.hidden = false;
        }
    }

    function mostrarError(mensaje) {
        if (mensajeExito) {
            mensajeExito.hidden = true;
            mensajeExito.textContent = '';
        }
        if (mensajeError) {
            mensajeError.textContent = mensaje;
            mensajeError.hidden = false;
        }
    }

    function ocultarMensajes() {
        if (mensajeExito) mensajeExito.hidden = true;
        if (mensajeError) mensajeError.hidden = true;
    }

    async function cargarEditorialesYGeneros() {
        try {
            // GET /editoriales/
            var editoriales = await window.api.get('/editoriales/');
            if (selectEditorial && Array.isArray(editoriales)) {
                limpiarNodo(selectEditorial);
                var optDefEd = document.createElement('option');
                optDefEd.value = '';
                optDefEd.textContent = 'Seleccione una editorial...';
                selectEditorial.appendChild(optDefEd);

                editoriales.forEach(function (ed) {
                    var opt = document.createElement('option');
                    opt.value = String(ed.id);
                    opt.textContent = ed.nombre + (ed.pais ? ' (' + ed.pais + ')' : '');
                    selectEditorial.appendChild(opt);
                });
            }

            // GET /generos/
            var generos = await window.api.get('/generos/');
            if (selectGenero && Array.isArray(generos)) {
                limpiarNodo(selectGenero);
                var optDefGen = document.createElement('option');
                optDefGen.value = '';
                optDefGen.textContent = '«Sin clasificar»';
                selectGenero.appendChild(optDefGen);

                generos.forEach(function (gen) {
                    var opt = document.createElement('option');
                    opt.value = String(gen.id);
                    opt.textContent = gen.nombre;
                    selectGenero.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Error cargando editoriales/géneros:', err);
        }
    }

    async function verificarAutorPorId() {
        ocultarMensajes();
        autorVerificadoActual = null;
        if (spanAutorVerificado) spanAutorVerificado.textContent = '';

        var idTexto = (inputAutorId ? inputAutorId.value : '').trim();
        if (!idTexto) {
            mostrarError('Ingrese un ID de autor para verificar.');
            return;
        }

        var idNumero = Number(idTexto);
        if (!Number.isInteger(idNumero) || idNumero <= 0) {
            mostrarError('El ID de autor debe ser un número entero positivo.');
            return;
        }

        try {
            if (spanAutorVerificado) spanAutorVerificado.textContent = 'Consultando GET /autores/' + idNumero + '...';
            var autor = await window.api.get('/autores/' + idNumero);
            autorVerificadoActual = autor;
            if (spanAutorVerificado) {
                spanAutorVerificado.textContent = '✓ Encontrado: ' + autor.nombre + ' (' + autor.nacionalidad + ')';
                spanAutorVerificado.style.color = 'var(--color-exito)';
            }
        } catch (err) {
            autorVerificadoActual = null;
            if (spanAutorVerificado) {
                spanAutorVerificado.textContent = '✗ No se encontró autor con ID ' + idNumero + ' (' + err.message + ')';
                spanAutorVerificado.style.color = 'var(--color-error)';
            }
        }
    }

    function renderTablaAutoresSeleccionados() {
        if (!tablaAutoresBody) return;
        limpiarNodo(tablaAutoresBody);

        listaAutoresSeleccionados.forEach(function (item, index) {
            var fila = document.createElement('tr');

            var tdId = document.createElement('td');
            tdId.textContent = String(item.autor_id);
            fila.appendChild(tdId);

            var tdNombre = document.createElement('td');
            tdNombre.textContent = item.nombre;
            fila.appendChild(tdNombre);

            var tdRol = document.createElement('td');
            tdRol.textContent = item.rol;
            fila.appendChild(tdRol);

            var tdOrden = document.createElement('td');
            tdOrden.textContent = String(item.orden);
            fila.appendChild(tdOrden);

            var tdAccion = document.createElement('td');
            var btnQuitar = document.createElement('button');
            btnQuitar.type = 'button';
            btnQuitar.className = 'boton-secundario';
            btnQuitar.style.padding = '0.2rem 0.5rem';
            btnQuitar.textContent = 'Quitar';
            btnQuitar.addEventListener('click', function () {
                listaAutoresSeleccionados.splice(index, 1);
                renderTablaAutoresSeleccionados();
            });
            tdAccion.appendChild(btnQuitar);
            fila.appendChild(tdAccion);

            tablaAutoresBody.appendChild(fila);
        });
    }

    function agregarAutorSeleccionado() {
        ocultarMensajes();
        if (!autorVerificadoActual) {
            mostrarError('Primero verifique un autor válido con el botón "Verificar ID".');
            return;
        }

        var autorId = autorVerificadoActual.id;
        var yaExiste = listaAutoresSeleccionados.some(function (a) { return a.autor_id === autorId; });
        if (yaExiste) {
            mostrarError('El autor ID ' + autorId + ' ya fue agregado a la lista de autorías de este libro.');
            return;
        }

        var rol = selectAutorRol ? selectAutorRol.value : 'autor';
        var orden = inputAutorOrden ? Number(inputAutorOrden.value) : (listaAutoresSeleccionados.length + 1);
        if (!Number.isInteger(orden) || orden < 1) {
            orden = listaAutoresSeleccionados.length + 1;
        }

        listaAutoresSeleccionados.push({
            autor_id: autorId,
            nombre: autorVerificadoActual.nombre,
            rol: rol,
            orden: orden
        });

        renderTablaAutoresSeleccionados();

        // Limpiar selector temporal y sugerir siguiente orden
        autorVerificadoActual = null;
        if (inputAutorId) inputAutorId.value = '';
        if (spanAutorVerificado) spanAutorVerificado.textContent = '';
        if (inputAutorOrden) inputAutorOrden.value = String(listaAutoresSeleccionados.length + 1);
    }

    async function cargarTablaLibrosRegistrados() {
        if (!tablaLibrosBody) return;
        limpiarNodo(tablaLibrosBody);

        try {
            var libros = await window.api.get('/libros/', { limit: 100, offset: 0 });
            if (!Array.isArray(libros) || libros.length === 0) {
                if (librosVacio) librosVacio.hidden = false;
                return;
            }

            if (librosVacio) librosVacio.hidden = true;

            libros.forEach(function (libro) {
                var fila = document.createElement('tr');

                var tdTit = document.createElement('td');
                tdTit.textContent = libro.titulo;
                fila.appendChild(tdTit);

                var tdIsbn = document.createElement('td');
                tdIsbn.textContent = libro.isbn;
                fila.appendChild(tdIsbn);

                var tdEd = document.createElement('td');
                tdEd.textContent = libro.editorial ? libro.editorial.nombre : 'No especificada';
                fila.appendChild(tdEd);

                var tdGen = document.createElement('td');
                tdGen.textContent = libro.genero ? libro.genero.nombre : 'Sin clasificar';
                fila.appendChild(tdGen);

                var tdStock = document.createElement('td');
                tdStock.textContent = String(libro.stock);
                fila.appendChild(tdStock);

                var tdPrecio = document.createElement('td');
                tdPrecio.textContent = '$' + Number(libro.precio).toFixed(2);
                fila.appendChild(tdPrecio);

                tablaLibrosBody.appendChild(fila);
            });
        } catch (err) {
            console.error('Error al cargar tabla de libros:', err);
        }
    }

    async function manejarSubmitLibro(event) {
        event.preventDefault();
        ocultarMensajes();

        var titulo = (inputTitulo ? inputTitulo.value : '').trim();
        var isbn = (inputIsbn ? inputIsbn.value : '').trim();
        var precio = inputPrecio ? Number(inputPrecio.value) : NaN;
        var stock = inputStock ? Number(inputStock.value) : 0;
        var editorialId = selectEditorial ? Number(selectEditorial.value) : NaN;
        var generoIdRaw = selectGenero ? selectGenero.value : '';
        var generoId = generoIdRaw ? Number(generoIdRaw) : null;

        // Validaciones en cliente
        if (!titulo) {
            mostrarError('El título del libro es obligatorio.');
            return;
        }
        if (!isbn) {
            mostrarError('El código ISBN es obligatorio.');
            return;
        }
        if (!Number.isFinite(precio) || precio <= 0) {
            mostrarError('El precio debe ser un número mayor a cero.');
            return;
        }
        if (!Number.isInteger(stock) || stock < 0) {
            mostrarError('El stock debe ser un número entero mayor o igual a cero.');
            return;
        }
        if (!Number.isInteger(editorialId) || editorialId <= 0) {
            mostrarError('Debe seleccionar una editorial válida.');
            return;
        }
        if (listaAutoresSeleccionados.length === 0) {
            mostrarError('Debe agregar al menos una autoría (con autor, rol y orden) para el libro.');
            return;
        }

        var autoresPayload = listaAutoresSeleccionados.map(function (a) {
            return {
                autor_id: a.autor_id,
                rol: a.rol,
                orden: a.orden
            };
        });

        var payload = {
            titulo: titulo,
            isbn: isbn,
            precio: precio,
            stock: stock,
            editorial_id: editorialId,
            genero_id: generoId,
            autores: autoresPayload
        };

        try {
            // POST /libros/ -> 201 Created
            var nuevoLibro = await window.api.post('/libros/', payload);

            mostrarExito('Libro "' + nuevoLibro.titulo + '" registrado exitosamente con ID #' + nuevoLibro.id + ' (201 Created).');

            // Limpiar formulario y autores
            if (formLibro) formLibro.reset();
            listaAutoresSeleccionados = [];
            autorVerificadoActual = null;
            if (inputAutorOrden) inputAutorOrden.value = '1';
            if (spanAutorVerificado) spanAutorVerificado.textContent = '';
            renderTablaAutoresSeleccionados();

            // Actualizar vistas relacionadas
            cargarTablaLibrosRegistrados();
            if (window.catalogo && typeof window.catalogo.refrescar === 'function') {
                window.catalogo.refrescar();
            }
            if (window.ventas && typeof window.ventas.cargarLibrosParaVenta === 'function') {
                window.ventas.cargarLibrosParaVenta();
            }
        } catch (err) {
            // Muestra mensaje del servidor ante 409 o 422
            mostrarError(err.message);
        }
    }

    function inicializar() {
        if (!formLibro) return;

        cargarEditorialesYGeneros();
        cargarTablaLibrosRegistrados();

        if (btnVerificarAutor) {
            btnVerificarAutor.addEventListener('click', verificarAutorPorId);
        }
        if (btnAgregarAutor) {
            btnAgregarAutor.addEventListener('click', agregarAutorSeleccionado);
        }
        formLibro.addEventListener('submit', manejarSubmitLibro);
    }

    window.libros = {
        cargarEditorialesYGeneros: cargarEditorialesYGeneros,
        cargarTablaLibrosRegistrados: cargarTablaLibrosRegistrados
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }
})();
