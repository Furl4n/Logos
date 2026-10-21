from collections.abc import Iterator

import psycopg
from psycopg.rows import dict_row

from app.core.config import get_settings


def connect_database(*, direct: bool = False) -> psycopg.Connection:
    settings = get_settings()
    url = (settings.database_url_unpooled if direct else None) or settings.database_url
    if url is None or not url.get_secret_value().strip():
        raise ValueError("Configure DATABASE_URL no backend/.env.")

    return psycopg.connect(
        url.get_secret_value(),
        connect_timeout=5,
        row_factory=dict_row,
    )


def get_database() -> Iterator[psycopg.Connection]:
    """Uma conexão e transação por requisição, com rollback em caso de erro."""
    with connect_database() as connection:
        yield connection
