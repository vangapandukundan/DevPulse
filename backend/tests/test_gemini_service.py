"""
Unit tests for gemini_service helper methods.
Only tests pure/static methods that don't require a live API key.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import unittest
from unittest.mock import patch, MagicMock


class TestExtractJson(unittest.TestCase):
    """Tests for GeminiService._extract_json() — a pure text-parsing function."""

    def setUp(self):
        # Patch settings to avoid requiring a real GEMINI_API_KEY at import time
        with patch.dict("os.environ", {
            "GEMINI_API_KEY": "fake_key",
            "MONGODB_URL": "mongodb://localhost:27017",
        }):
            from app.services.gemini_service import GeminiService
            self.svc = GeminiService()

    def test_extracts_json_from_markdown_fence(self):
        text = '```json\n{"key": "value", "num": 42}\n```'
        result = self.svc._extract_json(text)
        self.assertEqual(result, {"key": "value", "num": 42})

    def test_extracts_json_from_bare_fence(self):
        text = '```\n{"key": "bare"}\n```'
        result = self.svc._extract_json(text)
        self.assertEqual(result, {"key": "bare"})

    def test_extracts_inline_json(self):
        text = 'Here is the result: {"burnout_score": 55, "risk_level": "MEDIUM"}'
        result = self.svc._extract_json(text)
        self.assertEqual(result["burnout_score"], 55)
        self.assertEqual(result["risk_level"], "MEDIUM")

    def test_returns_empty_dict_for_empty_string(self):
        result = self.svc._extract_json("")
        self.assertEqual(result, {})

    def test_returns_empty_dict_for_invalid_json(self):
        result = self.svc._extract_json("this is not json at all")
        self.assertEqual(result, {})

    def test_handles_nested_json(self):
        text = '{"actions": [{"type": "calendar_block", "priority": 1}]}'
        result = self.svc._extract_json(text)
        self.assertIn("actions", result)
        self.assertEqual(result["actions"][0]["type"], "calendar_block")


class TestHeuristicAnalysis(unittest.TestCase):
    """Tests for GeminiService._heuristic_analysis() fallback."""

    def setUp(self):
        with patch.dict("os.environ", {
            "GEMINI_API_KEY": "fake_key",
            "MONGODB_URL": "mongodb://localhost:27017",
        }):
            from app.services.gemini_service import GeminiService
            self.svc = GeminiService()

    def _make_summary(self, late: int, weekend: int, total: int, reviews: int, helpers: int):
        return {
            "commits": {
                "total": total,
                "late_night_22_5am": late,
                "weekend": weekend,
                "hour_distribution": {"10": total},
            },
            "pr_reviews": {
                "total": reviews,
                "total_minutes": reviews * 30,
                "avg_comments": 2.5,
            },
            "mentoring": {
                "issue_comments": helpers,
                "helping_others": helpers,
            },
        }

    def test_high_late_commits_raises_burnout(self):
        summary = self._make_summary(late=30, weekend=15, total=40, reviews=2, helpers=1)
        result = self.svc._heuristic_analysis(summary, MagicMock())
        self.assertGreater(result["burnout_score"], 50)

    def test_zero_late_commits_low_burnout(self):
        summary = self._make_summary(late=0, weekend=0, total=10, reviews=2, helpers=1)
        result = self.svc._heuristic_analysis(summary, MagicMock())
        self.assertLessEqual(result["burnout_score"], 30)

    def test_result_has_required_keys(self):
        summary = self._make_summary(late=3, weekend=2, total=20, reviews=4, helpers=2)
        result = self.svc._heuristic_analysis(summary, MagicMock())
        for key in ["invisible_work", "skills_detected", "productivity_score",
                    "burnout_score", "peak_hours", "insights"]:
            self.assertIn(key, result)

    def test_burnout_score_clamped_to_100(self):
        """Even extreme data should not exceed 100."""
        summary = self._make_summary(late=200, weekend=200, total=200, reviews=0, helpers=0)
        result = self.svc._heuristic_analysis(summary, MagicMock())
        self.assertLessEqual(result["burnout_score"], 100)


if __name__ == "__main__":
    unittest.main()
