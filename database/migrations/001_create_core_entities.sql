-- Logos: entidades centrais do MVP.
-- Banco-alvo: PostgreSQL 14+.
-- Esta migration cria os usuários, incidentes e o histórico geral de alterações.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('DRIVER', 'ANALYST');
CREATE TYPE incident_category AS ENUM (
    'VEHICLE_ACCIDENT',
    'INJURY_ACCIDENT',
    'UNUSUAL_WEATHER',
    'MECHANICAL_ISSUE',
    'ROAD_BLOCK'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    category incident_category NOT NULL,
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
    CONSTRAINT incidents_severity_check
        CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
    CONSTRAINT incidents_status_check CHECK (
        status IN ('OPEN', 'UNDER_INVESTIGATION', 'CLOSED', 'INCONCLUSIVE')
    ),
    CONSTRAINT incidents_version_check CHECK (version >= 1)
);

CREATE TABLE incident_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    change_type VARCHAR(20) NOT NULL,
    previous_value VARCHAR(30) NOT NULL,
    new_value VARCHAR(30) NOT NULL,
    changed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    incident_version INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT incident_history_change_type_check
        CHECK (change_type IN ('STATUS', 'SEVERITY')),
    CONSTRAINT incident_history_value_changed_check
        CHECK (previous_value <> new_value),
    CONSTRAINT incident_history_values_match_change_type_check CHECK (
        (change_type = 'STATUS' AND previous_value IN ('OPEN', 'UNDER_INVESTIGATION', 'CLOSED', 'INCONCLUSIVE') AND new_value IN ('OPEN', 'UNDER_INVESTIGATION', 'CLOSED', 'INCONCLUSIVE'))
        OR
        (change_type = 'SEVERITY' AND previous_value IN ('HIGH', 'MEDIUM', 'LOW') AND new_value IN ('HIGH', 'MEDIUM', 'LOW'))
    ),
    CONSTRAINT incident_history_version_check CHECK (incident_version >= 2)
);

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

-- changed_by_user_id deve referenciar um ANALYST; essa autorização é garantida
-- pela camada de aplicação, junto da atualização condicional por version.
