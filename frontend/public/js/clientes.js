/**
 * clientes.js - Alta y consulta por ID de Clientes con FastAPI
 * Cumple Ejercicio 2 y Caso G-03.
 */
(function () {
    'use strict';

    var document = window.document;

    var inputNombre = document.getElementById('cliente-nombre');
    var inputEmail = document.getElementById('cliente-email');
    var formCliente = document.querySelector('#vista-clientes form');
    var mensajeExito = document.getElementById('clientes-exito');
    var mensajeError = document.getElementById('clientes-error');
    var tablaClientesBody = document.getElementById('tabla-clientes');
    var clientesVacio = document.getElementById('clientes-vacio');

    // Búsqueda individual de cliente por ID (contrato GET /clientes/{id})
    var inputBuscarId = document.getElementById('cliente-buscar-id');
    var btnBuscarId = document.getElementById('cliente-buscar-btn');
    var contenedorResultadoId = document.getElementById('cliente-resultado-consulta');

    // Lista en memoria de clientes conocidos durante la sesión
    var clientesConocidos = [];

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

    function agregarClienteAMemoria(cliente) {
        var yaExiste = clientesConocidos.some(function (c) { return c.id === cliente.id; });
        if (!yaExiste) {
            clientesConocidos.push(cliente);
        }
        renderTablaClientes();
        if (window.ventas && typeof window.ventas.actualizarSelectorClientes === 'function') {
            window.ventas.actualizarSelectorClientes(clientesConocidos);
        }
    }

    function renderTablaClientes() {
        if (!tablaClientesBody) return;
        limpiarNodo(tablaClientesBody);

        if (clientesConocidos.length === 0) {
            if (clientesVacio) clientesVacio.hidden = false;
            return;
        }

        if (clientesVacio) clientesVacio.hidden = true;

        clientesConocidos.forEach(function (cliente) {
            var fila = document.createElement('tr');

            var tdId = document.createElement('td');
            tdId.textContent = String(cliente.id);
            fila.appendChild(tdId);

            var tdNombre = document.createElement('td');
            tdNombre.textContent = cliente.nombre;
            fila.appendChild(tdNombre);

            var tdEmail = document.createElement('td');
            tdEmail.textContent = cliente.email;
            fila.appendChild(tdEmail);

            tablaClientesBody.appendChild(fila);
        });
    }

    async function manejarSubmitCliente(event) {
        event.preventDefault();
        ocultarMensajes();

        var nombre = (inputNombre ? inputNombre.value : '').trim();
        var email = (inputEmail ? inputEmail.value : '').trim();

        if (!nombre) {
            mostrarError('El nombre completo es obligatorio.');
            return;
        }

        if (!email) {
            mostrarError('El correo electrónico es obligatorio.');
            return;
        }

        var regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(email)) {
            mostrarError('El email ingresado no tiene un formato válido.');
            return;
        }

        var payload = {
            nombre: nombre,
            email: email
        };

        try {
            // POST /clientes/ -> 201 Created
            var nuevoCliente = await window.api.post('/clientes/', payload);

            mostrarExito('Cliente "' + nuevoCliente.nombre + '" registrado con ID #' + nuevoCliente.id + ' (201 Created).');

            if (formCliente) formCliente.reset();
            agregarClienteAMemoria(nuevoCliente);
        } catch (err) {
            // Error 409 (email duplicado) o 422
            mostrarError(err.message);
        }
    }

    async function consultarClientePorId() {
        if (!contenedorResultadoId) return;
        contenedorResultadoId.hidden = true;
        limpiarNodo(contenedorResultadoId);

        var idTexto = (inputBuscarId ? inputBuscarId.value : '').trim();
        if (!idTexto) {
            contenedorResultadoId.innerHTML = '<p class="mensaje-error">Ingrese un ID numérico de cliente.</p>';
            contenedorResultadoId.hidden = false;
            return;
        }

        var idNumero = Number(idTexto);
        if (!Number.isInteger(idNumero) || idNumero <= 0) {
            contenedorResultadoId.innerHTML = '<p class="mensaje-error">El ID debe ser un entero positivo.</p>';
            contenedorResultadoId.hidden = false;
            return;
        }

        try {
            // GET /clientes/{id} -> 200 OK con ClienteDetailRead
            var cliente = await window.api.get('/clientes/' + idNumero);
            agregarClienteAMemoria(cliente);

            contenedorResultadoId.innerHTML = [
                '<div class="tarjeta" style="border-left: 4px solid var(--color-exito); margin-top: 0.5rem;">',
                '<h4>Datos del Cliente ID #' + cliente.id + '</h4>',
                '<p><strong>Nombre:</strong> ' + cliente.nombre + '<br>',
                '<strong>Email:</strong> ' + cliente.email + '</p>',
                (cliente.perfil ? '<p><strong>Teléfono:</strong> ' + cliente.perfil.telefono + '<br><strong>Dirección:</strong> ' + cliente.perfil.direccion + '</p>' : '<p><em>Sin perfil adicional configurado.</em></p>'),
                '</div>'
            ].join('');
            contenedorResultadoId.hidden = false;
        } catch (err) {
            contenedorResultadoId.innerHTML = '<p class="mensaje-error">Cliente #' + idNumero + ' no encontrado (' + err.message + ').</p>';
            contenedorResultadoId.hidden = false;
        }
    }

    async function precargarClientesIniciales() {
        // Precargar IDs típicos si existen (1 y 2) para agilizar selectores
        [1, 2].forEach(async function (id) {
            try {
                var cli = await window.api.get('/clientes/' + id);
                agregarClienteAMemoria(cli);
            } catch (e) {
                // Silencioso si aún no hay clientes sembrados
            }
        });
    }

    function inicializar() {
        if (!formCliente) return;

        formCliente.addEventListener('submit', manejarSubmitCliente);

        if (btnBuscarId) {
            btnBuscarId.addEventListener('click', consultarClientePorId);
        }

        precargarClientesIniciales();
        renderTablaClientes();
    }

    window.clientes = {
        agregarClienteAMemoria: agregarClienteAMemoria,
        getClientesConocidos: function () { return clientesConocidos; },
        consultarClientePorId: consultarClientePorId
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }
})();
