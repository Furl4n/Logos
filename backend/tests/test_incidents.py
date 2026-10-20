import io
import os
import unittest
from contextlib import contextmanager, redirect_stdout
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from psycopg.errors import CheckViolation

from app import seed_incidents
from app.core.config import get_settings
from app.core.database import connect_database, get_database
from app.core.security import create_access_token, password_hasher
from app.main import app
from app.models.user import UserRole
from app.repositories.users import create_user


class IncidentTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password_hash = password_hasher.hash("senha-temporaria")

    def setUp(self):
        self.env = patch.dict(os.environ, {"JWT_SECRET_KEY": "test-only-key-" * 5})
        self.env.start()
        get_settings.cache_clear()
        self.connection = connect_database()
        self.marker = uuid4().hex
        self.driver = self.new_user(UserRole.DRIVER)
        self.other_driver = self.new_user(UserRole.DRIVER)
        self.analyst = self.new_user(UserRole.ANALYST)
        self.headers = {"Authorization": f"Bearer {create_access_token(self.analyst.id)}"}

        def database_override():
            yield self.connection

        app.dependency_overrides[get_database] = database_override
        self.client = TestClient(app)
        self.high_recent = self.add_incident(severity="HIGH", minutes=5)
        self.high_old = self.add_incident(severity="HIGH", minutes=120,
                                          status="UNDER_INVESTIGATION", assigned=True)
        self.medium = self.add_incident(severity="MEDIUM", minutes=1)
        self.low = self.add_incident(severity="LOW", minutes=2,
                                     category="ROAD_BLOCK", driver=self.other_driver)
        self.closed = self.add_incident(status="CLOSED")
        self.inconclusive = self.add_incident(status="INCONCLUSIVE")

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.connection.rollback()
        self.connection.close()
        self.env.stop()
        get_settings.cache_clear()

    def new_user(self, role):
        return create_user(self.connection, f"{self.marker} {role}",
                           f"{uuid4()}@example.com", role, self.password_hash)

    def add_incident(self, *, severity="LOW", minutes=10, status="OPEN",
                     category="MECHANICAL_ISSUE", driver=None, assigned=False, title=None):
        row = self.connection.execute(
            """INSERT INTO incidents (title, description, category, severity, status,
               driver_id, analyst_id, truck_plate, location, occurred_at)
               VALUES (%s, 'Descrição privada', %s, %s, %s, %s, %s, %s, %s, %s)
               RETURNING id, code, reported_at""",
            (title or f"{self.marker} Incidente", category, severity, status,
             (driver or self.driver).id, self.analyst.id if assigned else None,
             self.marker[:10], f"{self.marker} Curitiba",
             datetime.now(timezone.utc) - timedelta(minutes=minutes)),
        ).fetchone()
        self.connection.execute(
            """INSERT INTO incident_history
               (incident_id, change_type, changed_by_user_id, incident_version, created_at)
               VALUES (%s, 'CREATED', %s, 1, %s)""",
            (row["id"], self.analyst.id, row["reported_at"]),
        )
        return {**row, "id": str(row["id"])}

    def get(self, **params):
        return self.client.get("/api/v1/incidents", headers=self.headers,
                               params={"search": self.marker, **params})


class IncidentListTests(IncidentTestCase):
    def test_assignment_filters_and_pagination(self):
        other = self.new_user(UserRole.ANALYST)
        self.connection.execute("UPDATE incidents SET analyst_id = %s WHERE id = %s",
                                (other.id, self.medium["id"]))
        mine = self.get(assignment="MINE").json()
        self.assertEqual(mine["total"], 1)
        self.assertEqual(mine["items"][0]["id"], self.high_old["id"])
        unassigned = self.get(assignment="UNASSIGNED", pageSize=1).json()
        self.assertEqual(unassigned["total"], 2)
        self.assertEqual(len(unassigned["items"]), 1)
        others = self.get(assignment="OTHERS").json()
        self.assertEqual(others["total"], 1)
        self.assertEqual(others["items"][0]["id"], self.medium["id"])
        self.assertEqual(self.get(assignment="OTHERS", severity="HIGH").json()["total"], 0)
        self.assertEqual(self.get(assignment="MINE", category="ROAD_BLOCK").json()["total"], 0)
        self.assertEqual(self.get(assignment="invalid").status_code, 422)

    def test_driver_cannot_use_analyst_assignment_filters(self):
        self.headers = {"Authorization": f"Bearer {create_access_token(self.driver.id)}"}
        for assignment in ("MINE", "UNASSIGNED", "OTHERS"):
            self.assertEqual(self.get(assignment=assignment).status_code, 403)
        self.assertEqual(self.get(assignment="ALL").json()["total"], 3)

    def test_default_active_scope_and_priority_order(self):
        result = self.get()
        self.assertEqual(result.status_code, 200, result.text)
        body = result.json()
        self.assertEqual((body["page"], body["pageSize"], body["total"]), (1, 100, 4))
        self.assertEqual([item["id"] for item in body["items"]], [
            row["id"] for row in (self.high_recent, self.high_old, self.medium, self.low)
        ])

    def test_oldest_keeps_severity_first(self):
        body = self.get(timeOrder="oldest").json()
        self.assertEqual([item["id"] for item in body["items"]], [
            row["id"] for row in (self.high_old, self.high_recent, self.medium, self.low)
        ])

    def test_same_severity_and_time_are_ordered_by_uuid(self):
        self.connection.execute(
            "UPDATE incidents SET occurred_at = %s WHERE id IN (%s, %s)",
            (datetime.now(timezone.utc), self.high_recent["id"], self.high_old["id"]),
        )
        expected = sorted([self.high_recent["id"], self.high_old["id"]])
        for direction in ("newest", "oldest"):
            self.assertEqual([item["id"] for item in self.get(
                severity="HIGH", timeOrder=direction).json()["items"]], expected)

    def test_driver_cannot_see_another_drivers_incidents(self):
        self.headers = {"Authorization": f"Bearer {create_access_token(self.driver.id)}"}
        result = self.get(status="ALL").json()
        self.assertEqual(result["total"], 5)
        self.assertNotIn(self.low["id"], [item["id"] for item in result["items"]])
        self.assertEqual(self.get(driverId=str(self.other_driver.id)).status_code, 422)

    def test_status_filters_and_combination(self):
        self.assertEqual(self.get(status="ALL").json()["total"], 6)
        for status, expected in (("OPEN", 3), ("UNDER_INVESTIGATION", 1),
                                 ("CLOSED", 1), ("INCONCLUSIVE", 1)):
            with self.subTest(status=status):
                self.assertEqual(self.get(status=status).json()["total"], expected)
        body = self.get(severity="LOW", category="ROAD_BLOCK", status="OPEN").json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["items"][0]["id"], self.low["id"])
        self.assertEqual(self.get(severity="HIGH", category="ROAD_BLOCK").json()["total"], 0)

    def test_pagination_over_one_hundred_records(self):
        for _ in range(101):
            self.add_incident()
        first = self.get().json()
        second = self.get(page=2).json()
        beyond = self.get(page=10).json()
        self.assertEqual(first["total"], 105)
        self.assertEqual(len(first["items"]), 100)
        self.assertEqual(len(second["items"]), 5)
        self.assertFalse({row["id"] for row in first["items"]} &
                         {row["id"] for row in second["items"]})
        self.assertEqual(beyond["items"], [])
        self.assertEqual(beyond["total"], 105)
        self.assertEqual(self.get(page=10**30).json()["items"], [])

    def test_summary_and_references_without_private_fields(self):
        rows = self.get().json()["items"]
        for row in rows:
            self.assertEqual(set(row), {"id", "code", "title", "category", "severity",
                "status", "driver", "assignee", "truckPlate", "location",
                "occurredAt", "reportedAt", "version"})
            self.assertEqual(set(row["driver"]), {"id", "name"})
            self.assertRegex(row["code"], r"^INC-\d{4,}$")
            self.assertTrue(row["occurredAt"].endswith("Z"))
        assigned = next(row for row in rows if row["id"] == self.high_old["id"])
        self.assertEqual(assigned["assignee"]["id"], str(self.analyst.id))
        self.assertIsNone(rows[0]["assignee"])

    def test_search_case_trim_code_name_plate_location(self):
        for query in (f"  {self.marker.upper()}  ", self.high_recent["code"].lower(),
                      self.driver.name.upper(), self.marker[:10],
                      f"{self.marker} Curitiba"):
            with self.subTest(query=query):
                body = self.get(search=query).json()
                self.assertIn(self.high_recent["id"], [row["id"] for row in body["items"]])
        self.assertEqual(self.get(search="' OR 1=1 --").json()["total"], 0)

    def test_search_wildcards_are_literal(self):
        special = self.add_incident(title=f"{self.marker}%_especial")
        body = self.get(search=f"{self.marker}%_").json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["items"][0]["id"], special["id"])

    def test_invalid_filters(self):
        for query in ({"page": 0}, {"pageSize": 101}, {"pageSize": 0},
                      {"timeOrder": "invalid"}, {"status": "invalid"},
                      {"severity": "HIGH,LOW"}, {"category": "invalid"},
                      {"unknown": "value"}):
            with self.subTest(query=query):
                result = self.get(**query)
                self.assertEqual(result.status_code, 422)
                self.assertEqual(result.json()["code"], "VALIDATION_ERROR")

    def test_requires_authentication(self):
        self.assertEqual(self.client.get("/api/v1/incidents").status_code, 401)

    def test_created_event_has_real_author_and_version_one(self):
        event = self.connection.execute(
            "SELECT * FROM incident_history WHERE incident_id = %s",
            (self.high_recent["id"],),
        ).fetchone()
        self.assertEqual(event["changed_by_user_id"], self.analyst.id)
        self.assertEqual(event["incident_version"], 1)
        with self.assertRaises(CheckViolation):
            with self.connection.transaction():
                self.connection.execute(
                    """INSERT INTO incident_history
                       (incident_id, change_type, changed_by_user_id, incident_version)
                       VALUES (%s, 'CREATED', %s, 2)""",
                    (self.high_recent["id"], self.analyst.id),
                )

    def test_optional_seed_records_creation_and_does_not_duplicate(self):
        @contextmanager
        def use_test_connection():
            yield self.connection

        args = ["seed_incidents", "--driver-email", self.driver.email]
        with patch("sys.argv", args), patch.object(
            seed_incidents, "connect_database", use_test_connection
        ), redirect_stdout(io.StringIO()):
            seed_incidents.main()
            seed_incidents.main()
        total = self.connection.execute(
            """SELECT COUNT(*) AS total FROM incidents i
               JOIN incident_history h ON h.incident_id = i.id
               WHERE i.driver_id = %s AND i.title LIKE %s
               AND h.change_type = 'CREATED' AND h.changed_by_user_id = %s
               AND h.incident_version = 1""",
            (self.driver.id, f"{seed_incidents.PREFIX}%", self.driver.id),
        ).fetchone()["total"]
        self.assertEqual(total, 120)


if __name__ == "__main__":
    unittest.main()
