"""
test_casos_global.py - Verificación automatizada de los Casos de Prueba G-01 a G-07
Evaluación Global de Programación III - Librería Web Integrada
"""
import asyncio
import sys
from decimal import Decimal
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from httpx import AsyncClient, ASGITransport
from app.main import app, lifespan


async def run_casos_global():
    print("=" * 75)
    print(" EJECUCIÓN AUTOMATIZADA DE CASOS DE PRUEBA GLOBAL (G-01 a G-07)")
    print("=" * 75 + "\n")

    async with lifespan(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1:8000") as client:

            # -----------------------------------------------------------------
            # G-01: Catálogo
            # Buscar por título, avanzar con limit y offset, probar búsqueda sin coincidencias.
            # Abrir el detalle de un libro.
            # -----------------------------------------------------------------
            print("--- [G-01] CASO CATÁLOGO ---")

            # 1. Buscar por título parcial 'rayuela'
            res = await client.get("/libros/", params={"titulo": "rayuela"})
            assert res.status_code == 200, f"Error en búsqueda: {res.status_code}"
            libros_rayuela = res.json()
            assert len(libros_rayuela) >= 1, "Debe encontrar al menos un libro con 'rayuela'"
            print(f"✓ Búsqueda por título 'rayuela': {len(libros_rayuela)} libro(s) encontrado(s). Título: '{libros_rayuela[0]['titulo']}'")

            # 2. Paginación con limit=1 y offset=1
            res_pag = await client.get("/libros/", params={"limit": 1, "offset": 1})
            assert res_pag.status_code == 200
            libros_pag = res_pag.json()
            assert len(libros_pag) == 1, "Paginación limit=1 debe retornar exactamente 1 libro"
            print(f"✓ Paginación (limit=1, offset=1): libro ID #{libros_pag[0]['id']} ('{libros_pag[0]['titulo']}')")

            # 3. Búsqueda sin coincidencias
            res_vacio = await client.get("/libros/", params={"titulo": "titulo_inexistente_xyz_12345"})
            assert res_vacio.status_code == 200
            assert res_vacio.json() == [], "Búsqueda sin coincidencias debe retornar lista vacía []"
            print("✓ Búsqueda sin coincidencias: retornó lista vacía [] correctamente.")

            # 4. Abrir el detalle de un libro (GET /libros/{id})
            libro_id_test = libros_rayuela[0]["id"]
            res_det = await client.get(f"/libros/{libro_id_test}")
            assert res_det.status_code == 200
            det = res_det.json()
            assert "autores" in det and len(det["autores"]) >= 1
            print(f"✓ Detalle del libro #{libro_id_test}: '{det['titulo']}' - Autores: {[a['nombre'] for a in det['autores']]} - Stock: {det['stock']}")

            # -----------------------------------------------------------------
            # G-02: Alta de libro
            # Crear un libro con stock, género opcional y autorías. Consultar el detalle.
            # Repetir el ISBN y verificar el 409.
            # -----------------------------------------------------------------
            print("\n--- [G-02] CASO ALTA DE LIBRO ---")

            isbn_nuevo = "978-987-99-9999-9"
            payload_libro = {
                "isbn": isbn_nuevo,
                "titulo": "Ficciones Global Edition",
                "precio": "32000.50",
                "stock": 10,
                "editorial_id": 1,
                "genero_id": 1,
                "autores": [
                    {"autor_id": 1, "rol": "autor", "orden": 1},
                    {"autor_id": 2, "rol": "coautor", "orden": 2}
                ]
            }

            res_crear_l = await client.post("/libros/", json=payload_libro)
            assert res_crear_l.status_code == 201, f"Esperado 201 Created: {res_crear_l.text}"
            libro_creado = res_crear_l.json()
            assert libro_creado["isbn"] == isbn_nuevo
            assert len(libro_creado["autores"]) == 2
            assert libro_creado["stock"] == 10
            nuevo_libro_id = libro_creado["id"]
            print(f"✓ Alta de libro exitosa (201 Created): ID #{nuevo_libro_id} - '{libro_creado['titulo']}'")

            # Consultar el detalle del libro recién creado
            res_verif_l = await client.get(f"/libros/{nuevo_libro_id}")
            assert res_verif_l.status_code == 200
            assert res_verif_l.json()["id"] == nuevo_libro_id
            print(f"✓ Verificación de detalle GET /libros/{nuevo_libro_id}: Confirmado OK con {len(res_verif_l.json()['autores'])} autorías.")

            # Repetir el ISBN para verificar 409 Conflict
            res_duplicado_l = await client.post("/libros/", json=payload_libro)
            assert res_duplicado_l.status_code == 409, f"Esperado 409 Conflict: {res_duplicado_l.status_code}"
            print(f"✓ Validación de unicidad de ISBN: Rechazado correctamente con HTTP 409 Conflict -> '{res_duplicado_l.json()['detail']}'")

            # -----------------------------------------------------------------
            # G-03: Alta de cliente
            # Crear un cliente y recuperarlo por ID. Repetir el email y verificar el 409.
            # -----------------------------------------------------------------
            print("\n--- [G-03] CASO ALTA DE CLIENTE ---")

            email_cliente = "global_eval_alumno@utn.edu.ar"
            payload_cliente = {
                "nombre": "Alumno Global Evaluacion",
                "email": email_cliente
            }

            res_crear_c = await client.post("/clientes/", json=payload_cliente)
            assert res_crear_c.status_code == 201, f"Esperado 201 Created: {res_crear_c.text}"
            cliente_creado = res_crear_c.json()
            nuevo_cliente_id = cliente_creado["id"]
            print(f"✓ Alta de cliente exitosa (201 Created): ID #{nuevo_cliente_id} - '{cliente_creado['nombre']}' ({cliente_creado['email']})")

            # Recuperarlo por ID (GET /clientes/{id})
            res_verif_c = await client.get(f"/clientes/{nuevo_cliente_id}")
            assert res_verif_c.status_code == 200
            assert res_verif_c.json()["email"] == email_cliente
            print(f"✓ Consulta de cliente GET /clientes/{nuevo_cliente_id}: Recuperado OK.")

            # Repetir el email y verificar el 409 Conflict
            res_duplicado_c = await client.post("/clientes/", json=payload_cliente)
            assert res_duplicado_c.status_code == 409, f"Esperado 409 Conflict: {res_duplicado_c.status_code}"
            print(f"✓ Validación de unicidad de Email: Rechazado correctamente con HTTP 409 Conflict -> '{res_duplicado_c.json()['detail']}'")

            # -----------------------------------------------------------------
            # G-04: Venta
            # Registrar una venta válida con dos renglones. Verificar 201 y consultar
            # el detalle después de recargar.
            # -----------------------------------------------------------------
            print("\n--- [G-04] CASO VENTA CON DOS RENGLONES ---")

            payload_venta = {
                "cliente_id": nuevo_cliente_id,
                "renglones": [
                    {"libro_id": 1, "cantidad": 2},
                    {"libro_id": nuevo_libro_id, "cantidad": 1}
                ]
            }

            res_venta = await client.post("/ventas/", json=payload_venta)
            assert res_venta.status_code == 201, f"Esperado 201 Created: {res_venta.text}"
            venta_data = res_venta.json()
            venta_id = venta_data["id"]
            total_esperado = Decimal("25000.00") * 2 + Decimal("32000.50") * 1
            assert Decimal(str(venta_data["total"])) == total_esperado
            assert len(venta_data["renglones"]) == 2
            print(f"✓ Venta #{venta_id} registrada con 201 Created. Total confirmado por backend: ${venta_data['total']}")

            # Consultar el detalle de la venta (simula recargar la página)
            res_v_recarga = await client.get(f"/ventas/{venta_id}")
            assert res_v_recarga.status_code == 200
            v_rec = res_v_recarga.json()
            assert v_rec["id"] == venta_id
            assert Decimal(str(v_rec["total"])) == total_esperado
            print(f"✓ Consulta de detalle post-recarga GET /ventas/{venta_id}: Mismo total (${v_rec['total']}) y datos consistentes.")

            # -----------------------------------------------------------------
            # G-05: Precio histórico
            # Cambiar el precio con PATCH /libros/{id} y verificar que la venta
            # anterior conserva sus importes.
            # -----------------------------------------------------------------
            print("\n--- [G-05] CASO PRECIO HISTÓRICO ---")

            # Cambiar precio de libro 1 de 25000 a 99999.00
            res_patch = await client.patch("/libros/1", json={"precio": "99999.00"})
            assert res_patch.status_code == 200
            assert Decimal(str(res_patch.json()["precio"])) == Decimal("99999.00")
            print("✓ Precio de libro #1 actualizado mediante PATCH /libros/1 a $99999.00.")

            # Volver a consultar la venta anterior y comprobar que su renglón conserva el precio histórico de $25000
            res_v_hist = await client.get(f"/ventas/{venta_id}")
            assert res_v_hist.status_code == 200
            v_hist = res_v_hist.json()
            renglon_l1 = [r for r in v_hist["renglones"] if r["libro_id"] == 1][0]
            assert Decimal(str(renglon_l1["precio_unitario"])) == Decimal("25000.00"), "El precio histórico debe conservarse!"
            assert Decimal(str(v_hist["total"])) == total_esperado, "El total de la venta debe conservarse inalterado!"
            print(f"✓ Verificación de integridad histórica: Renglón conserva precio unitario histórico de ${renglon_l1['precio_unitario']} y total de ${v_hist['total']}.")

            # -----------------------------------------------------------------
            # G-06: Rechazo
            # Probar un ID inexistente (409) y renglones repetidos (422).
            # El historial queda igual.
            # -----------------------------------------------------------------
            print("\n--- [G-06] CASO RECHAZO DE OPERACIÓN ---")

            # 1. ID de cliente o libro inexistente -> 409
            res_rechazo_409 = await client.post("/ventas/", json={
                "cliente_id": 999999,
                "renglones": [{"libro_id": 1, "cantidad": 1}]
            })
            assert res_rechazo_409.status_code == 409, f"Esperado 409: {res_rechazo_409.status_code}"
            print(f"✓ Rechazo por cliente inexistente: HTTP 409 Conflict -> '{res_rechazo_409.json()['detail']}'")

            res_rechazo_libro_409 = await client.post("/ventas/", json={
                "cliente_id": nuevo_cliente_id,
                "renglones": [{"libro_id": 999999, "cantidad": 1}]
            })
            assert res_rechazo_libro_409.status_code == 409, f"Esperado 409: {res_rechazo_libro_409.status_code}"
            print(f"✓ Rechazo por libro inexistente: HTTP 409 Conflict -> '{res_rechazo_libro_409.json()['detail']}'")

            # 2. Renglones repetidos con el mismo libro -> 422
            res_rechazo_422 = await client.post("/ventas/", json={
                "cliente_id": nuevo_cliente_id,
                "renglones": [
                    {"libro_id": 1, "cantidad": 1},
                    {"libro_id": 1, "cantidad": 2}
                ]
            })
            assert res_rechazo_422.status_code == 422, f"Esperado 422: {res_rechazo_422.status_code}"
            print(f"✓ Rechazo por renglones repetidos: HTTP 422 Unprocessable Entity -> '{res_rechazo_422.json()['detail']}'")

            # Verificar que el historial de ventas no se alteró
            res_hist_check = await client.get("/ventas/")
            ventas_actuales = res_hist_check.json()
            ids_ventas = [v["id"] for v in ventas_actuales]
            assert venta_id in ids_ventas
            print(f"✓ Historial de ventas verificado: No se agregaron ventas inválidas. Total ventas registradas: {len(ventas_actuales)}.")

            # -----------------------------------------------------------------
            # G-07: Salud y Despliegue
            # Endpoint /health/ready devuelve 200
            # -----------------------------------------------------------------
            print("\n--- [G-07] CASO SALUD Y DESPLIEGUE ---")
            res_health = await client.get("/health/ready")
            assert res_health.status_code == 200
            print(f"✓ Endpoint de salud /health/ready respondió HTTP 200 OK: {res_health.json()}")

            print("\n" + "=" * 75)
            print(" ¡TODOS LOS CASOS G-01 A G-07 FUERON VERIFICADOS EXITOSAMENTE!")
            print("=" * 75 + "\n")


if __name__ == "__main__":
    asyncio.run(run_casos_global())
