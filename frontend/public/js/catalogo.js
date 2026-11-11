/**
 * catalogo.js - Gestión del Catálogo de Libros y consulta a la API
 * Cumple Ejercicio 1 y Caso G-01.
 */
(function () {
    'use strict';

    var document = window.document;

    var contenedor = document.getElementById('contenedor-catalogo');
    var estado = document.getElementById('catalogo-estado');
    var sinResultados = document.getElementById('catalogo-sin-resultados');
    var mensajeError = document.getElementById('catalogo-error');
    var mensajeVacio = document.getElementById('catalogo-vacio');
    var formulario = document.querySelector('#vista-catalogo form');
    var inputBuscar = document.getElementById('buscar-titulo');
    var btnAnterior = document.getElementById('catalogo-prev');
    var btnSiguiente = document.getElementById('catalogo-next');
    var infoPaginacion = document.getElementById('catalogo-paginacion-info');
    var contenedorDetalle = document.getElementById('catalogo-modal-detalle');

    var LIMIT = 20;
    var offsetActual = 0;
    var terminoActual = '';
    var cacheAutores = {};

    function limpiarNodo(nodo) {
        if (!nodo) return;
        while (nodo.firstChild) {
            nodo.removeChild(nodo.firstChild);
        }
    }

    function ocultarEstados() {
        if (estado) estado.hidden = true;
        if (sinResultados) sinResultados.hidden = true;
        if (mensajeError) mensajeError.hidden = true;
        if (mensajeVacio) mensajeVacio.hidden = true;
    }

    function mostrarEstadoCarga() {
        ocultarEstados();
        limpiarNodo(contenedor);
        if (estado) {
            estado.textContent = 'Cargando catálogo de libros desde la API...';
            estado.hidden = false;
        }
    }

    function mostrarErrorConexion(mensaje) {
        ocultarEstados();
        limpiarNodo(contenedor);
        if (mensajeError) {
            mensajeError.textContent = 'Error de conexión con la API: ' + mensaje;
            mensajeError.hidden = false;
        }
    }

    async function cargarDetalleAutor(libroId, elementoDestino) {
        if (cacheAutores[libroId]) {
            renderizarAutoresEnElemento(cacheAutores[libroId], elementoDestino);
            return;
        }

        try {
            elementoDestino.textContent = 'Consultando GET /libros/' + libroId + '...';
            var detalle = await window.api.get('/libros/' + libroId);
            cacheAutores[libroId] = detalle;
            renderizarAutoresEnElemento(detalle, elementoDestino);
        } catch (err) {
            elementoDestino.textContent = 'No se pudieron cargar los autores.';
        }
    }

    function renderizarAutoresEnElemento(detalle, elementoDestino) {
        if (!detalle.autores || detalle.autores.length === 0) {
            elementoDestino.textContent = 'Sin autores registrados';
            return;
        }
        var texto = detalle.autores.map(function (a) {
            return a.nombre + ' (' + a.rol + ')';
        }).join(', ');
        elementoDestino.textContent = texto;
    }

    async function abrirModalDetalle(libroId) {
        if (!contenedorDetalle) return;
        contenedorDetalle.hidden = false;
        contenedorDetalle.innerHTML = '<p>Cargando detalle completo del libro ID ' + libroId + '...</p>';

        try {
            var libro = await window.api.get('/libros/' + libroId);
            cacheAutores[libroId] = libro;

            var editorialNombre = libro.editorial ? libro.editorial.nombre : 'No especificada';
            var generoNombre = libro.genero ? libro.genero.nombre : 'Sin clasificar';
            var autoresHtml = (libro.autores && libro.autores.length > 0)
                ? libro.autores.map(function (a) {
                    return '<li><strong>' + a.nombre + '</strong> (' + a.nacionalidad + ') - Rol: <em>' + a.rol + '</em> [Orden: ' + a.orden + ']</li>';
                }).join('')
                : '<li>Sin autores asignados</li>';

            contenedorDetalle.innerHTML = [
                '<div class="tarjeta" style="border: 2px solid var(--color-primario); margin-top: 1rem;">',
                '<h3>Detalle del Libro #' + libro.id + ': ' + libro.titulo + '</h3>',
                '<dl>',
                '<dt>ISBN:</dt><dd>' + libro.isbn + '</dd>',
                '<dt>Editorial:</dt><dd>' + editorialNombre + '</dd>',
                '<dt>Género:</dt><dd>' + generoNombre + '</dd>',
                '<dt>Stock disponible:</dt><dd>' + libro.stock + ' unidades</dd>',
                '<dt>Precio unitario:</dt><dd>$' + Number(libro.precio).toFixed(2) + '</dd>',
                '<dt>Autorías completas:</dt><dd><ul style="margin:0; padding-left:1.2rem;">' + autoresHtml + '</ul></dd>',
                '</dl>',
                '<button type="button" id="cerrar-modal-detalle" class="boton-secundario" style="margin-top:0.5rem;">Cerrar Detalle</button>',
                '</div>'
            ].join('');

            var btnCerrar = document.getElementById('cerrar-modal-detalle');
            if (btnCerrar) {
                btnCerrar.addEventListener('click', function () {
                    contenedorDetalle.hidden = true;
                    limpiarNodo(contenedorDetalle);
                });
            }
        } catch (err) {
            contenedorDetalle.innerHTML = '<p class="mensaje-error">Error al cargar detalle del libro: ' + err.message + '</p>';
        }
    }

    function crearTarjetaLibro(libro) {
        var editorialNombre = libro.editorial ? libro.editorial.nombre : 'No especificada';
        var generoNombre = libro.genero ? libro.genero.nombre : 'Sin clasificar';

        var article = document.createElement('article');
        article.className = 'tarjeta';
        article.setAttribute('data-libro-id', String(libro.id));

        var h3 = document.createElement('h3');
        h3.textContent = libro.titulo;
        article.appendChild(h3);

        var dl = document.createElement('dl');

        // Campos básicos
        var campos = [
            { etiqueta: 'ID', valor: String(libro.id) },
            { etiqueta: 'ISBN', valor: libro.isbn },
            { etiqueta: 'Editorial', valor: editorialNombre },
            { etiqueta: 'Género', valor: generoNombre },
            { etiqueta: 'Stock', valor: String(libro.stock) + ' un.' }
        ];

        campos.forEach(function (campo) {
            var dt = document.createElement('dt');
            dt.textContent = campo.etiqueta;
            dl.appendChild(dt);

            var dd = document.createElement('dd');
            dd.textContent = campo.valor;
            dl.appendChild(dd);
        });

        // Autores (Ejercicio 1: consultar GET /libros/{id})
        var dtAutores = document.createElement('dt');
        dtAutores.textContent = 'Autor(es)';
        dl.appendChild(dtAutores);

        var ddAutores = document.createElement('dd');
        ddAutores.className = 'autores-libro';
        ddAutores.textContent = 'Cargando autores...';
        dl.appendChild(ddAutores);

        article.appendChild(dl);

        // Disparar carga de autores por ID de libro
        cargarDetalleAutor(libro.id, ddAutores);

        var precio = document.createElement('p');
        precio.className = 'precio';
        precio.textContent = '$' + Number(libro.precio).toFixed(2);
        article.appendChild(precio);

        var btnDetalle = document.createElement('button');
        btnDetalle.type = 'button';
        btnDetalle.className = 'boton-secundario';
        btnDetalle.style.fontSize = '0.85rem';
        btnDetalle.style.padding = '0.3rem 0.6rem';
        btnDetalle.textContent = 'Ver Detalle Completo';
        btnDetalle.addEventListener('click', function () {
            abrirModalDetalle(libro.id);
        });
        article.appendChild(btnDetalle);

        return article;
    }

    async function cargarCatalogo() {
        mostrarEstadoCarga();

        var params = {
            limit: LIMIT,
            offset: offsetActual
        };

        if (terminoActual) {
            params.titulo = terminoActual;
        }

        try {
            // GET /libros/ con limit, offset y titulo
            var libros = await window.api.get('/libros/', params);

            ocultarEstados();
            limpiarNodo(contenedor);

            if (!Array.isArray(libros)) {
                throw new Error('La respuesta del servidor no tiene formato de lista.');
            }

            if (libros.length === 0) {
                if (terminoActual) {
                    // Estado: Búsqueda sin coincidencias
                    if (sinResultados) {
                        sinResultados.textContent = 'No se encontraron libros que coincidan con "' + terminoActual + '".';
                        sinResultados.hidden = false;
                    }
                } else if (offsetActual === 0) {
                    // Estado: Lista vacía
                    if (mensajeVacio) {
                        mensajeVacio.textContent = 'El catálogo está vacío. No hay libros registrados en la base de datos.';
                        mensajeVacio.hidden = false;
                    }
                } else {
                    if (estado) {
                        estado.textContent = 'No hay más libros para mostrar en este desplazamiento.';
                        estado.hidden = false;
                    }
                }
            } else {
                libros.forEach(function (libro) {
                    contenedor.appendChild(crearTarjetaLibro(libro));
                });

                if (estado) {
                    var inicio = offsetActual + 1;
                    var fin = offsetActual + libros.length;
                    var textoFiltro = terminoActual ? ' (filtro: "' + terminoActual + '")' : '';
                    estado.textContent = 'Mostrando libros ' + inicio + ' a ' + fin + textoFiltro + '.';
                    estado.hidden = false;
                }
            }

            actualizarPaginacion(libros.length);
        } catch (err) {
            mostrarErrorConexion(err.message);
            actualizarPaginacion(0);
        }
    }

    function actualizarPaginacion(cantidadRecibida) {
        if (btnAnterior) {
            btnAnterior.disabled = (offsetActual === 0);
        }
        if (btnSiguiente) {
            btnSiguiente.disabled = (cantidadRecibida < LIMIT);
        }
        if (infoPaginacion) {
            var pag = Math.floor(offsetActual / LIMIT) + 1;
            infoPaginacion.textContent = 'Página ' + pag + ' (Offset: ' + offsetActual + ', Límite: ' + LIMIT + ')';
        }
    }

    function inicializar() {
        if (!contenedor) return;

        if (formulario) {
            formulario.addEventListener('submit', function (event) {
                event.preventDefault();
                var nuevoTermino = inputBuscar ? inputBuscar.value.trim() : '';
                // Al cambiar el filtro, reiniciar el desplazamiento (requisito Ejercicio 1)
                offsetActual = 0;
                terminoActual = nuevoTermino;
                cargarCatalogo();
            });
        }

        if (btnAnterior) {
            btnAnterior.addEventListener('click', function () {
                if (offsetActual >= LIMIT) {
                    offsetActual -= LIMIT;
                    cargarCatalogo();
                }
            });
        }

        if (btnSiguiente) {
            btnSiguiente.addEventListener('click', function () {
                offsetActual += LIMIT;
                cargarCatalogo();
            });
        }

        // Carga inicial
        cargarCatalogo();
    }

    window.catalogo = {
        cargarCatalogo: cargarCatalogo,
        refrescar: function () {
            offsetActual = 0;
            return cargarCatalogo();
        },
        abrirModalDetalle: abrirModalDetalle
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }
})();
