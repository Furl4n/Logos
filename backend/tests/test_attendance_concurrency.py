import os
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Barrier
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.database import connect_database
from app.core.security import create_access_token, password_hasher
from app.main import app
from app.models.user import UserRole
from app.repositories import incidents as repository
from app.repositories.users import create_user
from app.schemas.incidents import CreateIncidentRequest


class AttendanceConcurrencyTests(unittest.TestCase):
    """Duas requisições e conexões reais, sincronizadas antes do UPDATE condicional."""

    @classmethod
    def setUpClass(cls):
        cls.password_hash = password_hasher.hash("senha-temporaria")

    def setUp(self):
        self.env = patch.dict(os.environ, {"JWT_SECRET_KEY": "test-only-key-" * 5})
        self.env.start()
        get_settings.cache_clear()
        self.user_ids = []
        self.incident_id = None
        # As outras conexões precisam enxergar os dados. A limpeza usa apenas os
        # UUIDs criados por este teste, sem modificar registros preexistentes.
        with connect_database() as connection:
            users = []
            for role in (UserRole.DRIVER, UserRole.ANALYST, UserRole.ANALYST):
                user = create_user(connection, "Teste concorrente", f"{uuid4()}@example.com",
                                   role, self.password_hash)
                users.append(user)
                self.user_ids.append(user.id)
            self.driver, self.first, self.second = users
            self.incident_id = repository.insert_incident(connection, CreateIncidentRequest(
                title="Teste temporário de concorrência", description="Teste de integração",
                category="MECHANICAL_ISSUE", severity="HIGH", truckPlate="TEST-0001",
                location="Local de teste", occurredAt=datetime.now(timezone.utc) - timedelta(minutes=1),
            ), self.driver.id)
            repository.insert_creation_event(connection, self.incident_id, self.driver.id)

    def tearDown(self):
        with connect_database() as connection:
            if self.incident_id is not None:
                connection.execute("DELETE FROM incidents WHERE id = %s", (self.incident_id,))
            for user_id in self.user_ids:
                connection.execute("DELETE FROM users WHERE id = %s", (user_id,))
        self.env.stop()
        get_settings.cache_clear()

    def request(self, user, path, body):
        with TestClient(app) as client:
            return client.patch(f"/api/v1/incidents/{self.incident_id}{path}", json=body,
                headers={"Authorization": f"Bearer {create_access_token(user.id)}"})

    def race(self, calls):
        barrier = Barrier(2, timeout=15)
        original = repository.apply_attendance_update

        def synchronized(*args, **kwargs):
            barrier.wait()
            return original(*args, **kwargs)

        with patch.object(repository, "apply_attendance_update", side_effect=synchronized):
            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = [executor.submit(self.request, *call) for call in calls]
                results = [future.result(timeout=30) for future in futures]
        self.assertEqual(sorted(result.status_code for result in results), [200, 409],
                         [result.text for result in results])
        success = next(result.json() for result in results if result.status_code == 200)
        conflict = next(result.json() for result in results if result.status_code == 409)
        self.assertEqual(conflict["code"], "VERSION_CONFLICT")
        self.assertEqual(conflict["currentIncident"], success)
        return success

    def test_two_analysts_cannot_claim_same_incident(self):
        success = self.race([
            (self.first, "/assignee", {"analystId": str(self.first.id), "version": 1}),
            (self.second, "/assignee", {"analystId": str(self.second.id), "version": 1}),
        ])
        self.assertEqual(success["version"], 2)
        self.assertEqual(success["status"], "UNDER_INVESTIGATION")
        self.assertEqual(len(success["history"]), 2)
        self.assertEqual(len(success["history"][0]["changes"]), 2)

    def test_two_tabs_cannot_add_observations_with_same_version(self):
        self.assertEqual(self.request(self.first, "/assignee", {
            "analystId": str(self.first.id), "version": 1}).status_code, 200)
        body = {"status": "UNDER_INVESTIGATION", "severity": "HIGH", "version": 2}
        success = self.race([
            (self.first, "", {**body, "observation": "Primeira aba"}),
            (self.first, "", {**body, "observation": "Segunda aba"}),
        ])
        self.assertEqual(success["version"], 3)
        self.assertEqual(len(success["history"]), 3)
        self.assertEqual(success["history"][0]["changes"], [])
        self.assertIn(success["history"][0]["observation"], {"Primeira aba", "Segunda aba"})

    def test_transfer_competing_with_update_cannot_overwrite_either(self):
        self.assertEqual(self.request(self.first, "/assignee", {
            "analystId": str(self.first.id), "version": 1}).status_code, 200)
        success = self.race([
            (self.first, "/assignee", {"analystId": str(self.second.id), "version": 2}),
            (self.first, "", {"status": "UNDER_INVESTIGATION", "severity": "LOW", "version": 2}),
        ])
        self.assertEqual(success["version"], 3)
        if success["assignee"]["id"] == str(self.second.id):
            self.assertEqual(success["severity"], "HIGH")
        else:
            self.assertEqual(success["assignee"]["id"], str(self.first.id))
            self.assertEqual(success["severity"], "LOW")
