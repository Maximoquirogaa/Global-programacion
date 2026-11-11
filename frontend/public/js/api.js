/**
 * api.js - Cliente HTTP centralizado para la API de la Librería
 * Requisito Ejercicio 1: Base '/api' y preservación de barras finales.
 */
(function () {
    'use strict';

    var API_BASE = window.__API_BASE__ || '/api';

    function construirUrl(endpoint, params) {
        var base = API_BASE.replace(/\/+$/, '');
        var ruta = endpoint;
        if (ruta.charAt(0) !== '/') {
            ruta = '/' + ruta;
        }
        var urlCompleta = base + ruta;

        if (params && typeof params === 'object') {
            var searchParams = new URLSearchParams();
            Object.keys(params).forEach(function (clave) {
                var valor = params[clave];
                if (valor !== null && valor !== undefined && valor !== '') {
                    searchParams.append(clave, valor);
                }
            });
            var queryString = searchParams.toString();
            if (queryString) {
                urlCompleta += (urlCompleta.indexOf('?') === -1 ? '?' : '&') + queryString;
            }
        }
        return urlCompleta;
    }

    function formatearDetalleError(detail) {
        if (!detail) {
            return 'Error desconocido en el servidor.';
        }
        if (typeof detail === 'string') {
            return detail;
        }
        if (Array.isArray(detail)) {
            // Manejo de errores de validación de Pydantic/FastAPI (422)
            return detail.map(function (item) {
                var campo = (item.loc || []).filter(function (l) { return l !== 'body'; }).join(' -> ');
                return (campo ? campo + ': ' : '') + item.msg;
            }).join(' | ');
        }
        return JSON.stringify(detail);
    }

    async function request(endpoint, options) {
        var opts = options || {};
        var metodo = opts.method || 'GET';
        var url = construirUrl(endpoint, opts.params);

        var headers = Object.assign({
            'Accept': 'application/json'
        }, opts.headers || {});

        var config = {
            method: metodo,
            headers: headers
        };

        if (opts.body !== undefined && opts.body !== null) {
            config.headers['Content-Type'] = 'application/json';
            config.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
        }

        try {
            var response = await fetch(url, config);

            var data = null;
            var contentType = response.headers.get('content-type') || '';
            if (contentType.indexOf('application/json') !== -1) {
                try {
                    data = await response.json();
                } catch (e) {
                    data = null;
                }
            } else if (response.status !== 204) {
                try {
                    data = await response.text();
                } catch (e) {
                    data = null;
                }
            }

            if (!response.ok) {
                var mensaje = 'Error del servidor (' + response.status + ')';
                if (data && data.detail) {
                    mensaje = formatearDetalleError(data.detail);
                } else if (typeof data === 'string' && data.trim()) {
                    mensaje = data;
                }
                var error = new Error(mensaje);
                error.status = response.status;
                error.data = data;
                error.url = url;
                throw error;
            }

            return data;
        } catch (err) {
            if (!err.status) {
                // Error de red, conexión rechazada o DNS
                var redError = new Error('No se pudo establecer conexión con el servidor (/api). Verifique que el backend esté en ejecución.');
                redError.status = 0;
                redError.original = err;
                throw redError;
            }
            throw err;
        }
    }

    function get(endpoint, params) {
        return request(endpoint, { method: 'GET', params: params });
    }

    function post(endpoint, body) {
        return request(endpoint, { method: 'POST', body: body });
    }

    function patch(endpoint, body) {
        return request(endpoint, { method: 'PATCH', body: body });
    }

    function del(endpoint) {
        return request(endpoint, { method: 'DELETE' });
    }

    window.api = {
        API_BASE: API_BASE,
        request: request,
        get: get,
        post: post,
        patch: patch,
        del: del,
        formatearDetalleError: formatearDetalleError
    };
})();
