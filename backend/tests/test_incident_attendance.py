from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app
from app.models.user import UserRole
from app.repositories import incidents as repository
from test_incidents import IncidentTestCase


class IncidentAttendanceTests(IncidentTestCase):
    def setUp(self):
        super().setUp()
        self.other_analyst = self.new_user(UserRole.ANALYST)

    def update(self, incident_id=None, **changes):
        return self.client.patch(
            f"/api/v1/incidents/{incident_id or self.high_old['id']}",
            headers=self.headers, json={"status": "UNDER_INVESTIGATION", "severity": "HIGH",
                                       "version": 1, **changes},
        )

    def assign(self, incident_id=None, **changes):
        return self.client.patch(
            f"/api/v1/incidents/{incident_id or self.high_recent['id']}/assignee",
            headers=self.headers, json={"analystId": str(self.analyst.id), "version": 1, **changes},
        )

    def reopen(self, incident_id=None, **changes):
        return self.client.post(
            f"/api/v1/incidents/{incident_id or self.closed['id']}/reopen",
            headers=self.headers, json={"reason": "  Problema voltou.  ", "version": 1, **changes},
        )

    def details(self, incident_id):
        return self.client.get(f"/api/v1/incidents/{incident_id}", headers=self.headers).json()

    def test_claim_assigns_self_and_starts_investigation_once(self):
        result = self.assign()
        self.assertEqual(result.status_code, 200, result.text)
        body = result.json()
        self.assertEqual(body["assignee"]["id"], str(self.analyst.id))
        self.assertEqual(body["status"], "UNDER_INVESTIGATION")
        self.assertEqual(body["version"], 2)
        event = body["history"][0]
        self.assertEqual(event["version"], 2)
        self.assertEqual({item["type"] for item in event["changes"]}, {"ASSIGNEE", "STATUS"})
        self.assertEqual(event["author"]["id"], str(self.analyst.id))

    def test_unassigned_cannot_be_assigned_to_someone_else(self):
        self.assertEqual(self.assign(analystId=str(self.other_analyst.id)).status_code, 403)
        for analyst_id in (str(self.driver.id), str(uuid4())):
            self.assertEqual(self.assign(analystId=analyst_id).status_code, 422)
        self.assertEqual(self.details(self.high_recent["id"])["version"], 1)

    def test_transfer_preserves_status_and_revokes_previous_owner(self):
        result = self.assign(self.high_old["id"], analystId=str(self.other_analyst.id))
        self.assertEqual(result.status_code, 200, result.text)
        current = result.json()
        self.assertEqual(current["version"], 2)
        self.assertEqual(current["status"], "UNDER_INVESTIGATION")
        self.assertEqual(current["assignee"]["id"], str(self.other_analyst.id))
        stale = self.update()
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.json()["code"], "VERSION_CONFLICT")
        self.assertEqual(stale.json()["currentIncident"], current)
        self.assertEqual(self.update(version=2).status_code, 403)
        self.assertEqual(self.assign(self.high_old["id"], version=2).status_code, 403)

    def test_transfer_to_self_is_rejected(self):
        self.assertEqual(self.assign(self.high_old["id"]).status_code, 422)

    def test_update_multiple_fields_increments_only_once(self):
        result = self.update(status="OPEN", severity="MEDIUM", observation="  Assistência acionada.  ")
        self.assertEqual(result.status_code, 200, result.text)
        body = result.json()
        self.assertEqual(body["version"], 2)
        self.assertEqual(body["status"], "OPEN")
        self.assertEqual(body["severity"], "MEDIUM")
        self.assertEqual(body["history"][0]["observation"], "Assistência acionada.")
        self.assertEqual({item["type"] for item in body["history"][0]["changes"]}, {"STATUS", "SEVERITY"})
        events = self.connection.execute(
            "SELECT COUNT(*) AS total FROM incident_history WHERE incident_id = %s AND incident_version = 2",
            (self.high_old["id"],),
        ).fetchone()["total"]
        self.assertEqual(events, 3)

    def test_observations_are_appended_without_rewriting_history(self):
        first = self.update(observation="Primeiro contato.").json()
        second = self.update(version=2, observation="Segundo contato.").json()
        self.assertEqual(second["version"], 3)
        self.assertEqual(second["history"][0]["changes"], [])
        self.assertEqual(second["history"][0]["observation"], "Segundo contato.")
        self.assertEqual(second["history"][1:], first["history"])

    def test_noop_preserves_entire_state_but_checks_version(self):
        before = self.details(self.high_old["id"])
        for observation in (None, "", "   "):
            result = self.update(observation=observation)
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.json(), before)
        self.assertEqual(self.update(version=2).status_code, 409)

    def test_both_closing_statuses_require_new_observation(self):
        for status in ("CLOSED", "INCONCLUSIVE"):
            with self.subTest(status=status), self.connection.transaction(force_rollback=True):
                for observation in (None, "", "   "):
                    self.assertEqual(self.update(status=status, observation=observation).status_code, 422)
                body = self.update(status=status, observation="Atendimento encerrado.").json()
                self.assertEqual(body["status"], status)
                self.assertEqual(body["version"], 2)
                self.assertEqual(self.update(status=status, version=2).json()["code"], "INVALID_STATE")
                self.assertEqual(self.assign(self.high_old["id"], version=2,
                                             analystId=str(self.other_analyst.id)).status_code, 422)

    def test_any_analyst_can_reopen_closed_and_assume_with_reason(self):
        for incident in (self.closed, self.inconclusive):
            result = self.reopen(incident["id"])
            self.assertEqual(result.status_code, 200, result.text)
            body = result.json()
            self.assertEqual(body["status"], "OPEN")
            self.assertEqual(body["assignee"]["id"], str(self.analyst.id))
            self.assertEqual(body["version"], 2)
            self.assertEqual(body["history"][0]["observation"], "Problema voltou.")
            self.assertEqual({item["type"] for item in body["history"][0]["changes"]}, {"REOPEN", "ASSIGNEE"})
            self.assertEqual(self.reopen(incident["id"], version=2).status_code, 422)

    def test_reopen_same_owner_does_not_duplicate_assignment(self):
        closed = self.update(status="CLOSED", observation="Concluído.").json()
        body = self.reopen(self.high_old["id"], version=2).json()
        self.assertEqual(body["version"], 3)
        self.assertEqual([item["type"] for item in body["history"][0]["changes"]], ["REOPEN"])
        self.assertEqual(body["history"][1:], closed["history"])

    def test_driver_cannot_mutate_own_or_other_incidents(self):
        self.headers = {"Authorization": f"Bearer {create_access_token(self.driver.id)}"}
        for action in (self.update, self.assign, self.reopen):
            self.assertEqual(action(self.high_old["id"]).status_code, 403)
            foreign = action(self.low["id"])
            self.assertEqual(foreign.status_code, 404)
            self.assertNotIn("currentIncident", foreign.json())

    def test_non_owner_cannot_update_or_transfer(self):
        self.headers = {"Authorization": f"Bearer {create_access_token(self.other_analyst.id)}"}
        self.assertEqual(self.update().status_code, 403)
        self.assertEqual(self.assign(self.high_old["id"]).status_code, 403)

    def test_invalid_payloads_and_missing_incidents(self):
        for version in (0, -1, True, "1", 1.0, None):
            for action in (self.update, self.assign, self.reopen):
                with self.subTest(version=version, action=action.__name__):
                    self.assertEqual(action(version=version).status_code, 422)
        self.assertEqual(self.update(title="Outro título").status_code, 422)
        self.assertEqual(self.assign(analystId=None).status_code, 422)
        for reason in ("", "  ", None):
            self.assertEqual(self.reopen(reason=reason).status_code, 422)
        for action in (self.update, self.assign, self.reopen):
            self.assertEqual(action(str(uuid4())).status_code, 404)

    def test_partial_history_failure_reverts_entire_update(self):
        before = self.details(self.high_old["id"])
        original = repository.insert_attendance_events

        def fail_after_first_event(connection, incident_id, version, author_id, events):
            original(connection, incident_id, version, author_id, events[:1])
            raise RuntimeError("falha simulada no restante do histórico")

        with patch.object(repository, "insert_attendance_events", side_effect=fail_after_first_event):
            with self.assertLogs("app.core.errors", level="ERROR"):
                with TestClient(app, raise_server_exceptions=False) as client:
                    result = client.patch(f"/api/v1/incidents/{self.high_old['id']}",
                        headers=self.headers, json={"status": "OPEN", "severity": "LOW",
                                                   "observation": "Teste", "version": 1})
        self.assertEqual(result.status_code, 500)
        self.assertEqual(self.details(self.high_old["id"]), before)

    def test_analyst_options_are_restricted_and_public(self):
        result = self.client.get("/api/v1/users/analysts", headers=self.headers)
        self.assertEqual(result.status_code, 200)
        rows = result.json()
        self.assertIn(str(self.analyst.id), [row["id"] for row in rows])
        self.assertIn(str(self.other_analyst.id), [row["id"] for row in rows])
        self.assertNotIn(str(self.driver.id), [row["id"] for row in rows])
        self.assertTrue(all(set(row) == {"id", "name"} for row in rows))
        self.headers = {"Authorization": f"Bearer {create_access_token(self.driver.id)}"}
        self.assertEqual(self.client.get("/api/v1/users/analysts", headers=self.headers).status_code, 403)
        self.assertEqual(self.client.get("/api/v1/users/analysts").status_code, 401)
