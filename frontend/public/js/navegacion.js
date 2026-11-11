(function () {
    'use strict';

    var botones = document.querySelectorAll('nav [data-target]');
    var vistas = document.querySelectorAll('section.vista');

    function mostrarVista(idVista) {
        vistas.forEach(function (vista) {
            if (vista.id === idVista) {
                vista.removeAttribute('hidden');
            } else {
                vista.setAttribute('hidden', '');
            }
        });

        botones.forEach(function (boton) {
            if (boton.getAttribute('data-target') === idVista) {
                boton.classList.add('activo');
                boton.setAttribute('aria-current', 'page');
            } else {
                boton.classList.remove('activo');
                boton.removeAttribute('aria-current');
            }
        });
    }

    botones.forEach(function (boton) {
        boton.addEventListener('click', function () {
            var target = boton.getAttribute('data-target');
            if (target) {
                mostrarVista(target);
            }
        });
    });

    mostrarVista('vista-catalogo');
})();
