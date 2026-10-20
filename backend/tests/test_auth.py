import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

import jwt
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.database import connect_database, get_database
from app.core.dependencies import require_analyst
from app.core.errors import APIError
from app.core.security import password_hasher
from app.main import app
from app.models.user import UserRole
from app.repositories.users import create_user


class AuthTests(unittest.TestCase):
    """Integração HTTP/PostgreSQL; todos os dados são revertidos ao final."""

    @classmethod
    def setUpClass(cls):
        cls.password_hash = password_hasher.hash(" senha de teste ")

    def setUp(self):
        self.env = patch.dict(os.environ, {"JWT_SECRET_KEY": "test-only-key-" * 5, "COOKIE_SECURE": "false"})
        self.env.start()
        get_settings.cache_clear()
        self.connection = connect_database()
        self.users = {}
        for role in UserRole:
            self.users[role] = create_user(
                self.connection, "Usuário de teste", f"{uuid4()}@example.com",
                role, self.password_hash,
            )

        def database_override():
            yield self.connection

        app.dependency_overrides[get_database] = database_override
        self.client = TestClient(app, headers={"X-CSRF-Protection": "1"})

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.connection.rollback()
        self.connection.close()
        self.env.stop()
        get_settings.cache_clear()

    def login(self, role=UserRole.ANALYST, **overrides):
        payload = {"email": self.users[role].email, "password": " senha de teste "}
        return self.client.post("/api/v1/auth/login", json={**payload, **overrides})

    def signed_token(self, **overrides):
        now = datetime.now(timezone.utc)
        return jwt.encode(
            {"sub": str(self.users[UserRole.ANALYST].id), "iat": now,
             "exp": now + timedelta(hours=1), **overrides},
            get_settings().jwt_secret_key.get_secret_value(), algorithm="HS256",
        )

    def test_login_and_me_for_both_roles(self):
        for role in UserRole:
            with self.subTest(role=role):
                response = self.login(role)
                self.assertEqual(response.status_code, 200)
                body = response.json()
                self.assertNotIn("accessToken", body)
                self.assertNotIn("tokenType", body)
                cookie = response.headers["set-cookie"]
                self.assertIn("HttpOnly", cookie)
                self.assertIn("SameSite=lax", cookie)
                self.assertIn("Path=/api/v1", cookie)
                self.assertEqual(body["expiresIn"], 3600)
                self.assertEqual(set(body["user"]), {"id", "name", "email", "role"})
                self.assertEqual(body["user"]["role"], role.value)
                me = self.client.get("/api/v1/auth/me")
                self.assertEqual(me.status_code, 200)
                self.assertEqual(me.json(), body["user"])

    def test_email_is_trimmed_and_case_insensitive(self):
        self.assertEqual(self.login(
            email=f"  {self.users[UserRole.ANALYST].email.upper()}  "
        ).status_code, 200)

    def test_unknown_email_and_wrong_password_have_same_error(self):
        wrong = self.login(password="incorreta")
        unknown = self.login(email=f"{uuid4()}@example.com")
        self.assertEqual(wrong.status_code, 401)
        self.assertEqual(unknown.status_code, 401)
        self.assertEqual(wrong.json(), unknown.json())
        self.assertEqual(wrong.json()["code"], "INVALID_CREDENTIALS")

    def test_password_is_not_trimmed(self):
        self.assertEqual(self.login(password="senha de teste").status_code, 401)

    def test_invalid_request_bodies(self):
        for changes in ({"email": "invalido"}, {"password": ""},
                        {"role": "ANALYST"}, {"password": 123}):
            with self.subTest(changes=changes):
                result = self.client.post("/api/v1/auth/login", json={
                    "email": self.users[UserRole.ANALYST].email,
                    "password": " senha de teste ", **changes,
                })
                self.assertEqual(result.status_code, 422)
                self.assertEqual(result.json()["code"], "VALIDATION_ERROR")
                self.assertNotIn(" senha de teste ", result.text)

    def test_malformed_json(self):
        result = self.client.post("/api/v1/auth/login", content="{",
                                  headers={"Content-Type": "application/json"})
        self.assertEqual(result.status_code, 400)
        self.assertEqual(result.json()["code"], "INVALID_JSON")

    def test_missing_or_invalid_authorization(self):
        for value in (None, "Basic abc", "Bearer invalid", "Bearer"):
            with self.subTest(value=value):
                headers = {"Authorization": value} if value else {}
                result = self.client.get("/api/v1/auth/me", headers=headers)
                self.assertEqual(result.status_code, 401)
                self.assertEqual(result.json()["code"], "UNAUTHENTICATED")

    def test_expired_forged_or_invalid_subject_tokens(self):
        tokens = [
            self.signed_token(exp=datetime.now(timezone.utc) - timedelta(seconds=1)),
            self.signed_token(sub="not-a-uuid"),
            self.signed_token(sub=str(uuid4())),
            jwt.encode({"sub": str(uuid4())}, "wrong-key-" * 6, algorithm="HS256"),
            jwt.encode({"sub": str(uuid4())}, "", algorithm="none"),
        ]
        for token in tokens:
            with self.subTest(token_type=token[:10]):
                result = self.client.get("/api/v1/auth/me", headers={
                    "Authorization": f"Bearer {token}"
                })
                self.assertEqual(result.status_code, 401)
                self.assertEqual(result.json()["code"], "UNAUTHENTICATED")

    def test_profile_is_read_from_database(self):
        self.login()
        self.connection.execute("UPDATE users SET role = 'DRIVER' WHERE id = %s",
                                (self.users[UserRole.ANALYST].id,))
        result = self.client.get("/api/v1/auth/me")
        self.assertEqual(result.json()["role"], "DRIVER")

    def test_analyst_permission(self):
        self.assertEqual(require_analyst(self.users[UserRole.ANALYST]).role,
                         UserRole.ANALYST)
        with self.assertRaises(APIError) as caught:
            require_analyst(self.users[UserRole.DRIVER])
        self.assertEqual(caught.exception.status, 403)

    def test_logout_removes_cookie(self):
        self.login()
        result = self.client.post("/api/v1/auth/logout")
        self.assertEqual(result.status_code, 204)
        self.assertEqual(self.client.get("/api/v1/auth/me").status_code, 401)

    def test_csrf_and_origin_are_required(self):
        self.login()
        for headers in ({"X-CSRF-Protection": ""},
                        {"Origin": "https://attacker.example"}):
            result = self.client.post("/api/v1/auth/logout", headers=headers)
            self.assertEqual(result.status_code, 403)
            self.assertEqual(result.json()["code"], "CSRF_REJECTED")
        self.assertEqual(self.client.get("/api/v1/auth/me").status_code, 200)

    def test_secure_cookie_in_production(self):
        with patch.dict(os.environ, {"COOKIE_SECURE": "true"}):
            get_settings.cache_clear()
            response = self.login()
            self.assertIn("Secure", response.headers["set-cookie"])

    def test_login_requires_csrf_header(self):
        self.client.headers.pop("X-CSRF-Protection")
        self.assertEqual(self.login().status_code, 403)


if __name__ == "__main__":
    unittest.main()
