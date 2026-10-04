from django.test import TestCase
from apps.rainfall.services import mm_per_hour_to_condition

from apps.rainfall.models import AlertThreshold, RainfallCondition
from apps.barangay.models import Barangay
from apps.rainfall.services import classify_water_level


class RainfallConditionTests(TestCase):
    def test_zero_rainfall_is_none(self):
        self.assertEqual(mm_per_hour_to_condition(0), 'None')

    def test_just_below_yellow_boundary(self):
        self.assertEqual(mm_per_hour_to_condition(7.4), 'None')

    def test_yellow_band(self):
        self.assertEqual(mm_per_hour_to_condition(7.5), 'Yellow')
        self.assertEqual(mm_per_hour_to_condition(14.9), 'Yellow')

    def test_orange_band(self):
        self.assertEqual(mm_per_hour_to_condition(15), 'Orange')
        self.assertEqual(mm_per_hour_to_condition(29.9), 'Orange')

    def test_red_band_and_beyond(self):
        self.assertEqual(mm_per_hour_to_condition(30), 'Red')
        self.assertEqual(mm_per_hour_to_condition(500), 'Red')


class ClassifyWaterLevelTests(TestCase):
    def setUp(self):
        AlertThreshold.objects.update_or_create(
            condition='None', defaults={'warning_pct': 50, 'critical_pct': 80}
        )
        AlertThreshold.objects.update_or_create(
            condition='Unknown', defaults={'warning_pct': 50, 'critical_pct': 80}
        )
        AlertThreshold.objects.update_or_create(
            condition='Yellow', defaults={'warning_pct': 40, 'critical_pct': 70}
        )
        AlertThreshold.objects.update_or_create(
            condition='Red', defaults={'warning_pct': 20, 'critical_pct': 50}
        )

        self.barangay = Barangay.objects.create(
            barangay_name='Test Barangay', latitude=16.6, longitude=120.3
        )

    def test_normal_when_below_warning(self):
        # unregistered barangay -> no RainfallCondition row -> 'Unknown' tier
        result = classify_water_level(water_level=30, canal_depth=100, barangay=self.barangay)
        self.assertEqual(result['status'], 'Normal')
        self.assertEqual(result['condition'], 'Unknown')

    def test_warning_at_unknown_tier(self):
        result = classify_water_level(water_level=55, canal_depth=100, barangay=self.barangay)
        self.assertEqual(result['status'], 'Warning')

    def test_critical_at_unknown_tier(self):
        result = classify_water_level(water_level=85, canal_depth=100, barangay=self.barangay)
        self.assertEqual(result['status'], 'Critical')

    def test_rainfall_tier_lowers_the_bar(self):
        RainfallCondition.objects.create(
            barangay=self.barangay, rainfall_mm_hr=35, condition='Red'
        )
        # 55% would be Warning at 'None' tier (50/80), but 'Red' tier is 20/50 -> Critical
        result = classify_water_level(water_level=55, canal_depth=100, barangay=self.barangay)
        self.assertEqual(result['status'], 'Critical')
        self.assertEqual(result['condition'], 'Red')

    def test_missing_threshold_row_falls_back_to_none_tier(self):
        RainfallCondition.objects.create(
            barangay=self.barangay, rainfall_mm_hr=10, condition='Yellow'
        )
        AlertThreshold.objects.filter(condition='Yellow').delete()
        result = classify_water_level(water_level=55, canal_depth=100, barangay=self.barangay)
        self.assertEqual(result['status'], 'Warning')  # used 'None' tier's 50/80