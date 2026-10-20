from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import get_database
from app.core.security import create_access_token
from app.main import app
from app.repositories import incidents as repository
from test_incidents import IncidentTestCase


class IncidentDetailTests(IncidentTestCase):
    def payload(self, **changes):
        return {
            "title": f"{self.marker} Nova ocorrência",
            "description": "Descrição do problema",
            "category": "MECHANICAL_ISSUE", "severity": "HIGH",
            "truckPlate": "ABC-1D23", "location": "BR-116, km 100",
            "occurredAt": (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(),
            **changes,
        }

    def as_driver(self):
        self.headers = {"Authorization": f"Bearer {create_access_token(self.driver.id)}"}

    def post(self, **changes):
        return self.client.post("/api/v1/incidents", headers=self.headers,
                                json=self.payload(**changes))

    def detail(self, incident_id):
        return self.client.get(f"/api/v1/incidents/{incident_id}", headers=self.headers)

    def count(self):
        return self.connection.execute(
            "SELECT COUNT(*) AS total FROM incidents WHERE title LIKE %s",
            (f"{self.marker}%",),
        ).fetchone()["total"]

    def test_driver_creates_own_incident_with_creation_history(self):
        self.as_driver()
        result = self.post()
        self.assertEqual(result.status_code, 201, result.text)
        body = result.json()
        self.assertEqual(result.headers["Location"], f"/api/v1/incidents/{body['id']}")
        self.assertEqual(body["driver"]["id"], str(self.driver.id))
        self.assertEqual(body["status"], "OPEN")
        self.assertIsNone(body["assignee"])
        self.assertIsNone(body["routeCode"])
        self.assertEqual(body["version"], 1)
        self.assertRegex(body["code"], r"^INC-\d{4,}$")
        self.assertEqual(len(body["history"]), 1)
        event = body["history"][0]
        self.assertEqual(event["author"]["id"], str(self.driver.id))
        self.assertEqual(event["version"], 1)
        self.assertEqual(event["changes"], [{"type": "CREATED"}])
        self.assertEqual(event["createdAt"], body["reportedAt"])
        self.assertEqual(self.detail(body["id"]).json(), body)

    def test_analyst_records_for_driver_without_becoming_assignee(self):
        result = self.post(driverId=str(self.driver.id))
        self.assertEqual(result.status_code, 201, result.text)
        body = result.json()
        self.assertEqual(body["driver"]["id"], str(self.driver.id))
        self.assertIsNone(body["assignee"])
        self.assertEqual(body["history"][0]["author"]["id"], str(self.analyst.id))
        self.assertNotEqual(body["code"], self.high_recent["code"])

    def test_analyst_must_select_existing_driver(self):
        for changes in ({}, {"driverId": None}, {"driverId": str(uuid4())},
                        {"driverId": str(self.analyst.id)}, {"driverId": "invalido"}):
            with self.subTest(changes=changes):
                result = self.post(**changes)
                self.assertEqual(result.status_code, 422)
                self.assertEqual(result.json()["code"], "VALIDATION_ERROR")
        self.assertEqual(self.count(), 6)

    def test_driver_cannot_send_driver_id_even_when_null_or_own(self):
        self.as_driver()
        for user_id in (None, str(self.driver.id), str(self.other_driver.id)):
            self.assertEqual(self.post(driverId=user_id).status_code, 422)
        self.assertEqual(self.count(), 6)

    def test_creation_normalizes_fields_and_timezone(self):
        self.as_driver()
        body = self.post(title=f"  {self.marker} Título  ",
                         description="  Descrição  ", location="  Local  ",
                         truckPlate="  abc-1d23  ", routeCode="  R-10  ",
                         occurredAt="2026-01-01T10:00:00-03:00").json()
        self.assertEqual(body["title"], f"{self.marker} Título")
        self.assertEqual(body["description"], "Descrição")
        self.assertEqual(body["location"], "Local")
        self.assertEqual(body["truckPlate"], "ABC-1D23")
        self.assertEqual(body["routeCode"], "R-10")
        self.assertEqual(body["occurredAt"], "2026-01-01T13:00:00Z")
        for route in ("  ", None):
            self.assertIsNone(self.post(routeCode=route).json()["routeCode"])

    def test_invalid_creation_fields_leave_no_records(self):
        self.as_driver()
        future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        cases = [
            {"title": "  "}, {"title": "t" * 161}, {"description": " "},
            {"location": " "}, {"truckPlate": " "}, {"truckPlate": "x" * 11},
            {"routeCode": "r" * 51}, {"occurredAt": future},
            {"occurredAt": "2026-01-01T10:00:00"}, {"occurredAt": 1234},
            {"occurredAt": "invalido"}, {"category": "UNKNOWN"}, {"severity": "UNKNOWN"},
            {"status": "CLOSED"}, {"version": 10}, {"code": "INC-9999"},
            {"assignee": str(self.analyst.id)}, {"reportedAt": "2026-01-01T00:00:00Z"},
        ]
        for changes in cases:
            with self.subTest(changes=changes):
                result = self.post(**changes)
                self.assertEqual(result.status_code, 422, result.text)
        self.assertEqual(self.count(), 6)

    def test_other_drivers_detail_is_indistinguishable_from_missing(self):
        self.as_driver()
        foreign = self.detail(self.low["id"])
        missing = self.detail(uuid4())
        self.assertEqual(foreign.status_code, 404)
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(foreign.json(), missing.json())
        self.assertEqual(foreign.json()["code"], "NOT_FOUND")
        self.assertEqual(self.detail(self.closed["id"]).status_code, 200)

    def test_analyst_can_read_any_driver_and_uuid_is_validated(self):
        body = self.detail(self.low["id"]).json()
        self.assertEqual(body["driver"]["id"], str(self.other_driver.id))
        self.assertEqual(body["description"], "Descrição privada")
        self.assertEqual(self.detail("INC-0001").status_code, 422)

    def test_old_incident_without_history_has_empty_array(self):
        self.connection.execute("DELETE FROM incident_history WHERE incident_id = %s",
                                (self.high_recent["id"],))
        self.assertEqual(self.detail(self.high_recent["id"]).json()["history"], [])

    def test_history_grouping_observation_assignment_and_reopen(self):
        incident_id = self.high_recent["id"]
        for kind, version, previous, new, observation in (
            ("STATUS", 2, "OPEN", "CLOSED", None),
            ("OBSERVATION", 2, None, None, "Atendimento concluído."),
            ("SEVERITY", 3, "HIGH", "MEDIUM", None),
            ("OBSERVATION", 4, None, None, "Nova informação."),
            ("REOPEN", 5, "CLOSED", "OPEN", "Falha voltou a ocorrer."),
        ):
            self.connection.execute(
                """INSERT INTO incident_history (
                    incident_id, change_type, incident_version, changed_by_user_id,
                    previous_value, new_value, observation
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (incident_id, kind, version, self.analyst.id, previous, new, observation),
            )
        self.connection.execute(
            """INSERT INTO incident_history (
                incident_id, change_type, incident_version, changed_by_user_id, new_analyst_id
            ) VALUES (%s, 'ASSIGNEE', 5, %s, %s)""",
            (incident_id, self.analyst.id, self.analyst.id),
        )
        self.connection.execute("UPDATE incidents SET version = 5 WHERE id = %s", (incident_id,))
        history = self.detail(incident_id).json()["history"]
        self.assertEqual([entry["version"] for entry in history], [5, 4, 3, 2, 1])
        self.assertEqual(history[0]["observation"], "Falha voltou a ocorrer.")
        assignee = next(change for change in history[0]["changes"] if change["type"] == "ASSIGNEE")
        self.assertIsNone(assignee["previousAssignee"])
        self.assertEqual(assignee["newAssignee"]["id"], str(self.analyst.id))
        self.assertEqual(history[1]["changes"], [])
        self.assertEqual(history[1]["observation"], "Nova informação.")
        self.assertEqual(len(history[3]["changes"]), 1)
        self.assertEqual(history[3]["observation"], "Atendimento concluído.")
        self.assertEqual(self.detail(incident_id).json()["history"], history)

    def test_history_failure_rolls_back_incident_insert(self):
        self.as_driver()
        with patch.object(repository, "insert_creation_event", side_effect=RuntimeError("simulado")):
            with self.assertLogs("app.core.errors", level="ERROR"):
                with TestClient(app, raise_server_exceptions=False) as client:
                    response = client.post("/api/v1/incidents", headers=self.headers,
                                           json=self.payload())
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["code"], "INTERNAL_ERROR")
        self.assertEqual(self.count(), 6)

    def test_transaction_exit_failure_prevents_success_response(self):
        self.as_driver()

        def failed_transaction():
            yield self.connection
            raise RuntimeError("falha ao confirmar transação")

        app.dependency_overrides[get_database] = failed_transaction
        with self.assertLogs("app.core.errors", level="ERROR"):
            with TestClient(app, raise_server_exceptions=False) as client:
                result = client.post("/api/v1/incidents", headers=self.headers,
                                     json=self.payload())
        self.assertEqual(result.status_code, 500)

    def test_driver_options_only_for_analysts_and_no_private_data(self):
        result = self.client.get("/api/v1/users/drivers", headers=self.headers)
        self.assertEqual(result.status_code, 200)
        self.assertIn(str(self.driver.id), [row["id"] for row in result.json()])
        self.assertNotIn(str(self.analyst.id), [row["id"] for row in result.json()])
        self.assertTrue(all(set(row) == {"id", "name"} for row in result.json()))
        self.as_driver()
        self.assertEqual(self.client.get("/api/v1/users/drivers", headers=self.headers).status_code, 403)
        self.assertEqual(self.client.get("/api/v1/users/drivers").status_code, 401)

    def test_new_routes_require_authentication(self):
        self.assertEqual(self.client.post("/api/v1/incidents", json=self.payload()).status_code, 401)
        self.assertEqual(self.client.get(f"/api/v1/incidents/{self.high_recent['id']}").status_code, 401)
