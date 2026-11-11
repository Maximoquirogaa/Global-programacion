/**
 * historial.js - Consulta de ventas y detalle histórico con FastAPI
 * Cumple Ejercicio 3 y Casos G-04, G-05, G-07.
 */
(function () {
    'use strict';

    var document = window.document;

    var tbodyHistorial = document.getElementById('tabla-historial');
    var mensajeVacio = document.getElementById('historial-vacio');
    var contenedorDetalle = document.getElementById('historial-detalle');
    var tbodyDetalle = document.getElementById('tabla-detalle-venta');
    var infoVentaDetalle = document.getElementById('historial-detalle-info');
    var btnAnterior = document.getElementById('historial-prev');
    var btnSiguiente = document.getElementById('historial-next');
    var infoPaginacion = document.getElementById('historial-paginacion-info');

    var LIMIT = 20;
    var offsetActual = 0;

    function limpiarNodo(nodo) {
        if (!nodo) return;
        while (nodo.firstChild) {
            nodo.removeChild(nodo.firstChild);
        }
    }

    function formatoPrecio(num) {
        return '$' + Number(num).toFixed(2);
    }

    async function abrirDetalleVenta(ventaId) {
        if (!contenedorDetalle || !tbodyDetalle) return;
        contenedorDetalle.hidden = false;
        limpiarNodo(tbodyDetalle);
        if (infoVentaDetalle) {
            infoVentaDetalle.textContent = 'Cargando detalle histórico de venta #' + ventaId + ' desde GET /ventas/' + ventaId + '...';
        }

        try {
            // GET /ventas/{id} -> 200 OK con VentaDetailRead
            var venta = await window.api.get('/ventas/' + ventaId);

            if (infoVentaDetalle) {
                var fechaStr = new Date(venta.fecha).toLocaleString();
                var clienteInfo = venta.cliente ? (venta.cliente.nombre + ' (' + venta.cliente.email + ')') : ('ID #' + venta.cliente_id);
                infoVentaDetalle.innerHTML = [
                    '<strong>Venta #' + venta.id + '</strong> — Fecha: ' + fechaStr + '<br>',
                    '<strong>Cliente:</strong> ' + clienteInfo + '<br>',
                    '<strong>Total histórico facturado:</strong> <span style="color:var(--color-primario); font-size:1.1rem; font-weight:700;">' + formatoPrecio(venta.total) + '</span>'
                ].join('');
            }

            limpiarNodo(tbodyDetalle);
            (venta.renglones || []).forEach(function (r) {
                var fila = document.createElement('tr');

                var tdLibro = document.createElement('td');
                tdLibro.textContent = r.titulo + ' (ID #' + r.libro_id + ')';
                fila.appendChild(tdLibro);

                var tdPrecio = document.createElement('td');
                tdPrecio.textContent = formatoPrecio(r.precio_unitario);
                fila.appendChild(tdPrecio);

                var tdCant = document.createElement('td');
                tdCant.textContent = String(r.cantidad);
                fila.appendChild(tdCant);

                var tdSubtotal = document.createElement('td');
                tdSubtotal.textContent = formatoPrecio(r.subtotal);
                fila.appendChild(tdSubtotal);

                tbodyDetalle.appendChild(fila);
            });

            contenedorDetalle.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            if (infoVentaDetalle) {
                infoVentaDetalle.innerHTML = '<span class="mensaje-error">Error al cargar detalle de venta #' + ventaId + ': ' + err.message + '</span>';
            }
        }
    }

    async function cargarHistorial() {
        if (!tbodyHistorial) return;
        limpiarNodo(tbodyHistorial);

        try {
            // GET /ventas/ con limit y offset
            var ventas = await window.api.get('/ventas/', { limit: LIMIT, offset: offsetActual });

            if (!Array.isArray(ventas) || ventas.length === 0) {
                if (offsetActual === 0 && mensajeVacio) {
                    mensajeVacio.hidden = false;
                }
                actualizarPaginacion(0);
                return;
            }

            if (mensajeVacio) mensajeVacio.hidden = true;

            ventas.forEach(function (v) {
                var fila = document.createElement('tr');

                var tdId = document.createElement('td');
                tdId.textContent = '#' + v.id;
                fila.appendChild(tdId);

                var tdFecha = document.createElement('td');
                tdFecha.textContent = new Date(v.fecha).toLocaleString();
                fila.appendChild(tdFecha);

                var tdCliente = document.createElement('td');
                tdCliente.textContent = 'Cliente #' + v.cliente_id;
                fila.appendChild(tdCliente);

                var tdTotal = document.createElement('td');
                tdTotal.textContent = formatoPrecio(v.total);
                fila.appendChild(tdTotal);

                var tdAccion = document.createElement('td');
                var btnDetalle = document.createElement('button');
                btnDetalle.type = 'button';
                btnDetalle.className = 'boton-secundario';
                btnDetalle.style.padding = '0.2rem 0.5rem';
                btnDetalle.textContent = 'Ver Detalle';
                btnDetalle.addEventListener('click', function () {
                    abrirDetalleVenta(v.id);
                });
                tdAccion.appendChild(btnDetalle);
                fila.appendChild(tdAccion);

                tbodyHistorial.appendChild(fila);
            });

            actualizarPaginacion(ventas.length);
        } catch (err) {
            console.error('Error al cargar historial de ventas:', err);
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
        if (!tbodyHistorial) return;

        if (btnAnterior) {
            btnAnterior.addEventListener('click', function () {
                if (offsetActual >= LIMIT) {
                    offsetActual -= LIMIT;
                    cargarHistorial();
                }
            });
        }

        if (btnSiguiente) {
            btnSiguiente.addEventListener('click', function () {
                offsetActual += LIMIT;
                cargarHistorial();
            });
        }

        cargarHistorial();
    }

    window.historial = {
        cargarHistorial: cargarHistorial,
        abrirDetalleVenta: abrirDetalleVenta
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }
})();
