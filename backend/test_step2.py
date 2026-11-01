from rest_framework.test import APIClient
from apps.users.models import User
from apps.barangay.models import Barangay
from apps.barangay.views import _blockers
from apps.hotspots.models import Hotspot

admin = User.objects.filter(user_role='Admin', status='Active').first()
c = APIClient(SERVER_NAME='localhost')
c.force_authenticate(admin)

def show(label, r, expect):
    try:
        body = str(r.json())[:150] if r.content else ''
    except Exception:
        body = ''
    ok = 'PASS' if r.status_code == expect else 'FAIL'
    print(f"[{ok}] {label}: got {r.status_code}, expected {expect}  {body}")

TEST = 'Zz Test Barangay'
Barangay.objects.filter(barangay_name__iexact=TEST).delete()

# 1. boundary endpoint
udiao = Barangay.objects.get(barangay_name='Udiao')
r = c.get(f'/api/barangays/{udiao.barangay_id}/boundary/')
show('1. GET boundary', r, 200)
print('   boundary type:', (r.json().get('boundary') or {}).get('type'))

# 2. create (with a valid outline), duplicate, reserved name, bad coordinates
r = c.post('/api/barangays/', {
    'barangay_name': TEST, 'latitude': 16.23, 'longitude': 120.47,
    'boundary': udiao.boundary}, format='json')
show('2a. create new barangay', r, 201)
new_id = r.json().get('barangay_id')
print('   is_registered:', r.json().get('is_registered'), '| has_boundary:', r.json().get('has_boundary'))
show('2b. duplicate name', c.post('/api/barangays/', {'barangay_name': TEST.lower(), 'latitude': 16.2, 'longitude': 120.4}, format='json'), 400)
show('2c. reserved name', c.post('/api/barangays/', {'barangay_name': 'admin', 'latitude': 16.2, 'longitude': 120.4}, format='json'), 400)
show('2d. bad latitude', c.post('/api/barangays/', {'barangay_name': 'Zz Other', 'latitude': 999, 'longitude': 120.4}, format='json'), 400)
show('2e. bad boundary', c.patch(f'/api/barangays/{new_id}/', {'boundary': {'type': 'Point', 'coordinates': [1, 2]}}, format='json'), 400)

# 3. rename + hotspot names follow (renames then renames back)
h = Hotspot.objects.select_related('barangay').first()
if h:
    hb = h.barangay
    old = hb.barangay_name
    print('   before:', list(Hotspot.objects.filter(barangay=hb).values_list('name', flat=True))[:3])
    show('3a. rename', c.patch(f'/api/barangays/{hb.barangay_id}/', {'barangay_name': old + ' X'}, format='json'), 200)
    print('   after: ', list(Hotspot.objects.filter(barangay=hb).values_list('name', flat=True))[:3])
    show('3b. rename back', c.patch(f'/api/barangays/{hb.barangay_id}/', {'barangay_name': old}, format='json'), 200)
    print('   restored:', list(Hotspot.objects.filter(barangay=hb).values_list('name', flat=True))[:3])
else:
    print('3. SKIPPED: no hotspots in the database')

# 4. deactivate
show('4a. no reason', c.patch(f'/api/barangays/{new_id}/deactivate/', {}, format='json'), 400)
busy = next((b for b in Barangay.objects.filter(is_active=True) if _blockers(b)), None)
if busy:
    print('   blocked by:', _blockers(busy), 'in', busy.barangay_name)
    show('4b. busy barangay', c.patch(f'/api/barangays/{busy.barangay_id}/deactivate/', {'reason': 'test'}, format='json'), 400)
show('4c. clean test barangay', c.patch(f'/api/barangays/{new_id}/deactivate/', {'reason': 'Testing'}, format='json'), 200)
show('4d. already inactive', c.patch(f'/api/barangays/{new_id}/deactivate/', {'reason': 'Again'}, format='json'), 400)
show('4e. register while inactive', c.patch(f'/api/barangays/{new_id}/register/', {}, format='json'), 400)

# 5. no delete
show('5. DELETE', c.delete(f'/api/barangays/{new_id}/'), 405)

# 6. reactivate
show('6a. reactivate', c.patch(f'/api/barangays/{new_id}/reactivate/', {}, format='json'), 200)
b = Barangay.objects.get(pk=new_id)
print('   active:', b.is_active, '| registered:', b.is_registered, '| reason:', repr(b.deactivation_reason))
show('6b. reactivate again', c.patch(f'/api/barangays/{new_id}/reactivate/', {}, format='json'), 400)

# cleanup
Barangay.objects.filter(pk=new_id).delete()
print('Cleaned up test barangay.')