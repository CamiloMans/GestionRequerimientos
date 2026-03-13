-- Fuerza cargo JPRO para registros de categoria_empresa Contratista.
-- Ejecutar una sola vez en Supabase SQL Editor.

BEGIN;

UPDATE brg_acreditacion_solicitud_requerimiento
SET
  responsable = 'JPRO',
  updated_at = NOW()
WHERE
  lower(trim(coalesce(categoria_empresa, ''))) = 'contratista'
  AND coalesce(responsable, '') <> 'JPRO';

COMMIT;

-- Verificacion (debe devolver 0):
SELECT COUNT(*) AS contratista_no_jpro
FROM brg_acreditacion_solicitud_requerimiento
WHERE
  lower(trim(coalesce(categoria_empresa, ''))) = 'contratista'
  AND coalesce(responsable, '') <> 'JPRO';
