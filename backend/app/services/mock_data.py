"""
Activity data generator for DevPulse.
Generates realistic GitHub-like developer activity based on work style profile.
Works with any registered developer — not hardcoded.
"""
import random
from datetime import datetime, timedelta
from typing import List
from app.models.schemas import (
    DeveloperActivity, Commit, PRReview, IssueComment
)
from app.services.developer_service import get_all_developers, get_developer_by_id

# ─── Commit message pool ─────────────────────────────────────────────────
COMMIT_MESSAGES = [
    "feat: add user authentication middleware",
    "fix: resolve race condition in cache layer",
    "refactor: extract payment service interface",
    "chore: update CI pipeline for monorepo",
    "docs: add API reference for v2 endpoints",
    "test: add integration tests for order flow",
    "perf: optimize database query for reports",
    "feat: implement real-time notification system",
    "fix: handle edge case in CSV import",
    "refactor: migrate to async/await pattern",
    "feat: add dark mode support across UI",
    "fix: correct timezone handling in scheduler",
    "chore: bump dependencies to latest stable",
    "feat: implement rate limiting middleware",
    "perf: add Redis caching for user sessions",
    "fix: memory leak in websocket handler",
    "feat: add multi-tenant support",
    "refactor: decompose monolith into services",
    "test: increase coverage to 85%",
    "docs: update deployment runbook",
    "feat: add Prometheus metrics endpoint",
    "fix: resolve CORS issue in production",
    "chore: add pre-commit hooks for linting",
    "feat: implement OAuth2 with PKCE flow",
    "perf: lazy-load dashboard components",
]

PR_TITLES = [
    "Add OAuth2 integration with Google",
    "Refactor data pipeline for scalability",
    "Fix critical bug in payment processing",
    "Implement feature flags system",
    "Add comprehensive test suite for API",
    "Migrate from REST to GraphQL",
    "Performance improvements for dashboard",
    "Add accessibility features (WCAG 2.1)",
    "Implement caching layer for search",
    "Add real-time collaboration support",
    "Fix security vulnerability in auth flow",
    "Upgrade database schema for v2",
]

ISSUE_TITLES = [
    "Question: Best practice for error handling",
    "Bug: Login fails on Safari",
    "Discussion: Architecture for microservices",
    "Help needed: Docker configuration",
    "Question: Rate limiting strategy",
    "Bug: Memory usage spikes during batch jobs",
    "Discussion: Moving to event-driven architecture",
    "Help: Debugging production latency spike",
]


def _random_hour(style: str, local_random: Any = None) -> int:
    """Generate working hour based on developer work style."""
    if local_random is None:
        local_random = random
    if style == "night_owl":
        # Evening/night peak: 20:00 - 02:00
        weights = [3,2,1,0,0,0,0,0,1,2,3,4,5,6,7,7,6,5,7,9,10,10,9,7]
    elif style == "early_bird":
        # Morning peak: 06:00 - 12:00
        weights = [0,0,0,0,0,2,7,10,9,8,7,5,4,3,2,2,2,1,1,0,0,0,0,0]
    elif style == "balanced":
        # Standard 9-6 with afternoon dip
        weights = [0,0,0,0,0,0,1,3,7,9,10,8,5,4,7,9,8,6,3,1,0,0,0,0]
    else:  # sporadic
        weights = [local_random.randint(0, 5) for _ in range(24)]

    total  = sum(weights) or 1
    probs  = [w / total for w in weights]
    return local_random.choices(range(24), weights=probs)[0]


def generate_commits(
    developer_id: str,
    style: str,
    burnout_risk: str,
    days: int = 30,
    local_random: Any = None,
) -> List[Commit]:
    if local_random is None:
        local_random = random.Random(developer_id)
    commits = []
    # Anchor to start of day for stable refresh
    base = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days)

    # Burnout pattern: high burnout = many commits, odd hours
    daily_max = 8 if burnout_risk == "high" else 4 if burnout_risk == "medium" else 2
    weekend_skip_prob = 0.75 if burnout_risk != "high" else 0.2

    for d in range(days):
        date = base + timedelta(days=d)
        is_weekend = date.weekday() >= 5

        if is_weekend and local_random.random() < weekend_skip_prob:
            continue

        num = local_random.randint(0, daily_max)
        for _ in range(num):
            hour = _random_hour(style, local_random)
            ts   = date.replace(hour=hour, minute=local_random.randint(0, 59), second=0)
            commits.append(Commit(
                sha           = f"{developer_id}_{d}_{_}_{local_random.randint(1000, 9999)}",
                message       = local_random.choice(COMMIT_MESSAGES),
                timestamp     = ts,
                additions     = local_random.randint(5, 400),
                deletions     = local_random.randint(0, 150),
                files_changed = local_random.randint(1, 15),
                hour_of_day   = hour,
            ))
    return commits


def generate_pr_reviews(
    developer_id: str,
    burnout_risk: str,
    days: int = 30,
    local_random: Any = None,
) -> List[PRReview]:
    if local_random is None:
        local_random = random.Random(developer_id)
    reviews = []
    base  = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days)
    count = (
        local_random.randint(18, 30) if burnout_risk == "high"
        else local_random.randint(8, 18) if burnout_risk == "medium"
        else local_random.randint(3, 10)
    )

    for i in range(count):
        ts = base + timedelta(
            days    = local_random.randint(0, days - 1),
            hours   = local_random.randint(9, 20),
            minutes = local_random.randint(0, 59),
        )
        reviews.append(PRReview(
            pr_id              = f"PR-{local_random.randint(100, 999)}",
            pr_title           = local_random.choice(PR_TITLES),
            review_type        = local_random.choice(["approved", "changes_requested", "commented"]),
            timestamp          = ts,
            comments_count     = local_random.randint(1, 15),
            time_spent_minutes = local_random.randint(10, 90),
        ))
    return reviews


def generate_issue_comments(
    developer_id: str,
    days: int = 30,
    local_random: Any = None,
) -> List[IssueComment]:
    if local_random is None:
        local_random = random.Random(developer_id)
    comments = []
    base  = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days)
    count = local_random.randint(5, 22)

    for i in range(count):
        ts = base + timedelta(
            days  = local_random.randint(0, days - 1),
            hours = local_random.randint(10, 18),
        )
        comments.append(IssueComment(
            issue_id          = f"ISS-{local_random.randint(50, 500)}",
            issue_title       = local_random.choice(ISSUE_TITLES),
            timestamp         = ts,
            is_helping_others = local_random.random() > 0.3,
        ))
    return comments


def generate_developer_activity(
    developer_id: str | None = None,
    days: int = 30,
) -> DeveloperActivity:
    """Generate a full developer activity bundle for any registered developer."""
    # Look up from dynamic registry first
    dev_info = get_developer_by_id(developer_id) if developer_id else None

    if not dev_info:
        # If not found, fall back to first available
        all_devs = get_all_developers()
        dev_info = all_devs[0] if all_devs else {
            "id":           developer_id or "dev_unknown",
            "name":         "Unknown Developer",
            "style":        "balanced",
            "burnout_risk": "medium",
        }

    local_random = random.Random(dev_info["id"])
    now     = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    commits = generate_commits(dev_info["id"], dev_info["style"], dev_info["burnout_risk"], days, local_random)
    reviews = generate_pr_reviews(dev_info["id"], dev_info["burnout_risk"], days, local_random)
    comments= generate_issue_comments(dev_info["id"], days, local_random)

    visible_hours = len(commits) * 0.5
    total_hours   = visible_hours + sum(r.time_spent_minutes for r in reviews) / 60

    return DeveloperActivity(
        developer_id     = dev_info["id"],
        developer_name   = dev_info["name"],
        period_start     = now - timedelta(days=days),
        period_end       = now,
        commits          = commits,
        pr_reviews       = reviews,
        issue_comments   = comments,
        raw_hours_logged = round(total_hours, 1),
    )
