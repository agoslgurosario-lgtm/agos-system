from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from apps.barangay.models import Barangay
from apps.users.models import User
from .models import BarangayPersonnel, CanalMonitoringReport
from .personnel import split_names, parse_personnel


class SplitNamesTests(SimpleTestCase):
    def test_separators(self):
        cases = {
            'Juan, Pedro and Maria': ['Juan', 'Pedro', 'Maria'],
            'Juan & Pedro': ['Juan', 'Pedro'],
            'Juan / Pedro; Maria + Ana': ['Juan', 'Pedro', 'Maria', 'Ana'],
            'Juan at Pedro': ['Juan', 'Pedro'],
            'Juan AND Pedro': ['Juan', 'Pedro'],
            'Juan\nPedro': ['Juan', 'Pedro'],
            'Juan Dela Cruz': ['Juan Dela Cruz'],
            'Andres Santos': ['Andres Santos'],
            'Atty. Cruz': ['Atty. Cruz'],
            'juan, JUAN,  Juan ': ['Juan'],
            ' , ,and, ': [],
        }
        for raw, expected in cases.items():
            self.assertEqual(split_names(raw), expected, raw)

    def test_validation(self):
        names, errors = parse_personnel("Ma. Theresa, O'Brien, Juan-Pedro")
        self.assertEqual(names, ['Ma. Theresa', "O'Brien", 'Juan-Pedro'])
        self.assertEqual(errors, [])
        names, errors = parse_personnel('Juan, Tanod 2, J, Pedro')
        self.assertEqual(names, ['Juan', 'Pedro'])
        self.assertEqual(len(errors), 2)


class PersonnelApiTests(TestCase):
    def setUp(self):
        self.b1 = Barangay.objects.create(barangay_name='One', latitude=0, longitude=0)
        self.b2 = Barangay.objects.create(barangay_name='Two', latitude=0, longitude=0)
        self.u1 = User.objects.create_user(
            email='a@x.com', password='pw', first_name='A', last_name='B',
            user_role='Barangay', barangay=self.b1)
        self.u2 = User.objects.create_user(
            email='b@x.com', password='pw', first_name='A', last_name='B',
            user_role='Barangay', barangay=self.b2)
        self.client = APIClient()
        self.client.force_authenticate(self.u1)

    def test_preview_does_not_save(self):
        r = self.client.post('/api/personnel/', {'text': 'Juan and Pedro', 'save': False}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['names'], ['Juan', 'Pedro'])
        self.assertEqual(BarangayPersonnel.objects.count(), 0)

    def test_save_and_list_private_per_barangay(self):
        r = self.client.post('/api/personnel/', {'text': 'Juan, Pedro & maria'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.client.post('/api/personnel/', {'text': 'JUAN'}, format='json')  # duplicate ignoring case
        self.assertEqual(BarangayPersonnel.objects.filter(barangay=self.b1).count(), 3)
        self.assertEqual(sorted(self.client.get('/api/personnel/').data['names']), ['Juan', 'Maria', 'Pedro'])
        other = APIClient(); other.force_authenticate(self.u2)
        self.assertEqual(other.get('/api/personnel/').data['names'], [])

    def test_bad_input(self):
        self.assertEqual(self.client.post('/api/personnel/', {'text': 'Tanod 2'}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/personnel/', {'text': ' , '}, format='json').status_code, 400)

    def test_similar_hint(self):
        self.client.post('/api/personnel/', {'text': 'Juan Dela Cruz'}, format='json')
        r = self.client.post('/api/personnel/', {'text': 'Juan Dela Cruze'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['similar'], {'Juan Dela Cruze': 'Juan Dela Cruz'})

    def test_non_barangay_forbidden(self):
        admin = User.objects.create_user(
            email='m@x.com', password='pw', first_name='M', last_name='M', user_role='MENRO')
        c = APIClient(); c.force_authenticate(admin)
        self.assertEqual(c.get('/api/personnel/').status_code, 403)

    def test_last_crew_and_report_save(self):
        r = self.client.post('/api/canal-reports/', {'assigned_personnel': 'Juan & Pedro and juan'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['assigned_personnel'], 'Juan, Pedro')
        self.assertEqual(sorted(BarangayPersonnel.objects.values_list('name', flat=True)), ['Juan', 'Pedro'])
        self.assertEqual(self.client.get('/api/personnel/').data['last_crew'], ['Juan', 'Pedro'])

        bad = self.client.patch(f"/api/canal-reports/{r.data['report_id']}/",
                                {'assigned_personnel': 'Tanod 1'}, format='json')
        self.assertEqual(bad.status_code, 400)
