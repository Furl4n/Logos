-- A migration inicial já foi aplicada; preserva os dados existentes.
CREATE SEQUENCE incident_code_sequence;

CREATE FUNCTION next_incident_code() RETURNS TEXT
LANGUAGE SQL VOLATILE AS $$
    SELECT 'INC-' || CASE WHEN length(value) < 4 THEN lpad(value, 4, '0') ELSE value END
    FROM (SELECT nextval('incident_code_sequence')::text AS value) sequence_value;
$$;

ALTER TABLE incidents
    ADD COLUMN code TEXT NOT NULL DEFAULT next_incident_code(),
    ADD CONSTRAINT incidents_code_unique UNIQUE (code);

ALTER TABLE incident_history
    DROP CONSTRAINT incident_history_change_type_check,
    DROP CONSTRAINT incident_history_values_match_change_type_check,
    DROP CONSTRAINT incident_history_version_check;

ALTER TABLE incident_history
    ADD CONSTRAINT incident_history_change_type_check CHECK (
        change_type IN ('CREATED', 'STATUS', 'SEVERITY', 'ASSIGNEE', 'OBSERVATION', 'REOPEN')
    ),
    ADD CONSTRAINT incident_history_version_check CHECK (
        (change_type = 'CREATED' AND incident_version = 1)
        OR (change_type <> 'CREATED' AND incident_version >= 2)
    ),
    ADD CONSTRAINT incident_history_values_match_change_type_check CHECK (
        (
            change_type = 'CREATED'
            AND previous_value IS NULL AND new_value IS NULL
            AND previous_analyst_id IS NULL AND new_analyst_id IS NULL
            AND observation IS NULL
        )
        OR
        (
            change_type IN ('STATUS', 'SEVERITY', 'REOPEN')
            AND previous_value IS NOT NULL AND new_value IS NOT NULL
            AND previous_value <> new_value
            AND previous_analyst_id IS NULL AND new_analyst_id IS NULL
            AND (
                (change_type = 'STATUS' AND previous_value IN ('OPEN', 'UNDER_INVESTIGATION') AND new_value IN ('OPEN', 'UNDER_INVESTIGATION', 'CLOSED', 'INCONCLUSIVE') AND observation IS NULL)
                OR
                (change_type = 'SEVERITY' AND previous_value IN ('HIGH', 'MEDIUM', 'LOW') AND new_value IN ('HIGH', 'MEDIUM', 'LOW') AND observation IS NULL)
                OR
                (change_type = 'REOPEN' AND previous_value IN ('CLOSED', 'INCONCLUSIVE') AND new_value = 'OPEN' AND observation IS NOT NULL AND btrim(observation) <> '')
            )
        )
        OR
        (
            change_type = 'ASSIGNEE'
            AND previous_value IS NULL AND new_value IS NULL AND observation IS NULL
            AND new_analyst_id IS NOT NULL
            AND previous_analyst_id IS DISTINCT FROM new_analyst_id
        )
        OR
        (
            change_type = 'OBSERVATION'
            AND previous_value IS NULL AND new_value IS NULL
            AND previous_analyst_id IS NULL AND new_analyst_id IS NULL
            AND observation IS NOT NULL AND btrim(observation) <> ''
        )
    );

-- Sem backfill de autoria: não é possível inferir quem criou incidentes antigos.
-- A aplicação grava CREATED na mesma transação dos novos incidentes.
