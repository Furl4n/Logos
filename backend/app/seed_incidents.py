"""Dados opcionais de desenvolvimento para exercitar a fila e a paginação."""

import argparse
from datetime import datetime, timedelta, timezone

from pydantic import TypeAdapter, ValidationError

from app.core.database import connect_database
from app.models.incident import IncidentCategory, IncidentSeverity
from app.models.user import UserRole
from app.repositories.users import find_by_email
from app.schemas.auth import NormalizedEmail

PREFIX = "[Exemplo local]"


def main() -> None:
    parser = argparse.ArgumentParser(description="Adiciona incidentes locais de exemplo.")
    parser.add_argument("--driver-email", required=True)
    parser.add_argument("--count", type=int, default=120)
    args = parser.parse_args()
    if not 1 <= args.count <= 1000:
        parser.error("Informe uma quantidade entre 1 e 1000.")
    try:
        email = TypeAdapter(NormalizedEmail).validate_python(args.driver_email)
    except ValidationError:
        parser.error("Informe um e-mail válido.")

    with connect_database() as connection:
        connection.execute("SELECT pg_advisory_xact_lock(20261020)")
        driver = find_by_email(connection, str(email))
        if driver is None or driver.role != UserRole.DRIVER:
            parser.error("Crie primeiro um usuário DRIVER com esse e-mail.")
        existing = connection.execute(
            "SELECT id FROM incidents WHERE driver_id = %s AND title LIKE %s LIMIT 1",
            (driver.id, f"{PREFIX}%"),
        ).fetchone()
        if existing:
            print("Esse motorista já possui exemplos locais; nenhum registro foi alterado.")
            return

        categories = list(IncidentCategory)
        severities = list(IncidentSeverity)
        now = datetime.now(timezone.utc)
        for index in range(args.count):
            row = connection.execute(
                """INSERT INTO incidents (
                    title, description, category, severity, driver_id,
                    truck_plate, location, route_code, occurred_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, reported_at""",
                (f"{PREFIX} Ocorrência {index + 1}",
                 "Dados fictícios para desenvolvimento e apresentação.",
                 categories[index % len(categories)].value,
                 severities[index % len(severities)].value, driver.id,
                 f"DEV-{index % 10:04d}", "BR-116 · Curitiba, PR",
                 f"LOCAL-{index + 1:03d}", now - timedelta(minutes=(index + 1) * 5)),
            ).fetchone()
            connection.execute(
                """INSERT INTO incident_history (
                    incident_id, change_type, changed_by_user_id, incident_version, created_at
                ) VALUES (%s, 'CREATED', %s, 1, %s)""",
                (row["id"], driver.id, row["reported_at"]),
            )
    print(f"Criados {args.count} incidentes fictícios para {email}.")


if __name__ == "__main__":
    main()
