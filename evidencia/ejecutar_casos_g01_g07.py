"""
ejecutar_casos_g01_g07.py
Suite completa de validación funcional para la Evaluación Global de Programación III.
Ejecuta todas las operaciones a través de la URL del frontend (proxy inverso Nginx -> FastAPI -> PostgreSQL).
Soporta ejecuciones repetidas mediante sufijos temporales únicos.
"""
import sys
import time
from decimal import Decimal
import httpx

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080/api"
ts = int(time.time())

print("=" * 80)
print(f" EVALUACIÓN GLOBAL - VALIDACIÓN INTEGRAL CASOS G-01 A G-07")
print(f" URL Base de Pruebas: {BASE_URL}")
print(f" Marca temporal de sesión: {ts}")
print("=" * 80 + "\n")

with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:

    # -------------------------------------------------------------
    # G-07 (Parte 1): Salud y conectividad inicial
    # -------------------------------------------------------------
    print("[CASO G-07] Verificación de Salud del Sistema (Proxy + Backend + PostgreSQL)")
    res_ready = client.get("/health/ready")
    print(f"GET /health/ready -> Status {res_ready.status_code}: {res_ready.text}")
    assert res_ready.status_code == 200
    assert res_ready.json().get("estado") == "listo"
    print("✓ G-07 Salud inicial superada con éxito.\n")

    # -------------------------------------------------------------
    # G-01: Catálogo y cliente HTTP
    # -------------------------------------------------------------
    print("[CASO G-01] Catálogo de Libros, Búsqueda Parcial y Paginación")
    
    # 1. Búsqueda por título parcial
    res_buscar = client.get("/libros/", params={"titulo": "rayuela"})
    print(f"GET /libros/?titulo=rayuela -> Status {res_buscar.status_code}: {len(res_buscar.json())} libros encontrados.")
    assert res_buscar.status_code == 200
    libros_res = res_buscar.json()
    assert len(libros_res) >= 1
    assert "Rayuela" in libros_res[0]["titulo"]

    # 2. Paginación con limit y offset
    res_pag = client.get("/libros/", params={"limit": 1, "offset": 0})
    print(f"GET /libros/?limit=1&offset=0 -> Status {res_pag.status_code}: Retornó {len(res_pag.json())} libro.")
    assert res_pag.status_code == 200
    assert len(res_pag.json()) == 1

    res_pag2 = client.get("/libros/", params={"limit": 1, "offset": 1})
    print(f"GET /libros/?limit=1&offset=1 -> Status {res_pag2.status_code}: Retornó ID #{res_pag2.json()[0]['id']}.")
    assert res_pag2.status_code == 200
    assert len(res_pag2.json()) == 1
    assert res_pag2.json()[0]["id"] != res_pag.json()[0]["id"]

    # 3. Búsqueda sin coincidencias
    res_vacio = client.get("/libros/", params={"titulo": "inexistente_xyz_totalmente"})
    print(f"GET /libros/?titulo=inexistente_xyz_totalmente -> Status {res_vacio.status_code}: {res_vacio.json()}")
    assert res_vacio.status_code == 200
    assert res_vacio.json() == []

    # 4. Detalle de libro
    libro_id_sample = libros_res[0]["id"]
    res_det = client.get(f"/libros/{libro_id_sample}")
    print(f"GET /libros/{libro_id_sample} -> Status {res_det.status_code}: Título '{res_det.json()['titulo']}', Autores: {[a['nombre'] for a in res_det.json()['autores']]}")
    assert res_det.status_code == 200
    assert len(res_det.json()["autores"]) >= 1
    print("✓ G-01 Catálogo superado con éxito.\n")

    # -------------------------------------------------------------
    # G-02: Alta de libro
    # -------------------------------------------------------------
    print("[CASO G-02] Alta de Libro con Stock, Género y Autorías")
    isbn_test = f"978-950-{(ts % 100000):05d}-1"
    payload_libro = {
        "isbn": isbn_test,
        "titulo": f"Cuentos Completos (Edición {ts})",
        "precio": "38500.00",
        "stock": 25,
        "editorial_id": 1,
        "genero_id": 1,
        "autores": [
            {"autor_id": 1, "rol": "autor", "orden": 1},
            {"autor_id": 3, "rol": "coautor", "orden": 2}
        ]
    }

    res_crear_l = client.post("/libros/", json=payload_libro)
    print(f"POST /libros/ -> Status {res_crear_l.status_code}: ID #{res_crear_l.json().get('id')}")
    assert res_crear_l.status_code == 201
    libro_nuevo = res_crear_l.json()
    libro_nuevo_id = libro_nuevo["id"]
    assert libro_nuevo["stock"] == 25
    assert len(libro_nuevo["autores"]) == 2

    # Consultar detalle del libro creado
    res_verif_l = client.get(f"/libros/{libro_nuevo_id}")
    assert res_verif_l.status_code == 200
    print(f"GET /libros/{libro_nuevo_id} -> Confirmado stock={res_verif_l.json()['stock']} y {len(res_verif_l.json()['autores'])} autorías.")

    # Repetir ISBN -> 409
    res_dup_l = client.post("/libros/", json=payload_libro)
    print(f"POST /libros/ (ISBN repetido) -> Status {res_dup_l.status_code}: {res_dup_l.json().get('detail')}")
    assert res_dup_l.status_code == 409
    print("✓ G-02 Alta de libro superada con éxito.\n")

    # -------------------------------------------------------------
    # G-03: Alta de cliente
    # -------------------------------------------------------------
    print("[CASO G-03] Alta de Cliente y Consulta Individual por ID")
    email_test = f"estudiante_{ts}@frvm.utn.edu.ar"
    payload_cliente = {
        "nombre": f"Estudiante Global {ts}",
        "email": email_test
    }

    res_crear_c = client.post("/clientes/", json=payload_cliente)
    print(f"POST /clientes/ -> Status {res_crear_c.status_code}: ID #{res_crear_c.json().get('id')}")
    assert res_crear_c.status_code == 201
    cliente_nuevo_id = res_crear_c.json()["id"]

    # Recuperar cliente por ID (GET /clientes/{id})
    res_get_c = client.get(f"/clientes/{cliente_nuevo_id}")
    print(f"GET /clientes/{cliente_nuevo_id} -> Status {res_get_c.status_code}: {res_get_c.json()['nombre']} ({res_get_c.json()['email']})")
    assert res_get_c.status_code == 200
    assert res_get_c.json()["email"] == email_test

    # Repetir email -> 409
    res_dup_c = client.post("/clientes/", json=payload_cliente)
    print(f"POST /clientes/ (Email repetido) -> Status {res_dup_c.status_code}: {res_dup_c.json().get('detail')}")
    assert res_dup_c.status_code == 409
    print("✓ G-03 Alta de cliente superada con éxito.\n")

    # -------------------------------------------------------------
    # G-04: Registrar y consultar ventas con dos renglones
    # -------------------------------------------------------------
    print("[CASO G-04] Venta con Dos Renglones y Persistencia en PostgreSQL")
    payload_venta = {
        "cliente_id": cliente_nuevo_id,
        "renglones": [
            {"libro_id": 1, "cantidad": 2},
            {"libro_id": libro_nuevo_id, "cantidad": 1}
        ]
    }

    res_venta = client.post("/ventas/", json=payload_venta)
    print(f"POST /ventas/ -> Status {res_venta.status_code}: Venta ID #{res_venta.json().get('id')} con Total ${res_venta.json().get('total')}")
    assert res_venta.status_code == 201
    venta_data = res_venta.json()
    venta_id = venta_data["id"]
    
    # Obtener el precio actual de libro 1 para el cálculo
    res_l1_cur = client.get("/libros/1")
    precio_l1_cur = Decimal(str(res_l1_cur.json()["precio"]))
    total_esperado = precio_l1_cur * 2 + Decimal("38500.00") * 1
    assert Decimal(str(venta_data["total"])) == total_esperado
    assert len(venta_data["renglones"]) == 2

    # Consultar detalle post-recarga
    res_v_rec = client.get(f"/ventas/{venta_id}")
    print(f"GET /ventas/{venta_id} (post-recarga) -> Status {res_v_rec.status_code}: Total ${res_v_rec.json()['total']}")
    assert res_v_rec.status_code == 200
    assert Decimal(str(res_v_rec.json()["total"])) == total_esperado
    print("✓ G-04 Venta de dos renglones superada con éxito.\n")

    # -------------------------------------------------------------
    # G-05: Conservación de importes históricos tras PATCH
    # -------------------------------------------------------------
    print("[CASO G-05] Precio Histórico tras Modificación de Catálogo")
    # Modificar precio del libro 1
    nuevo_precio_libro_1 = f"{(int(precio_l1_cur) + 5000)}.00"
    res_patch = client.patch("/libros/1", json={"precio": nuevo_precio_libro_1})
    print(f"PATCH /libros/1 -> Status {res_patch.status_code}: Nuevo precio en catálogo ${res_patch.json()['precio']}")
    assert res_patch.status_code == 200

    # Consultar venta anterior y validar que su importe histórico se mantiene
    res_v_hist = client.get(f"/ventas/{venta_id}")
    assert res_v_hist.status_code == 200
    r_l1 = [r for r in res_v_hist.json()["renglones"] if r["libro_id"] == 1][0]
    print(f"Verificación de venta #{venta_id}:")
    print(f"  - Precio unitario histórico en renglón: ${r_l1['precio_unitario']} (Esperado: ${precio_l1_cur})")
    print(f"  - Total general histórico: ${res_v_hist.json()['total']} (Esperado: ${total_esperado})")
    assert Decimal(str(r_l1["precio_unitario"])) == precio_l1_cur
    assert Decimal(str(res_v_hist.json()["total"])) == total_esperado
    print("✓ G-05 Integridad de importes históricos superada con éxito.\n")

    # -------------------------------------------------------------
    # G-06: Rechazos de operación y preservación de historial
    # -------------------------------------------------------------
    print("[CASO G-06] Validación de Rechazos (409 Cliente/Libro Inexistente, 422 Libros Repetidos)")
    
    # Cantidad de ventas previa
    res_hist_prev = client.get("/ventas/")
    total_ventas_prev = len(res_hist_prev.json())

    # 1. Cliente inexistente -> 409
    res_cli_inex = client.post("/ventas/", json={
        "cliente_id": 888888,
        "renglones": [{"libro_id": 1, "cantidad": 1}]
    })
    print(f"POST /ventas/ con cliente inexistente -> Status {res_cli_inex.status_code}: {res_cli_inex.json().get('detail')}")
    assert res_cli_inex.status_code == 409

    # 2. Libro inexistente -> 409
    res_lib_inex = client.post("/ventas/", json={
        "cliente_id": cliente_nuevo_id,
        "renglones": [{"libro_id": 999999, "cantidad": 1}]
    })
    print(f"POST /ventas/ con libro inexistente -> Status {res_lib_inex.status_code}: {res_lib_inex.json().get('detail')}")
    assert res_lib_inex.status_code == 409

    # 3. Libros repetidos en renglones -> 422
    res_rep = client.post("/ventas/", json={
        "cliente_id": cliente_nuevo_id,
        "renglones": [
            {"libro_id": 1, "cantidad": 1},
            {"libro_id": 1, "cantidad": 3}
        ]
    })
    print(f"POST /ventas/ con libros repetidos -> Status {res_rep.status_code}")
    assert res_rep.status_code == 422

    # Verificar que el historial sigue inalterado
    res_hist = client.get("/ventas/")
    print(f"GET /ventas/ -> Status {res_hist.status_code}: {len(res_hist.json())} ventas en historial (Esperado: {total_ventas_prev}).")
    assert res_hist.status_code == 200
    assert len(res_hist.json()) == total_ventas_prev
    print("✓ G-06 Rechazos controlados y protección de historial superados con éxito.\n")

    print("=" * 80)
    print(" ¡TODAS LAS PRUEBAS G-01 A G-07 FUERON EJECUTADAS Y APROBADAS SATISFACTORIAMENTE!")
    print("=" * 80)
