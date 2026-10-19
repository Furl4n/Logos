-- Logos: entidades centrais do MVP.
-- Banco-alvo: PostgreSQL 14+.
-- Esta migration cria os usuários, incidentes e o histórico de mudanças de status.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_role_check
        CHECK (role IN ('DRIVER', 'ANALYST'))
);

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(30) NOT NULL,
    severity VARCHAR(10) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    truck_plate VARCHAR(10) NOT NULL,
    location TEXT NOT NULL,
    route_code VARCHAR(50),

    occurred_at TIMESTAMPTZ NOT NULL,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT incidents_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT incidents_description_not_blank CHECK (btrim(description) <> ''),
    CONSTRAINT incidents_location_not_blank CHECK (btrim(location) <> ''),
    CONSTRAINT incidents_category_check CHECK (
        category IN (
            'VEHICLE_ACCIDENT',
            'INJURY_ACCIDENT',
            'UNUSUAL_WEATHER',
            'MECHANICAL_ISSUE',
            'ROAD_BLOCK'
        )
    ),
    CONSTRAINT incidents_severity_check
        CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
    CONSTRAINT incidents_status_check CHECK (
        status IN ('OPEN', 'UNDER_INVESTIGATION', 'CLOSED', 'INCONCLUSIVE')
    ),
    CONSTRAINT incidents_version_check CHECK (version >= 1)
);

CREATE TABLE incident_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    previous_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    changed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    incident_version INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT incident_status_history_previous_status_check CHECK (
        previous_status IN ('OPEN', 'UNDER_INVESTIGATION', 'CLOSED', 'INCONCLUSIVE')
    ),
    CONSTRAINT incident_status_history_new_status_check CHECK (
        new_status IN ('OPEN', 'UNDER_INVESTIGATION', 'CLOSED', 'INCONCLUSIVE')
    ),
    CONSTRAINT incident_status_history_status_changed_check
        CHECK (previous_status <> new_status),
    CONSTRAINT incident_status_history_version_check CHECK (incident_version >= 2)
);

CREATE INDEX incidents_driver_id_occurred_at_idx
    ON incidents (driver_id, occurred_at DESC);

CREATE INDEX incidents_category_severity_idx
    ON incidents (category, severity);

CREATE INDEX incidents_status_idx
    ON incidents (status);

CREATE INDEX incident_status_history_incident_id_created_at_idx
    ON incident_status_history (incident_id, created_at DESC);

-- Mantém updated_at correto, inclusive quando uma atualização é feita fora da API.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER incidents_set_updated_at
BEFORE UPDATE ON incidents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A autorização de que changed_by_user_id seja um ANALYST será garantida na
-- camada de aplicação, junto da atualização condicional por version.
