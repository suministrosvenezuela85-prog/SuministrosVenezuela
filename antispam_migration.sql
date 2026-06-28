-- =========================================================================
-- MIGRACIÓN ANTI-SPAM: SUMINISTROS SOS 🇻🇪
-- Ejecutar en el SQL Editor de Supabase DESPUÉS del setup.sql inicial.
-- Este script es INCREMENTAL — no destruye datos existentes.
-- =========================================================================

-- 1. NUEVAS COLUMNAS EN TABLAS EXISTENTES

-- Rastrear quién creó cada centro (fingerprint del dispositivo)
ALTER TABLE centros_acopio ADD COLUMN IF NOT EXISTS reportado_por_fingerprint TEXT NULL;
-- ¿El creador estaba autenticado?
ALTER TABLE centros_acopio ADD COLUMN IF NOT EXISTS reportado_autenticado BOOLEAN DEFAULT false;
-- ¿El GPS del creador coincidía con la ubicación del centro?
ALTER TABLE centros_acopio ADD COLUMN IF NOT EXISTS gps_verificado BOOLEAN DEFAULT false;
-- Teléfono del coordinador para botón de colaborar
ALTER TABLE centros_acopio ADD COLUMN IF NOT EXISTS telefono_contacto TEXT NULL;
-- Mensaje de alerta del coordinador
ALTER TABLE centros_acopio ADD COLUMN IF NOT EXISTS mensaje_alerta TEXT NULL;

-- Rastrear quién creó cada necesidad
ALTER TABLE necesidades ADD COLUMN IF NOT EXISTS reportado_por_fingerprint TEXT NULL;
ALTER TABLE necesidades ADD COLUMN IF NOT EXISTS reportado_autenticado BOOLEAN DEFAULT false;
ALTER TABLE necesidades ADD COLUMN IF NOT EXISTS telefono_contacto TEXT NULL;
ALTER TABLE necesidades ADD COLUMN IF NOT EXISTS colaboradores_telefonos TEXT NULL;

-- 2. TABLA: log_moderacion (Auditoría de acciones admin)
CREATE TABLE IF NOT EXISTS log_moderacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NULL,
    admin_email TEXT NULL,
    accion TEXT NOT NULL,
    entidad_tipo TEXT NOT NULL CHECK (entidad_tipo IN ('centro', 'necesidad')),
    entidad_id UUID NOT NULL,
    entidad_nombre TEXT NULL,
    detalles TEXT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABLA: reputacion_dispositivo
CREATE TABLE IF NOT EXISTS reputacion_dispositivo (
    fingerprint TEXT PRIMARY KEY,
    puntaje INTEGER NOT NULL DEFAULT 0,
    total_reportes INTEGER NOT NULL DEFAULT 0,
    reportes_eliminados INTEGER NOT NULL DEFAULT 0,
    ultimo_reporte TIMESTAMPTZ NULL,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_log_moderacion_creado ON log_moderacion(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_reputacion_fingerprint ON reputacion_dispositivo(fingerprint);

-- 5. RLS
ALTER TABLE log_moderacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputacion_dispositivo ENABLE ROW LEVEL SECURITY;

-- Políticas: log_moderacion
DROP POLICY IF EXISTS "Lectura de logs solo para admins" ON log_moderacion;
CREATE POLICY "Lectura de logs solo para admins" ON log_moderacion
    FOR SELECT TO authenticated
    USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'administrador_verificado');

DROP POLICY IF EXISTS "Inserción de logs para admins" ON log_moderacion;
CREATE POLICY "Inserción de logs para admins" ON log_moderacion
    FOR INSERT TO authenticated
    WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'administrador_verificado');

-- Políticas: reputacion_dispositivo
DROP POLICY IF EXISTS "Lectura pública de reputación" ON reputacion_dispositivo;
CREATE POLICY "Lectura pública de reputación" ON reputacion_dispositivo
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Inserción pública de reputación" ON reputacion_dispositivo;
CREATE POLICY "Inserción pública de reputación" ON reputacion_dispositivo
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Actualización pública de reputación" ON reputacion_dispositivo;
CREATE POLICY "Actualización pública de reputación" ON reputacion_dispositivo
    FOR UPDATE USING (true);

-- 6. ACTUALIZACIÓN DE DATOS DE PRUEBA (Opcional)
-- Asigna un teléfono de prueba a los centros existentes para validar el botón "Colaborar" inmediatamente.
UPDATE centros_acopio
SET telefono_contacto = '04121234567'
WHERE telefono_contacto IS NULL;

-- 8. TABLA: personas_desaparecidas
CREATE TABLE IF NOT EXISTS personas_desaparecidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo TEXT NOT NULL,
    edad INTEGER NULL,
    descripcion_fisica TEXT NULL,
    ultima_ubicacion TEXT NOT NULL,
    contacto_familiar TEXT NOT NULL,
    foto_base64 TEXT NULL, -- Foto en base64 comprimida (< 150KB)
    estatus TEXT DEFAULT 'busqueda' CHECK (estatus IN ('busqueda', 'encontrado')),
    creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reportado_por_fingerprint TEXT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE personas_desaparecidas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Lectura pública de desaparecidos" ON personas_desaparecidas
    FOR SELECT USING (true);

CREATE POLICY "Inserción pública de desaparecidos" ON personas_desaparecidas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Actualización para dueños o admins de desaparecidos" ON personas_desaparecidas
    FOR UPDATE USING (
        auth.uid() = creado_por 
        OR reportado_por_fingerprint = CURRENT_SETTING('request.headers', true)::json->>'x-fingerprint'
        OR EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND (raw_user_meta_data->>'is_admin')::boolean = true
        )
    );

CREATE POLICY "Eliminación para dueños o admins de desaparecidos" ON personas_desaparecidas
    FOR DELETE USING (
        auth.uid() = creado_por
        OR EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND (raw_user_meta_data->>'is_admin')::boolean = true
        )
    );

-- 7. FORZAR RECARGA DEL CACHÉ DE ESQUEMAS EN SUPABASE (PostgREST)
-- Esto soluciona de inmediato el error: "Could not find column ... in the schema cache"
NOTIFY pgrst, 'reload schema';
