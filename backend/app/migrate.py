"""Aplica os arquivos SQL de database/migrations em uma transação."""

import hashlib
import sys

import psycopg

from app.core.config import BACKEND_DIR
from app.core.database import connect_database

MIGRATIONS_DIR = BACKEND_DIR.parent / "database" / "migrations"


def migrate() -> list[str]:
    files = sorted(MIGRATIONS_DIR.glob("[0-9]*_*.sql"))
    if not files:
        raise ValueError("Nenhuma migration encontrada em database/migrations.")

    applied = []
    with connect_database() as connection:
        # Serializa execuções simultâneas até o commit ou rollback.
        connection.execute("SELECT pg_advisory_xact_lock(20261019)")
        connection.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename TEXT PRIMARY KEY,
                checksum TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        existing = {
            row["filename"]: row["checksum"]
            for row in connection.execute(
                "SELECT filename, checksum FROM schema_migrations ORDER BY filename"
            )
        }
        if set(existing) - {file.name for file in files}:
            raise ValueError("Há migrations aplicadas que não estão no repositório.")

        for file in files:
            content = file.read_bytes()
            checksum = hashlib.sha256(content).hexdigest()
            if file.name in existing:
                if existing[file.name] != checksum:
                    raise ValueError(f"Migration já aplicada foi alterada: {file.name}.")
                continue
            if existing and file.name < max(existing):
                raise ValueError(f"Migration fora de ordem: {file.name}.")

            connection.execute(content.decode("utf-8"), prepare=False)
            connection.execute(
                "INSERT INTO schema_migrations (filename, checksum) VALUES (%s, %s)",
                (file.name, checksum),
            )
            applied.append(file.name)

    return applied


def main() -> None:
    try:
        applied = migrate()
    except ValueError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except psycopg.Error:
        print(
            "Falha ao aplicar migrations. Confira DATABASE_URL, disponibilidade "
            "do PostgreSQL e os arquivos SQL. A transação foi revertida.",
            file=sys.stderr,
        )
        sys.exit(1)

    for filename in applied:
        print(f"Aplicada: {filename}")
    if not applied:
        print("Banco atualizado; nenhuma migration pendente.")


if __name__ == "__main__":
    main()
