"""
Unit Tests for Telemetry Metrics and Imbalance CV Calculation
"""

from backend.app.services.metrics_service import MetricsService

def test_coefficient_of_variation_zero_counts():
    assert MetricsService.calculate_imbalance_cv([]) == 0.0
    assert MetricsService.calculate_imbalance_cv([0, 0, 0]) == 0.0

def test_coefficient_of_variation_uniform():
    # Identical request distribution should yield CV near 0
    cv = MetricsService.calculate_imbalance_cv([100, 100, 100])
    assert cv == 0.0

def test_coefficient_of_variation_skewed():
    # High variance should yield high CV
    cv = MetricsService.calculate_imbalance_cv([300, 10, 5])
    assert cv > 1.0
