from uuid import uuid4

from app.core.security import create_access_token, verify_password
from app.models.user import UserRole
from app.repositories.users import find_by_email
from test_incidents import IncidentTestCase


class UserAdministrationTests(IncidentTestCase):
    def setUp(self):
        super().setUp()
        self.admin = self.new_user(UserRole.ADMIN)
        self.admin_headers = {"Authorization": f"Bearer {create_access_token(self.admin.id)}"}

    def payload(self, **changes):
        return {"name": "  Nova conta  ", "email": f"{uuid4()}@example.com",
                "password": "senha-de-teste", "role": "DRIVER", **changes}

    def create(self, **changes):
        return self.client.post('/api/v1/users', json=self.payload(**changes), headers=self.admin_headers)

    def status(self, user, active):
        return self.client.patch(f'/api/v1/users/{user.id}/status', json={"isActive": active}, headers=self.admin_headers)

    def test_only_admin_can_manage_users(self):
        for user in (self.driver, self.analyst):
            headers = {"Authorization": f"Bearer {create_access_token(user.id)}"}
            self.assertEqual(self.client.get('/api/v1/users', headers=headers).status_code, 403)
            self.assertEqual(self.client.post('/api/v1/users', headers=headers, json=self.payload()).status_code, 403)
            self.assertEqual(self.client.patch(f'/api/v1/users/{self.driver.id}/status', headers=headers, json={"isActive": False}).status_code, 403)
        self.assertEqual(self.client.get('/api/v1/users').status_code, 401)

    def test_create_roles_hash_password_and_login(self):
        for role in ('DRIVER', 'ANALYST'):
            email = f'{uuid4()}@example.com'
            result = self.create(email=f'  {email.upper()}  ', role=role)
            self.assertEqual(result.status_code, 201, result.text)
            self.assertEqual(result.json(), {"id": result.json()['id'], "name": "Nova conta", "email": email, "role": role, "isActive": True})
            saved = find_by_email(self.connection, email)
            self.assertNotEqual(saved.password_hash, 'senha-de-teste')
            self.assertTrue(verify_password('senha-de-teste', saved.password_hash))
            login = self.client.post('/api/v1/auth/login', json={"email": email, "password": "senha-de-teste"}, headers={"X-CSRF-Protection": "1"})
            self.assertEqual(login.status_code, 200)
            self.client.cookies.clear()

    def test_invalid_creation_and_privilege_escalation_are_rejected(self):
        for changes in ({"role": "ADMIN"}, {"role": "INVALID"}, {"password": "short"},
                        {"password": "x" * 129}, {"name": "   "}, {"email": "invalid"}, {"isActive": False}):
            with self.subTest(changes=changes):
                self.assertEqual(self.create(**changes).status_code, 422)

    def test_duplicate_email_is_conflict_and_transaction_remains_usable(self):
        result = self.create(email=self.driver.email.upper())
        self.assertEqual(result.status_code, 409)
        self.assertEqual(result.json()['code'], 'EMAIL_ALREADY_EXISTS')
        self.assertEqual(self.create().status_code, 201)

    def test_list_search_and_pagination_do_not_expose_secrets(self):
        result = self.client.get('/api/v1/users', params={"search": self.marker, "pageSize": 2}, headers=self.admin_headers)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['total'], 4)
        self.assertEqual(len(result.json()['items']), 2)
        for user in result.json()['items']:
            self.assertEqual(set(user), {'id', 'name', 'email', 'role', 'isActive'})
        page2 = self.client.get('/api/v1/users', params={"search": self.marker, "pageSize": 2, "page": 2}, headers=self.admin_headers).json()
        self.assertFalse({x['id'] for x in result.json()['items']} & {x['id'] for x in page2['items']})
        literal = self.client.get('/api/v1/users', params={"search": '%_'}, headers=self.admin_headers)
        self.assertEqual(literal.json()['total'], 0)

    def test_inactive_user_cannot_login_or_use_existing_session(self):
        token = create_access_token(self.driver.id)
        result = self.status(self.driver, False)
        self.assertEqual(result.status_code, 200)
        self.assertFalse(result.json()['isActive'])
        self.assertEqual(self.client.get('/api/v1/auth/me', headers={"Authorization": f"Bearer {token}"}).status_code, 401)
        self.assertEqual(self.client.get('/api/v1/incidents', headers={"Authorization": f"Bearer {token}"}).status_code, 401)
        login = self.client.post('/api/v1/auth/login', json={"email": self.driver.email, "password": "senha-temporaria"}, headers={"X-CSRF-Protection": "1"})
        self.assertEqual(login.status_code, 401)
        self.assertEqual(self.status(self.driver, True).status_code, 200)
        self.assertEqual(self.client.post('/api/v1/auth/login', json={"email": self.driver.email, "password": "senha-temporaria"}, headers={"X-CSRF-Protection": "1"}).status_code, 200)

    def test_deactivation_preserves_incidents_history_and_hides_options(self):
        before = self.connection.execute('SELECT count(*) AS n FROM incident_history').fetchone()['n']
        self.assertEqual(self.status(self.driver, False).status_code, 200)
        self.assertEqual(self.client.get(f"/api/v1/incidents/{self.high_recent['id']}", headers=self.headers).status_code, 200)
        self.assertEqual(self.connection.execute('SELECT count(*) AS n FROM incident_history').fetchone()['n'], before)
        options = self.client.get('/api/v1/users/drivers', headers=self.headers).json()
        self.assertNotIn(str(self.driver.id), [x['id'] for x in options])

    def test_analyst_with_active_assignments_cannot_be_disabled(self):
        result = self.status(self.analyst, False)
        self.assertEqual(result.status_code, 409)
        self.assertEqual(result.json()['code'], 'ACTIVE_ASSIGNMENTS')
        other = self.new_user(UserRole.ANALYST)
        self.assertEqual(self.status(other, False).status_code, 200)
        assigned = self.client.patch(f"/api/v1/incidents/{self.high_recent['id']}/assignee", headers={"Authorization": f"Bearer {create_access_token(other.id)}"}, json={"analystId": str(other.id), "version": 1})
        self.assertEqual(assigned.status_code, 401)

    def test_admin_has_analyst_access_but_cannot_disable_admins(self):
        self.assertEqual(self.client.get('/api/v1/incidents', headers=self.admin_headers).status_code, 200)
        self.assertEqual(self.client.get(f"/api/v1/incidents/{self.high_recent['id']}", headers=self.admin_headers).status_code, 200)
        options = self.client.get('/api/v1/users/analysts', headers=self.admin_headers)
        self.assertEqual(options.status_code, 200)
        self.assertIn(str(self.admin.id), [user['id'] for user in options.json()])
        self.assertEqual(self.status(self.admin, False).status_code, 403)

    def test_admin_can_claim_close_and_reopen_as_owner(self):
        path = f"/api/v1/incidents/{self.high_recent['id']}"
        result = self.client.patch(path + '/assignee', headers=self.admin_headers,
                                   json={"analystId": str(self.admin.id), "version": 1})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['assignee']['id'], str(self.admin.id))
        closed = self.client.patch(path, headers=self.admin_headers, json={
            "version": 2, "status": "CLOSED", "severity": "MEDIUM", "observation": "Atendimento concluído.",
        })
        self.assertEqual(closed.status_code, 200, closed.text)
        reopened = self.client.post(path + '/reopen', headers=self.admin_headers,
                                    json={"version": 3, "reason": "Problema voltou."})
        self.assertEqual(reopened.status_code, 200, reopened.text)
        self.assertEqual(reopened.json()['status'], 'OPEN')

    def test_admin_can_receive_transfer_but_not_edit_another_owner(self):
        path = f"/api/v1/incidents/{self.high_old['id']}"
        rejected = self.client.patch(path, headers=self.admin_headers, json={
            "version": 1, "status": "CLOSED", "severity": "HIGH", "observation": "Teste",
        })
        self.assertEqual(rejected.status_code, 403)
        transferred = self.client.patch(path + '/assignee', headers=self.headers,
                                        json={"version": 1, "analystId": str(self.admin.id)})
        self.assertEqual(transferred.status_code, 200, transferred.text)
        self.assertEqual(transferred.json()['assignee']['id'], str(self.admin.id))

    def test_admin_can_register_for_driver(self):
        response = self.client.post('/api/v1/incidents', headers=self.admin_headers, json={
            "title": "Registro administrativo", "description": "Registro em nome do motorista",
            "category": "MECHANICAL_ISSUE", "severity": "LOW", "truckPlate": "TST0001",
            "location": "Pátio", "occurredAt": "2026-01-01T10:00:00Z", "driverId": str(self.driver.id),
        })
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()['history'][0]['author']['id'], str(self.admin.id))

    def test_inactive_analyst_cannot_receive_transfer(self):
        other = self.new_user(UserRole.ANALYST)
        self.assertEqual(self.status(other, False).status_code, 200)
        result = self.client.patch(f"/api/v1/incidents/{self.high_old['id']}/assignee",
                                  headers=self.headers, json={"analystId": str(other.id), "version": 1})
        self.assertEqual(result.status_code, 422)

    def test_analyst_cannot_register_for_inactive_driver(self):
        self.assertEqual(self.status(self.driver, False).status_code, 200)
        result = self.client.post('/api/v1/incidents', headers=self.headers, json={
            "title": "Teste", "description": "Teste de conta inativa", "category": "MECHANICAL_ISSUE",
            "severity": "LOW", "driverId": str(self.driver.id), "truckPlate": "TST0001",
            "location": "Pátio", "occurredAt": "2026-01-01T10:00:00Z",
        })
        self.assertEqual(result.status_code, 422)

    def test_status_validation_and_missing_user(self):
        self.assertEqual(self.client.patch(f'/api/v1/users/{uuid4()}/status', headers=self.admin_headers, json={"isActive": False}).status_code, 404)
        self.assertEqual(self.client.patch(f'/api/v1/users/{self.driver.id}/status', headers=self.admin_headers, json={"isActive": "false"}).status_code, 422)

    def test_account_status_filter_defaults_to_active_and_combines_with_search(self):
        self.assertEqual(self.status(self.other_driver, False).status_code, 200)
        for status, expected in [(None, 3), ('ACTIVE', 3), ('INACTIVE', 1), ('ALL', 4)]:
            params = {"search": self.marker, "pageSize": 1}
            if status:
                params['status'] = status
            result = self.client.get('/api/v1/users', headers=self.admin_headers, params=params)
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(result.json()['total'], expected)
            self.assertEqual(len(result.json()['items']), 1)
            if status != 'ALL':
                self.assertEqual(result.json()['items'][0]['isActive'], status != 'INACTIVE')
        invalid = self.client.get('/api/v1/users', headers=self.admin_headers, params={"status": "INVALID"})
        self.assertEqual(invalid.status_code, 422)

    def test_empty_user_page_preserves_total_and_handles_large_offset(self):
        for page in (20, 10**30):
            response = self.client.get('/api/v1/users', headers=self.admin_headers,
                                       params={"search": self.marker, "pageSize": 2, "page": page})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()['total'], 4)
            self.assertEqual(response.json()['items'], [])
