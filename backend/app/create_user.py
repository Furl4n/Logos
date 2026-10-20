"""Criação administrativa de usuários; não expõe cadastro público."""

import argparse
from getpass import getpass

from psycopg.errors import UniqueViolation
from pydantic import BaseModel, Field, ValidationError

from app.core.database import connect_database
from app.core.security import password_hasher
from app.models.user import UserRole
from app.repositories.users import create_user
from app.schemas.auth import NormalizedEmail


class NewUser(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    email: NormalizedEmail
    role: UserRole


def main() -> None:
    parser = argparse.ArgumentParser(description="Cria um usuário no banco configurado.")
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--role", required=True, choices=list(UserRole))
    args = parser.parse_args()
    try:
        data = NewUser(name=args.name.strip(), email=args.email, role=args.role)
    except ValidationError:
        parser.error("Confira nome (1–150 caracteres), e-mail e perfil.")
    password = getpass("Senha (mínimo 8 caracteres): ")
    if len(password) < 8:
        parser.error("Use uma senha com pelo menos 8 caracteres.")
    if password != getpass("Confirme a senha: "):
        parser.error("As senhas não coincidem.")
    try:
        with connect_database() as connection:
            user = create_user(
                connection, data.name, str(data.email), data.role,
                password_hasher.hash(password),
            )
    except UniqueViolation:
        parser.error("Já existe um usuário com esse e-mail.")
    print(f"Usuário criado: {user.id} ({user.role.value}).")


if __name__ == "__main__":
    main()
