-- Login e atualização por UUID já usam índices UNIQUE/PRIMARY KEY existentes.
-- Histórico: localização dos eventos e ordem usada na linha do tempo.
CREATE INDEX incident_history_incident_version_idx
    ON incident_history (incident_id, incident_version DESC, id);

-- Escopo do motorista e consultas/transferências por responsável.
CREATE INDEX incidents_driver_idx ON incidents (driver_id);
CREATE INDEX incidents_analyst_idx ON incidents (analyst_id);

-- Fila padrão: somente ativos, maior criticidade antes dos mais recentes.
CREATE INDEX incidents_active_priority_idx ON incidents (
    (CASE severity WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END),
    occurred_at DESC, id
) WHERE status IN ('OPEN', 'UNDER_INVESTIGATION');

CREATE INDEX incidents_category_status_idx ON incidents (category, status);

-- Busca parcial ILIKE: B-tree comum não atende padrões como '%freio%'.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX incidents_search_idx ON incidents USING gin (
    title gin_trgm_ops, code gin_trgm_ops,
    truck_plate gin_trgm_ops, location gin_trgm_ops
);
CREATE INDEX users_search_idx ON users USING gin (name gin_trgm_ops, email gin_trgm_ops);

CREATE INDEX users_status_name_idx ON users (is_active, name, id);
CREATE INDEX users_active_role_name_idx ON users (role, name, id) WHERE is_active;
