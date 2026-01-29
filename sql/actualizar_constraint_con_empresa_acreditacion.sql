-- 🚨 SCRIPT URGENTE: Actualizar constraint UNIQUE para incluir empresa_acreditacion
-- Este script permite duplicar requerimientos de categoría "Empresa" con diferentes empresas_acreditacion
-- Ejecuta TODO el script en Supabase SQL Editor

-- PASO 1: Verificar índices existentes antes de eliminar
SELECT
  indexname as nombre_indice_actual,
  indexdef as definicion_actual
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND indexname LIKE 'uq_proyecto%';

-- PASO 2: Eliminar TODOS los índices únicos antiguos relacionados
DO $$
BEGIN
  -- Eliminar índice único antiguo (puede tener diferentes nombres)
  DROP INDEX IF EXISTS uq_proyecto_requerimiento_trabajador;
  DROP INDEX IF EXISTS uq_proyecto_requerimiento;
  DROP INDEX IF EXISTS brg_acreditacion_solicitud_requerimiento_uq_proyecto_requerimiento_trabajador_idx;
  
  RAISE NOTICE '✅ Índices antiguos eliminados';
END $$;

-- PASO 3: Verificar que la columna empresa_acreditacion existe en brg_acreditacion_solicitud_requerimiento
-- NOTA: empresa_acreditacion existe en brg_acreditacion_cliente_requerimiento, pero necesitamos agregarla
-- también a brg_acreditacion_solicitud_requerimiento para guardar si es MyMA o el contratista en cada requerimiento del proyecto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'brg_acreditacion_solicitud_requerimiento' 
      AND column_name = 'empresa_acreditacion'
  ) THEN
    ALTER TABLE brg_acreditacion_solicitud_requerimiento 
    ADD COLUMN empresa_acreditacion TEXT;
    
    RAISE NOTICE '✅ Columna empresa_acreditacion creada en brg_acreditacion_solicitud_requerimiento';
  ELSE
    RAISE NOTICE '✅ Columna empresa_acreditacion ya existe en brg_acreditacion_solicitud_requerimiento';
  END IF;
END $$;

-- PASO 4: Crear nuevo índice único que incluye empresa_acreditacion
-- Esto permite:
-- ✅ Mismo requerimiento para diferentes trabajadores
-- ✅ Mismo requerimiento con diferentes empresa_acreditacion (MyMA vs Contratista)
-- ❌ Mismo requerimiento, mismo trabajador, misma empresa_acreditacion (duplicado bloqueado)
CREATE UNIQUE INDEX IF NOT EXISTS uq_proyecto_requerimiento_trabajador_empresa 
ON brg_acreditacion_solicitud_requerimiento (
  codigo_proyecto, 
  requerimiento, 
  COALESCE(id_proyecto_trabajador, -1),
  COALESCE(empresa_acreditacion, '')
);

-- PASO 5: Verificar el nuevo constraint
SELECT
  indexname as nombre_constraint,
  indexdef as definicion
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND indexname LIKE 'uq_proyecto%';

-- ✅ Resultado esperado:
-- El constraint ahora incluye COALESCE(empresa_acreditacion, '')
-- 
-- Esto permite:
-- ✅ ("150", "MALEG", -1, "MyMA")
-- ✅ ("150", "MALEG", -1, "AGQ")
-- ✅ ("150", "MALEG", trabajador_1, "MyMA")
-- ✅ ("150", "MALEG", trabajador_1, "AGQ")
-- ❌ ("150", "MALEG", -1, "MyMA") - duplicado bloqueado

