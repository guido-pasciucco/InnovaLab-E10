# Databricks notebook source
# DBTITLE 1,Título
# MAGIC %md
# MAGIC # Ingesta de Datos Ficticios — workspace.innovalab
# MAGIC
# MAGIC Notebook de respaldo con la generación e inserción de datos ficticios para 5 negocios PyME (3 perfiles, 20 productos). Los datos de Pan Artesano se cargan por separado desde el SQL query `data_ingest_Pan_artesano`.
# MAGIC
# MAGIC **Precaución:** La celda de limpieza (DELETE) está comentada. Descomentar solo si se necesita regenerar todo desde cero.

# COMMAND ----------

# DBTITLE 1,Limpiar datos (comentado)
# ── Limpiar datos existentes (COMENTADO - descomentar solo si se necesita regenerar) ──
# ADVERTENCIA: Este DELETE borra TODAS las tablas incluyendo los datos de Pan Artesano
# cargados desde el SQL query data_ingest_Pan_artesano.
# Solo descomentar si se desea regenerar todo desde cero.
# 
# for t in ["computed_results", "pricing_inputs", "calc_cost_lines", "scenarios",
#           "costing_setup", "calculations", "business_cost_lines", "products", "businesses", "profiles"]:
#     spark.sql(f"DELETE FROM workspace.innovalab.{t}")
#     print(f"✓ {t}")
# print("\nTablas limpias. Listo para insertar.")

# COMMAND ----------

# DBTITLE 1,Insertar datos base
# ============================================================
# DATOS BASE: profiles, businesses, products, business_cost_lines
# ============================================================

# ── 1. PROFILES (3) ──
spark.sql("""INSERT INTO workspace.innovalab.profiles (id, display_name, created_at) VALUES
  ('prof_001', 'María González', current_timestamp()),
  ('prof_002', 'Carlos Fernández', current_timestamp()),
  ('prof_003', 'Lucía Pérez', current_timestamp())""")
print("✓ 3 perfiles")

# ── 2. BUSINESSES (5) ──
spark.sql("""INSERT INTO workspace.innovalab.businesses (id, owner_user_id, name, business_type, created_at) VALUES
  ('biz_001', 'prof_001', 'Panadería La Esquina', 'panaderia', current_timestamp()),
  ('biz_002', 'prof_002', 'Tienda de Ropa ModAr', 'indumentaria', current_timestamp()),
  ('biz_003', 'prof_003', 'Café Central', 'cafeteria', current_timestamp()),
  ('biz_004', 'prof_001', 'Muebles a Medida', 'carpinteria', current_timestamp()),
  ('biz_005', 'prof_002', 'Cervecería Artesanal La Birra', 'cerveceria_artesanal', current_timestamp())""")
print("✓ 5 negocios")

# ── 3. PRODUCTS (20: 4+3+5+3+5) ──
spark.sql("""INSERT INTO workspace.innovalab.products (id, business_id, name, sku_or_slug, is_active, created_at, updated_at) VALUES
  ('prod_001','biz_001','Pan de mesa','PAN-MESA-01',true,current_timestamp(),current_timestamp()),
  ('prod_002','biz_001','Medialunas','MED-01',true,current_timestamp(),current_timestamp()),
  ('prod_003','biz_001','Facturas mixtas','FAC-MIX-01',true,current_timestamp(),current_timestamp()),
  ('prod_004','biz_001','Torta de chocolate','TORT-CHO-01',true,current_timestamp(),current_timestamp()),
  ('prod_005','biz_002','Remera básica','REM-BAS-01',true,current_timestamp(),current_timestamp()),
  ('prod_006','biz_002','Pantalón jean','JEAN-01',true,current_timestamp(),current_timestamp()),
  ('prod_007','biz_002','Camisa formal','CAM-FOR-01',true,current_timestamp(),current_timestamp()),
  ('prod_008','biz_003','Café latte','LAT-01',true,current_timestamp(),current_timestamp()),
  ('prod_009','biz_003','Capuchino','CAP-01',true,current_timestamp(),current_timestamp()),
  ('prod_010','biz_003','Croissant','CRO-01',true,current_timestamp(),current_timestamp()),
  ('prod_011','biz_003','Torta de frutas (porción)','TORT-FRU-01',true,current_timestamp(),current_timestamp()),
  ('prod_012','biz_003','Sándwich','SAND-01',true,current_timestamp(),current_timestamp()),
  ('prod_013','biz_004','Mesa de comedor','MESA-COM-01',true,current_timestamp(),current_timestamp()),
  ('prod_014','biz_004','Silla de madera','SILLA-01',true,current_timestamp(),current_timestamp()),
  ('prod_015','biz_004','Estante','EST-01',true,current_timestamp(),current_timestamp()),
  ('prod_016','biz_005','IPA','IPA-01',true,current_timestamp(),current_timestamp()),
  ('prod_017','biz_005','Lager','LAGER-01',true,current_timestamp(),current_timestamp()),
  ('prod_018','biz_005','Stout','STOUT-01',true,current_timestamp(),current_timestamp()),
  ('prod_019','biz_005','Porter','PORT-01',true,current_timestamp(),current_timestamp()),
  ('prod_020','biz_005','Honey','HONEY-01',true,current_timestamp(),current_timestamp())""")
print("✓ 20 productos (4+3+5+3+5)")

# ── 4. BUSINESS_COST_LINES (fijos + variables por negocio) ──
cost_lines = [
    # biz_001 Panadería - Fijos
    ('bcl_001','biz_001','Alquiler local','fixed','indirect',400000,'Alquiler mensual'),
    ('bcl_002','biz_001','Sueldos','fixed','indirect',2200000,'3 empleados'),
    ('bcl_003','biz_001','Servicios (luz, gas, agua)','fixed','indirect',220000,'Servicios públicos'),
    ('bcl_004','biz_001','Seguros','fixed','indirect',55000,'Seguro RC'),
    # biz_001 Panadería - Variables (costo por unidad de insumo)
    ('bcl_005','biz_001','Harina','variable','direct',850,'$/kg'),
    ('bcl_006','biz_001','Azúcar','variable','direct',650,'$/kg'),
    ('bcl_007','biz_001','Levadura','variable','direct',1200,'$/kg'),
    ('bcl_008','biz_001','Manteca','variable','direct',1800,'$/kg'),
    ('bcl_009','biz_001','Chocolate','variable','direct',3500,'$/kg'),
    ('bcl_010','biz_001','Packaging','variable','direct',120,'$/unidad'),
    ('bcl_011','biz_001','Energía (horno)','variable','direct',50,'$/hora'),
    # biz_002 ModAr - Fijos
    ('bcl_012','biz_002','Alquiler local','fixed','indirect',550000,'Alquiler mensual'),
    ('bcl_013','biz_002','Sueldos','fixed','indirect',1800000,'2 empleados'),
    ('bcl_014','biz_002','Servicios','fixed','indirect',180000,'Servicios públicos'),
    ('bcl_015','biz_002','Marketing','fixed','indirect',100000,'Marketing mensual'),
    # biz_002 ModAr - Variables
    ('bcl_016','biz_002','Tela','variable','direct',5000,'$/metro'),
    ('bcl_017','biz_002','Confección','variable','direct',1500,'$/unidad MO'),
    ('bcl_018','biz_002','Insumos (botones, hilos)','variable','direct',200,'$/unidad'),
    ('bcl_019','biz_002','Packaging','variable','direct',50,'$/unidad'),
    # biz_003 Café - Fijos
    ('bcl_020','biz_003','Alquiler local','fixed','indirect',600000,'Alquiler mensual'),
    ('bcl_021','biz_003','Sueldos','fixed','indirect',2500000,'4 empleados'),
    ('bcl_022','biz_003','Servicios','fixed','indirect',250000,'Servicios públicos'),
    ('bcl_023','biz_003','Amortización equipos','fixed','indirect',80000,'Amortización mensual'),
    # biz_003 Café - Variables
    ('bcl_024','biz_003','Café','variable','direct',500,'$/kg'),
    ('bcl_025','biz_003','Leche','variable','direct',200,'$/litro'),
    ('bcl_026','biz_003','Harina','variable','direct',850,'$/kg'),
    ('bcl_027','biz_003','Manteca','variable','direct',1800,'$/kg'),
    ('bcl_028','biz_003','Frutas','variable','direct',1500,'$/kg'),
    ('bcl_029','biz_003','Queso','variable','direct',1200,'$/kg'),
    ('bcl_030','biz_003','Jamón','variable','direct',1000,'$/kg'),
    ('bcl_031','biz_003','Vaso/envase','variable','direct',30,'$/unidad'),
    # biz_004 Muebles - Fijos
    ('bcl_032','biz_004','Alquiler taller','fixed','indirect',380000,'Alquiler mensual'),
    ('bcl_033','biz_004','Sueldos','fixed','indirect',1900000,'3 empleados'),
    ('bcl_034','biz_004','Servicios','fixed','indirect',150000,'Servicios públicos'),
    ('bcl_035','biz_004','Amortización herramientas','fixed','indirect',60000,'Amortización mensual'),
    # biz_004 Muebles - Variables
    ('bcl_036','biz_004','Madera','variable','direct',8000,'$/unidad'),
    ('bcl_037','biz_004','Barniz','variable','direct',800,'$/litro'),
    ('bcl_038','biz_004','Herrajes','variable','direct',600,'$/set'),
    ('bcl_039','biz_004','Energía','variable','direct',200,'$/hora'),
    # biz_005 Cervecería - Fijos
    ('bcl_040','biz_005','Alquiler galpón','fixed','indirect',700000,'Alquiler mensual'),
    ('bcl_041','biz_005','Sueldos','fixed','indirect',2800000,'4 empleados'),
    ('bcl_042','biz_005','Servicios','fixed','indirect',300000,'Servicios públicos'),
    ('bcl_043','biz_005','Amortización equipos','fixed','indirect',120000,'Amortización mensual'),
    # biz_005 Cervecería - Variables
    ('bcl_044','biz_005','Malta','variable','direct',600,'$/kg'),
    ('bcl_045','biz_005','Lúpulo','variable','direct',400,'$/kg'),
    ('bcl_046','biz_005','Levadura','variable','direct',200,'$/kg'),
    ('bcl_047','biz_005','Miel','variable','direct',800,'$/kg'),
    ('bcl_048','biz_005','Agua/Energía','variable','direct',100,'$/litro'),
    ('bcl_049','biz_005','Envase (botella + etiqueta)','variable','direct',120,'$/unidad'),
]

vals = ",\n  ".join([
    f"('{cl[0]}','{cl[1]}','{cl[2]}','{cl[3]}','{cl[4]}',{cl[5]},'{cl[6]}',current_timestamp(),current_timestamp())"
    for cl in cost_lines
])
spark.sql(f"""INSERT INTO workspace.innovalab.business_cost_lines
  (id, business_id, concept, behavior, traceability, amount_period, notes, created_at, updated_at) VALUES
  {vals}""")
n_fixed = sum(1 for c in cost_lines if c[3] == 'fixed')
n_var = sum(1 for c in cost_lines if c[3] == 'variable')
print(f"✓ {len(cost_lines)} líneas de costo ({n_fixed} fijos, {n_var} variables)")

# Mapeo (business_id, concept) → bcl_id
bcl_map = {(cl[1], cl[2]): cl[0] for cl in cost_lines}

# Metadatos de productos para generación de cálculos
products_meta = [
    {"id":"prod_001","biz":"biz_001","name":"Pan de mesa","unit":"kg","volume":2000,"alloc":0.30,
     "var":[("Harina",450),("Levadura",80),("Manteca",150),("Energía (horno)",50),("Packaging",20)],
     "price":2200,"margin":0.35},
    {"id":"prod_002","biz":"biz_001","name":"Medialunas","unit":"unidad","volume":5000,"alloc":0.25,
     "var":[("Harina",300),("Manteca",200),("Azúcar",80),("Energía (horno)",40),("Packaging",15)],
     "price":800,"margin":0.35},
    {"id":"prod_003","biz":"biz_001","name":"Facturas mixtas","unit":"docena","volume":1200,"alloc":0.25,
     "var":[("Harina",350),("Manteca",250),("Azúcar",100),("Energía (horno)",50),("Packaging",20)],
     "price":1800,"margin":0.35},
    {"id":"prod_004","biz":"biz_001","name":"Torta de chocolate","unit":"unidad","volume":300,"alloc":0.20,
     "var":[("Harina",400),("Manteca",300),("Chocolate",500),("Azúcar",150),("Energía (horno)",60),("Packaging",30)],
     "price":4500,"margin":0.40},
    {"id":"prod_005","biz":"biz_002","name":"Remera básica","unit":"unidad","volume":800,"alloc":0.40,
     "var":[("Tela",1200),("Confección",600),("Insumos (botones, hilos)",50),("Packaging",30)],
     "price":3500,"margin":0.30},
    {"id":"prod_006","biz":"biz_002","name":"Pantalón jean","unit":"unidad","volume":400,"alloc":0.35,
     "var":[("Tela",3500),("Confección",1000),("Insumos (botones, hilos)",150),("Packaging",50)],
     "price":8900,"margin":0.30},
    {"id":"prod_007","biz":"biz_002","name":"Camisa formal","unit":"unidad","volume":500,"alloc":0.25,
     "var":[("Tela",2800),("Confección",1200),("Insumos (botones, hilos)",80),("Packaging",40)],
     "price":7800,"margin":0.30},
    {"id":"prod_008","biz":"biz_003","name":"Café latte","unit":"unidad","volume":3000,"alloc":0.30,
     "var":[("Café",120),("Leche",80),("Vaso/envase",20)],
     "price":600,"margin":0.40},
    {"id":"prod_009","biz":"biz_003","name":"Capuchino","unit":"unidad","volume":2500,"alloc":0.25,
     "var":[("Café",100),("Leche",100),("Vaso/envase",20)],
     "price":650,"margin":0.40},
    {"id":"prod_010","biz":"biz_003","name":"Croissant","unit":"unidad","volume":2000,"alloc":0.15,
     "var":[("Harina",150),("Manteca",200),("Vaso/envase",30)],
     "price":900,"margin":0.40},
    {"id":"prod_011","biz":"biz_003","name":"Torta de frutas (porción)","unit":"porción","volume":1500,"alloc":0.15,
     "var":[("Frutas",400),("Harina",200),("Manteca",100),("Vaso/envase",50)],
     "price":1800,"margin":0.40},
    {"id":"prod_012","biz":"biz_003","name":"Sándwich","unit":"unidad","volume":1000,"alloc":0.15,
     "var":[("Harina",100),("Queso",150),("Jamón",150),("Vaso/envase",40)],
     "price":1200,"margin":0.40},
    {"id":"prod_013","biz":"biz_004","name":"Mesa de comedor","unit":"unidad","volume":80,"alloc":0.40,
     "var":[("Madera",8000),("Barniz",500),("Herrajes",800),("Energía",300)],
     "price":18000,"margin":0.25},
    {"id":"prod_014","biz":"biz_004","name":"Silla de madera","unit":"unidad","volume":200,"alloc":0.30,
     "var":[("Madera",3000),("Barniz",200),("Herrajes",200),("Energía",100)],
     "price":6500,"margin":0.25},
    {"id":"prod_015","biz":"biz_004","name":"Estante","unit":"unidad","volume":120,"alloc":0.30,
     "var":[("Madera",4500),("Barniz",300),("Herrajes",400),("Energía",150)],
     "price":9500,"margin":0.25},
    {"id":"prod_016","biz":"biz_005","name":"IPA","unit":"litro","volume":3000,"alloc":0.25,
     "var":[("Malta",400),("Lúpulo",300),("Levadura",150),("Agua/Energía",100),("Envase (botella + etiqueta)",80)],
     "price":2200,"margin":0.35},
    {"id":"prod_017","biz":"biz_005","name":"Lager","unit":"litro","volume":4000,"alloc":0.25,
     "var":[("Malta",350),("Lúpulo",200),("Levadura",100),("Agua/Energía",80),("Envase (botella + etiqueta)",80)],
     "price":1800,"margin":0.35},
    {"id":"prod_018","biz":"biz_005","name":"Stout","unit":"litro","volume":1500,"alloc":0.20,
     "var":[("Malta",450),("Lúpulo",250),("Levadura",150),("Agua/Energía",100),("Envase (botella + etiqueta)",80)],
     "price":2300,"margin":0.35},
    {"id":"prod_019","biz":"biz_005","name":"Porter","unit":"litro","volume":1200,"alloc":0.15,
     "var":[("Malta",420),("Lúpulo",280),("Levadura",150),("Agua/Energía",100),("Envase (botella + etiqueta)",80)],
     "price":2400,"margin":0.35},
    {"id":"prod_020","biz":"biz_005","name":"Honey","unit":"litro","volume":1000,"alloc":0.15,
     "var":[("Malta",380),("Lúpulo",220),("Levadura",120),("Miel",200),("Agua/Energía",80),("Envase (botella + etiqueta)",80)],
     "price":2500,"margin":0.35},
]

# Costos fijos por negocio (para prorratear en calc_cost_lines)
biz_fixed = {
    "biz_001": [("bcl_001","Alquiler local",400000),("bcl_002","Sueldos",2200000),("bcl_003","Servicios (luz, gas, agua)",220000),("bcl_004","Seguros",55000)],
    "biz_002": [("bcl_012","Alquiler local",550000),("bcl_013","Sueldos",1800000),("bcl_014","Servicios",180000),("bcl_015","Marketing",100000)],
    "biz_003": [("bcl_020","Alquiler local",600000),("bcl_021","Sueldos",2500000),("bcl_022","Servicios",250000),("bcl_023","Amortización equipos",80000)],
    "biz_004": [("bcl_032","Alquiler taller",380000),("bcl_033","Sueldos",1900000),("bcl_034","Servicios",150000),("bcl_035","Amortización herramientas",60000)],
    "biz_005": [("bcl_040","Alquiler galpón",700000),("bcl_041","Sueldos",2800000),("bcl_042","Servicios",300000),("bcl_043","Amortización equipos",120000)],
}

# Mapeo negocio → owner
biz_owner = {"biz_001":"prof_001","biz_002":"prof_002","biz_003":"prof_003","biz_004":"prof_001","biz_005":"prof_002"}

print("\nDatos base insertados correctamente.")

# COMMAND ----------

# DBTITLE 1,Insertar cálculos y configuración
# ============================================================
# CÁLCULOS: calculations, costing_setup, scenarios,
#           calc_cost_lines, pricing_inputs
# ============================================================

# ── 5. CALCULATIONS (2 por producto = 40) ──
calc_rows = []
for pm in products_meta:
    owner = biz_owner[pm["biz"]]
    for suffix in ["_A", "_B"]:
        calc_id = f"calc_{pm['id']}{suffix}"
        calc_rows.append(f"('{calc_id}','{owner}','{pm['biz']}','{pm['id']}','completed',1,current_timestamp(),current_timestamp())")

spark.sql("""INSERT INTO workspace.innovalab.calculations
  (id, user_id, business_id, product_id, status, schema_version, created_at, updated_at) VALUES
  """ + ",\n  ".join(calc_rows))
print(f"✓ {len(calc_rows)} cálculos (2 por producto)")

# ── 6. COSTING_SETUP (1 por cálculo) ──
cs_rows = []
for pm in products_meta:
    for suffix in ["_A", "_B"]:
        calc_id = f"calc_{pm['id']}{suffix}"
        cs_rows.append(f"('{calc_id}','ARS','mensual','{pm['unit']}',{pm['volume']},current_timestamp(),current_timestamp())")

spark.sql("""INSERT INTO workspace.innovalab.costing_setup
  (calculation_id, currency, costing_period, costing_unit, estimated_volume, created_at, updated_at) VALUES
  """ + ",\n  ".join(cs_rows))
print(f"✓ {len(cs_rows)} costing_setup")

# ── 7. SCENARIOS (1 base por cálculo) ──
scn_rows = []
for pm in products_meta:
    for suffix in ["_A", "_B"]:
        calc_id = f"calc_{pm['id']}{suffix}"
        scn_id = f"scn_{calc_id}"
        scn_rows.append(f"('{scn_id}','{calc_id}','Base',true,current_timestamp(),current_timestamp())")

spark.sql("""INSERT INTO workspace.innovalab.scenarios
  (id, calculation_id, name, is_base, created_at, updated_at) VALUES
  """ + ",\n  ".join(scn_rows))
print(f"✓ {len(scn_rows)} escenarios base")

# ── 8. CALC_COST_LINES (fijos prorrateados + variables por unidad) ──
ccl_rows = []
ccl_counter = 0
for pm in products_meta:
    for suffix in ["_A", "_B"]:
        calc_id = f"calc_{pm['id']}{suffix}"
        scn_id = f"scn_{calc_id}"

        # Costos fijos prorrateados
        for bcl_id, concept, amount in biz_fixed[pm["biz"]]:
            ccl_counter += 1
            ccl_id = f"ccl_{ccl_counter:04d}"
            alloc_amount = round(amount * pm["alloc"], 4)
            ccl_rows.append(
                f"('{ccl_id}','{calc_id}','{scn_id}','{bcl_id}','{concept}','fixed','indirect',{alloc_amount},NULL,NULL,{pm['alloc']},current_timestamp(),current_timestamp())"
            )

        # Costos variables por unidad
        for concept, var_amount in pm["var"]:
            ccl_counter += 1
            ccl_id = f"ccl_{ccl_counter:04d}"
            source_bcl = bcl_map.get((pm["biz"], concept))
            ccl_rows.append(
                f"('{ccl_id}','{calc_id}','{scn_id}','{source_bcl}','{concept}','variable','direct',{var_amount},NULL,NULL,NULL,current_timestamp(),current_timestamp())"
            )

spark.sql("""INSERT INTO workspace.innovalab.calc_cost_lines
  (id, calculation_id, scenario_id, source_business_cost_id, concept, behavior, traceability, amount, hours, hourly_rate, allocation_pct, created_at, updated_at) VALUES
  """ + ",\n  ".join(ccl_rows))
print(f"✓ {len(ccl_rows)} calc_cost_lines")

# ── 9. PRICING_INPUTS (1 por cálculo) ──
pi_rows = []
for pm in products_meta:
    # Calc A: precio manual
    calc_a = f"calc_{pm['id']}_A"
    pi_rows.append(f"('{calc_a}','manual',0,{pm['price']},current_timestamp(),current_timestamp())")
    # Calc B: margen esperado
    calc_b = f"calc_{pm['id']}_B"
    pi_rows.append(f"('{calc_b}','markup_on_cost',{pm['margin']},NULL,current_timestamp(),current_timestamp())")

spark.sql("""INSERT INTO workspace.innovalab.pricing_inputs
  (calculation_id, margin_convention, expected_margin_pct, manual_price, created_at, updated_at) VALUES
  """ + ",\n  ".join(pi_rows))
print(f"✓ {len(pi_rows)} pricing_inputs")

print(f"\nTotal registros de cálculo: {len(calc_rows) + len(cs_rows) + len(scn_rows) + len(ccl_rows) + len(pi_rows)}")