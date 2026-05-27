"""
Unit tests for github_service.calculate_metrics()
and _get_fallback_data() — pure/deterministic functions.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Mock settings before importing the module
import unittest
from unittest.mock import patch, MagicMock


class TestCalculateMetrics(unittest.TestCase):
    """Tests for the pure calculate_metrics() function."""

    def _make_commit(self, hour: int, weekday: int = 1) -> dict:
        """Helper: build a fake commit dict for a given hour."""
        from datetime import datetime, timezone
        # Build a datetime on a weekday (Mon=0, Sun=6)
        # Use 2024-01-08 = Monday as anchor
        from datetime import timedelta
        base = datetime(2024, 1, 8, hour, 0, 0, tzinfo=timezone.utc)
        delta = timedelta(days=weekday)
        ts = (base + delta).isoformat().replace("+00:00", "Z")
        return {"sha": f"abc{hour}", "message": "test commit", "timestamp": ts}

    def test_burnout_score_zero_commits(self):
        """No commits → burnout score is 0."""
        with patch.dict("os.environ", {"GITHUB_TOKEN": "fake"}):
            from app.github_service import calculate_metrics
        result = calculate_metrics("user", [], 0, [], [], 0)
        self.assertEqual(result["burnout_score"], 0.0)

    def test_burnout_score_high_late_night(self):
        """All late-night commits → high burnout score."""
        with patch.dict("os.environ", {"GITHUB_TOKEN": "fake"}):
            from app.github_service import calculate_metrics
        # 10 commits all at hour 23 (late night), all on weekdays
        commits = [self._make_commit(23, weekday=i % 5) for i in range(10)]
        result = calculate_metrics("user", commits, 0, [], ["Python"], 1)
        # Late night ratio = 1.0 → 40% weight, all weekday = 0% weekend weight
        # burnout = 1.0*40 + 0*35 + min(10/50,1)*25 = 40 + 0 + 5 = 45
        self.assertGreater(result["burnout_score"], 30)

    def test_productivity_score_clamped(self):
        """Productivity score stays within 0–100."""
        with patch.dict("os.environ", {"GITHUB_TOKEN": "fake"}):
            from app.github_service import calculate_metrics
        commits = [self._make_commit(10, weekday=i % 5) for i in range(100)]
        result = calculate_metrics("user", commits, 20, [], ["Python", "JS"], 3)
        self.assertGreaterEqual(result["productivity_score"], 0)
        self.assertLessEqual(result["productivity_score"], 100)

    def test_peak_hours_returned(self):
        """Peak hours should contain the most-committed hours."""
        with patch.dict("os.environ", {"GITHUB_TOKEN": "fake"}):
            from app.github_service import calculate_metrics
        # 5 commits at hour 10, 3 at hour 14
        commits = (
            [self._make_commit(10, weekday=i % 5) for i in range(5)] +
            [self._make_commit(14, weekday=i % 5) for i in range(3)]
        )
        result = calculate_metrics("user", commits, 0, [], [], 1)
        self.assertIn(10, result["peak_hours"])

    def test_invisible_work_hours_formula(self):
        """invisible_work_hours = pr_reviews * 1.5 + commits * 0.1"""
        with patch.dict("os.environ", {"GITHUB_TOKEN": "fake"}):
            from app.github_service import calculate_metrics
        commits = [self._make_commit(10) for _ in range(10)]
        result = calculate_metrics("user", commits, 4, [], [], 0)
        expected = round(4 * 1.5 + 10 * 0.1, 1)
        self.assertAlmostEqual(result["invisible_work_hours"], expected, places=1)

    def test_fallback_data_shape(self):
        """_get_fallback_data() always returns the required keys."""
        with patch.dict("os.environ", {"GITHUB_TOKEN": "fake"}):
            from app.github_service import _get_fallback_data
        result = _get_fallback_data("test_user")
        required_keys = [
            "username", "total_commits", "late_night_commits", "weekend_commits",
            "burnout_score", "productivity_score", "peak_hours", "skills",
            "invisible_work_hours", "invisible_work_items", "repos_active",
            "hour_distribution", "commits",
        ]
        for key in required_keys:
            self.assertIn(key, result, f"Missing key: {key}")

    def test_fallback_data_deterministic(self):
        """_get_fallback_data() is seeded so same username → same result."""
        with patch.dict("os.environ", {"GITHUB_TOKEN": "fake"}):
            from app.github_service import _get_fallback_data
        r1 = _get_fallback_data("alice")
        r2 = _get_fallback_data("alice")
        self.assertEqual(r1["total_commits"], r2["total_commits"])
        self.assertEqual(r1["burnout_score"], r2["burnout_score"])


if __name__ == "__main__":
    unittest.main()
