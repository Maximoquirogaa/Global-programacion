/**
 * ventas.js - Registro de ventas enlazado con la API de FastAPI
 * Cumple Ejercicio 3 y Casos G-04, G-06.
 */
(function () {
    'use strict';

    var document = window.document;

    // Elementos del DOM
    var selectCliente = document.getElementById('venta-cliente');
    var inputClienteIdDirecto = document.getElementById('venta-cliente-id-directo');
    var btnVerificarClienteDirecto = document.getElementById('venta-cliente-verificar-btn');
    var spanClienteSeleccionado = document.getElementById('venta-cliente-info');

    var selectLibro = document.getElementById('venta-libro');
    var inputCantidad = document.getElementById('venta-cantidad');
    var btnAgregarRenglon = document.getElementById('agregar-renglon');
    var tablaRenglonesBody = document.getElementById('tabla-renglones');
    var ventasVacio = document.getElementById('ventas-vacio');
    var valorTotalVenta = document.getElementById('ventas-total-valor');

    var formVenta = document.querySelector('#vista-ventas form');
    var btnConfirmarVenta = document.getElementById('confirmar-venta');
    var mensajeExito = document.getElementById('ventas-exito');
    var mensajeError = document.getElementById('ventas-error');
    var contenedorComprobante = document.getElementById('ventas-comprobante-servidor');

    // Estado en memoria del borrador de la venta (requisito de consigna)
    var clienteIdSeleccionado = null;
    var clienteNombreSeleccionado = '';
    var renglonesBorrador = [];
    var catalogoLibrosCache = [];

    function limpiarNodo(nodo) {
        if (!nodo) return;
        while (nodo.firstChild) {
            nodo.removeChild(nodo.firstChild);
        }
    }

    function redondear2(val) {
        return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
    }

    function formatoPrecio(num) {
        return '$' + Number(num).toFixed(2);
    }

    function ocultarMensajes() {
        if (mensajeExito) mensajeExito.hidden = true;
        if (mensajeError) mensajeError.hidden = true;
        if (contenedorComprobante) contenedorComprobante.hidden = true;
    }

    function mostrarError(mensaje) {
        if (mensajeExito) mensajeExito.hidden = true;
        if (mensajeError) {
            mensajeError.textContent = mensaje;
            mensajeError.hidden = false;
        }
    }

    function mostrarExito(mensaje) {
        if (mensajeError) mensajeError.hidden = true;
        if (mensajeExito) {
            mensajeExito.textContent = mensaje;
            mensajeExito.hidden = false;
        }
    }

    function actualizarTotal() {
        var total = 0;
        renglonesBorrador.forEach(function (r) {
            total += r.subtotal;
        });
        total = redondear2(total);
        if (valorTotalVenta) {
            valorTotalVenta.textContent = formatoPrecio(total);
        }
    }

    function renderTablaRenglones() {
        if (!tablaRenglonesBody) return;
        limpiarNodo(tablaRenglonesBody);

        if (renglonesBorrador.length === 0) {
            if (ventasVacio) ventasVacio.hidden = false;
            actualizarTotal();
            return;
        }

        if (ventasVacio) ventasVacio.hidden = true;

        renglonesBorrador.forEach(function (r, index) {
            var fila = document.createElement('tr');

            // Libro
            var tdLibro = document.createElement('td');
            tdLibro.textContent = r.titulo + ' (ID #' + r.libro_id + ')';
            fila.appendChild(tdLibro);

            // Precio unitario copiado
            var tdPrecio = document.createElement('td');
            tdPrecio.textContent = formatoPrecio(r.precio_unitario);
            fila.appendChild(tdPrecio);

            // Cantidad con control para modificar
            var tdCant = document.createElement('td');
            var inputCantRenglon = document.createElement('input');
            inputCantRenglon.type = 'number';
            inputCantRenglon.min = '1';
            inputCantRenglon.step = '1';
            inputCantRenglon.value = String(r.cantidad);
            inputCantRenglon.style.width = '70px';
            inputCantRenglon.style.marginBottom = '0';
            inputCantRenglon.addEventListener('change', function () {
                var nuevaCant = Number(inputCantRenglon.value);
                if (Number.isInteger(nuevaCant) && nuevaCant > 0) {
                    r.cantidad = nuevaCant;
                    r.subtotal = redondear2(r.cantidad * r.precio_unitario);
                    renderTablaRenglones();
                } else {
                    inputCantRenglon.value = String(r.cantidad);
                }
            });
            tdCant.appendChild(inputCantRenglon);
            fila.appendChild(tdCant);

            // Subtotal
            var tdSubtotal = document.createElement('td');
            tdSubtotal.textContent = formatoPrecio(r.subtotal);
            fila.appendChild(tdSubtotal);

            // Acción: Quitar
            var tdAccion = document.createElement('td');
            var btnQuitar = document.createElement('button');
            btnQuitar.type = 'button';
            btnQuitar.className = 'boton-secundario';
            btnQuitar.style.padding = '0.2rem 0.5rem';
            btnQuitar.textContent = 'Quitar';
            btnQuitar.addEventListener('click', function () {
                renglonesBorrador.splice(index, 1);
                renderTablaRenglones();
            });
            tdAccion.appendChild(btnQuitar);
            fila.appendChild(tdAccion);

            tablaRenglonesBody.appendChild(fila);
        });

        actualizarTotal();
    }

    function fijarCliente(id, nombre, email) {
        clienteIdSeleccionado = Number(id);
        clienteNombreSeleccionado = nombre;
        if (spanClienteSeleccionado) {
            spanClienteSeleccionado.textContent = '✓ Cliente seleccionado: ' + nombre + ' (' + email + ') — ID #' + id;
            spanClienteSeleccionado.style.color = 'var(--color-exito)';
        }
        if (selectCliente) {
            selectCliente.value = String(id);
        }
    }

    async function verificarClienteDirectoPorId() {
        ocultarMensajes();
        var idTexto = (inputClienteIdDirecto ? inputClienteIdDirecto.value : '').trim();
        if (!idTexto) {
            mostrarError('Ingrese un ID de cliente para verificar.');
            return;
        }

        var idNumero = Number(idTexto);
        if (!Number.isInteger(idNumero) || idNumero <= 0) {
            mostrarError('El ID de cliente debe ser un entero positivo.');
            return;
        }

        try {
            if (spanClienteSeleccionado) spanClienteSeleccionado.textContent = 'Consultando GET /clientes/' + idNumero + '...';
            var cli = await window.api.get('/clientes/' + idNumero);
            fijarCliente(cli.id, cli.nombre, cli.email);
            if (window.clientes && typeof window.clientes.agregarClienteAMemoria === 'function') {
                window.clientes.agregarClienteAMemoria(cli);
            }
        } catch (err) {
            clienteIdSeleccionado = null;
            if (spanClienteSeleccionado) {
                spanClienteSeleccionado.textContent = '✗ Cliente #' + idNumero + ' no existe (' + err.message + ')';
                spanClienteSeleccionado.style.color = 'var(--color-error)';
            }
        }
    }

    function actualizarSelectorClientes(clientes) {
        if (!selectCliente) return;
        var valorActual = selectCliente.value;
        limpiarNodo(selectCliente);

        var optDef = document.createElement('option');
        optDef.value = '';
        optDef.textContent = 'Seleccione un cliente...';
        selectCliente.appendChild(optDef);

        (clientes || []).forEach(function (cli) {
            var opt = document.createElement('option');
            opt.value = String(cli.id);
            opt.textContent = '#' + cli.id + ' - ' + cli.nombre + ' (' + cli.email + ')';
            selectCliente.appendChild(opt);
        });

        if (valorActual) {
            selectCliente.value = valorActual;
        }
    }

    async function cargarLibrosParaVenta() {
        if (!selectLibro) return;
        try {
            var libros = await window.api.get('/libros/', { limit: 100, offset: 0 });
            if (Array.isArray(libros)) {
                catalogoLibrosCache = libros;
                limpiarNodo(selectLibro);

                var optDef = document.createElement('option');
                optDef.value = '';
                optDef.textContent = 'Seleccione un libro...';
                selectLibro.appendChild(optDef);

                libros.forEach(function (libro) {
                    var opt = document.createElement('option');
                    opt.value = String(libro.id);
                    opt.textContent = '#' + libro.id + ' - ' + libro.titulo + ' (Stock: ' + libro.stock + ' | $' + Number(libro.precio).toFixed(2) + ')';
                    selectLibro.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Error al cargar libros para selector de venta:', err);
        }
    }

    function manejarAgregarRenglon() {
        ocultarMensajes();

        var libroId = selectLibro ? Number(selectLibro.value) : NaN;
        var cantidad = inputCantidad ? Number(inputCantidad.value) : NaN;

        if (!Number.isInteger(libroId) || libroId <= 0) {
            mostrarError('Seleccione un libro del catálogo.');
            return;
        }

        if (!Number.isInteger(cantidad) || cantidad <= 0) {
            mostrarError('La cantidad debe ser un número entero mayor que cero.');
            return;
        }

        var libroEncontrado = catalogoLibrosCache.find(function (l) { return l.id === libroId; });
        if (!libroEncontrado) {
            mostrarError('El libro seleccionado no se encuentra en el catálogo.');
            return;
        }

        // Regla: un solo renglón por libro (RN-05). Si ya existe, se suma la cantidad.
        var existente = renglonesBorrador.find(function (r) { return r.libro_id === libroId; });
        if (existente) {
            existente.cantidad += cantidad;
            existente.subtotal = redondear2(existente.cantidad * existente.precio_unitario);
            mostrarExito('El libro ya estaba en la venta. Se sumó la cantidad al renglón existente (Total: ' + existente.cantidad + ').');
        } else {
            var precioUnitario = Number(libroEncontrado.precio);
            renglonesBorrador.push({
                libro_id: libroId,
                titulo: libroEncontrado.titulo,
                precio_unitario: precioUnitario,
                cantidad: cantidad,
                subtotal: redondear2(precioUnitario * cantidad)
            });
        }

        renderTablaRenglones();
        if (inputCantidad) inputCantidad.value = '1';
    }

    async function manejarSubmitVenta(event) {
        event.preventDefault();
        ocultarMensajes();

        // Determinar cliente id
        var idCliente = clienteIdSeleccionado;
        if (!idCliente && selectCliente && selectCliente.value) {
            idCliente = Number(selectCliente.value);
        }

        if (!idCliente || !Number.isInteger(idCliente) || idCliente <= 0) {
            mostrarError('Debe seleccionar o verificar un cliente válido antes de confirmar la venta.');
            return;
        }

        // Regla: al menos un renglón
        if (renglonesBorrador.length === 0) {
            mostrarError('La venta debe tener al menos un renglón de libros.');
            return;
        }

        // Regla: un solo renglón por libro y cantidades enteras > 0
        var idsLibros = renglonesBorrador.map(function (r) { return r.libro_id; });
        var repetidos = idsLibros.some(function (id, idx) { return idsLibros.indexOf(id) !== idx; });
        if (repetidos) {
            mostrarError('Una venta no puede contener renglones repetidos con el mismo libro.');
            return;
        }

        for (var i = 0; i < renglonesBorrador.length; i++) {
            if (!Number.isInteger(renglonesBorrador[i].cantidad) || renglonesBorrador[i].cantidad <= 0) {
                mostrarError('Todas las cantidades deben ser números enteros mayores a cero.');
                return;
            }
        }

        // Armado del cuerpo exacto de la consigna:
        // { "cliente_id": 2, "renglones": [{"libro_id": 1, "cantidad": 2}, ...] }
        var payload = {
            cliente_id: idCliente,
            renglones: renglonesBorrador.map(function (r) {
                return {
                    libro_id: r.libro_id,
                    cantidad: r.cantidad
                };
            })
        };

        // Deshabilitar botón durante el envío (requisito consigna)
        if (btnConfirmarVenta) {
            btnConfirmarVenta.disabled = true;
            btnConfirmarVenta.textContent = 'Procesando venta en servidor...';
        }

        try {
            // POST /ventas/ -> 201 Created con VentaDetailRead
            var ventaRegistrada = await window.api.post('/ventas/', payload);

            mostrarExito('¡Venta #' + ventaRegistrada.id + ' confirmada con éxito por el servidor (201 Created)!');

            // Renderizar el comprobante con los importes devueltos por la API
            if (contenedorComprobante) {
                var renglonesHtml = ventaRegistrada.renglones.map(function (r) {
                    return [
                        '<tr>',
                        '<td>' + r.titulo + ' (ID #' + r.libro_id + ')</td>',
                        '<td>' + formatoPrecio(r.precio_unitario) + '</td>',
                        '<td>' + r.cantidad + '</td>',
                        '<td>' + formatoPrecio(r.subtotal) + '</td>',
                        '</tr>'
                    ].join('');
                }).join('');

                contenedorComprobante.innerHTML = [
                    '<div class="tarjeta" style="border: 2px solid var(--color-exito); margin-top: 1rem;">',
                    '<h3>Comprobante de Venta Oficial #' + ventaRegistrada.id + '</h3>',
                    '<p><strong>Fecha:</strong> ' + new Date(ventaRegistrada.fecha).toLocaleString() + '<br>',
                    '<strong>Cliente:</strong> ' + ventaRegistrada.cliente.nombre + ' (' + ventaRegistrada.cliente.email + ')</p>',
                    '<div class="tabla-contenedor">',
                    '<table>',
                    '<thead><tr><th>Libro</th><th>Precio Unit. Oficial</th><th>Cantidad</th><th>Subtotal</th></tr></thead>',
                    '<tbody>' + renglonesHtml + '</tbody>',
                    '</table>',
                    '</div>',
                    '<p style="font-size: 1.15rem; font-weight: 700; color: var(--color-primario);">Total confirmado por la API: ' + formatoPrecio(ventaRegistrada.total) + '</p>',
                    '</div>'
                ].join('');
                contenedorComprobante.hidden = false;
            }

            // Limpiar formulario y borrador de venta tras confirmación exitosa
            renglonesBorrador = [];
            clienteIdSeleccionado = null;
            if (spanClienteSeleccionado) spanClienteSeleccionado.textContent = '';
            if (selectCliente) selectCliente.value = '';
            if (inputClienteIdDirecto) inputClienteIdDirecto.value = '';
            renderTablaRenglones();

            // Actualizar historial de ventas
            if (window.historial && typeof window.historial.cargarHistorial === 'function') {
                window.historial.cargarHistorial();
            }
        } catch (err) {
            // Requisito consigna: Conservar el borrador cuando se rechaza la operación (409 o 422)
            mostrarError('La venta fue rechazada por el servidor: ' + err.message);
            // El borrador renglonesBorrador y clienteIdSeleccionado permanecen intactos
        } finally {
            if (btnConfirmarVenta) {
                btnConfirmarVenta.disabled = false;
                btnConfirmarVenta.textContent = 'Confirmar Venta';
            }
        }
    }

    function inicializar() {
        if (!formVenta) return;

        cargarLibrosParaVenta();

        if (selectCliente) {
            selectCliente.addEventListener('change', function () {
                var val = selectCliente.value;
                if (val) {
                    var texto = selectCliente.options[selectCliente.selectedIndex].textContent;
                    clienteIdSeleccionado = Number(val);
                    if (spanClienteSeleccionado) {
                        spanClienteSeleccionado.textContent = 'Cliente seleccionado: ' + texto;
                        spanClienteSeleccionado.style.color = 'var(--color-exito)';
                    }
                } else {
                    clienteIdSeleccionado = null;
                    if (spanClienteSeleccionado) spanClienteSeleccionado.textContent = '';
                }
            });
        }

        if (btnVerificarClienteDirecto) {
            btnVerificarClienteDirecto.addEventListener('click', verificarClienteDirectoPorId);
        }

        if (btnAgregarRenglon) {
            btnAgregarRenglon.addEventListener('click', manejarAgregarRenglon);
        }

        formVenta.addEventListener('submit', manejarSubmitVenta);

        renderTablaRenglones();
    }

    window.ventas = {
        actualizarSelectorClientes: actualizarSelectorClientes,
        cargarLibrosParaVenta: cargarLibrosParaVenta,
        getRenglonesBorrador: function () { return renglonesBorrador; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }
})();
