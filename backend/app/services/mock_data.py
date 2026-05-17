"""
Realistic mock data generator for DevPulse demo mode.
Generates GitHub-like developer activity data with varied patterns.
"""
import random
from datetime import datetime, timedelta
from typing import List
from app.models.schemas import (
    DeveloperActivity, Commit, PRReview, IssueComment
)

#  Seed developers 

DEVELOPERS = [
    {"id": "dev_001", "name": "Anika Sharma",    "style": "night_owl",   "burnout_risk": "high"},
    {"id": "dev_002", "name": "Marcus Chen",     "style": "early_bird",  "burnout_risk": "low"},
    {"id": "dev_003", "name": "Priya Nair",      "style": "balanced",    "burnout_risk": "medium"},
    {"id": "dev_004", "name": "Jordan Williams", "style": "sporadic",    "burnout_risk": "high"},
]

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
    "feat: add dark mode support",
    "fix: correct timezone handling in scheduler",
    "chore: bump dependencies to latest",
    "feat: implement rate limiting middleware",
    "perf: add Redis caching for user sessions",
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
]

ISSUE_TITLES = [
    "Question: Best practice for error handling",
    "Bug: Login fails on Safari",
    "Discussion: Architecture for microservices",
    "Help needed: Docker configuration",
    "Question: Rate limiting strategy",
]


def _random_hour(style: str) -> int:
    """Generate working hour based on developer style."""
    if style == "night_owl":
        weights = [0]*8 + [1,1,2,3,5,7,9,10,10,8,6,4,3,5,8,10]  # evening peak
    elif style == "early_bird":
        weights = [0]*5 + [5,9,10,8,6,4,3,2,2,2,1,1,1,1,0,0,0,0,0]
    elif style == "balanced":
        weights = [0]*9 + [7,9,10,8,5,4,6,8,7,4,2,1,0,0,0]
    else:  # sporadic
        weights = [random.randint(0,5) for _ in range(24)]
    # normalize
    total = sum(weights) or 1
    probs = [w/total for w in weights]
    return random.choices(range(24), weights=probs)[0]


def generate_commits(
    developer_id: str,
    style: str,
    burnout_risk: str,
    days: int = 30,
) -> List[Commit]:
    commits = []
    base = datetime.utcnow() - timedelta(days=days)

    # Burnout pattern: too many commits / late nights
    daily_max = 8 if burnout_risk == "high" else 4 if burnout_risk == "medium" else 2

    for d in range(days):
        date = base + timedelta(days=d)
        # Weekend reduction
        if date.weekday() >= 5 and burnout_risk != "high":
            if random.random() < 0.7:
                continue

        num_commits = random.randint(0, daily_max)
        for _ in range(num_commits):
            hour = _random_hour(style)
            ts = date.replace(hour=hour, minute=random.randint(0, 59), second=0)
            commits.append(Commit(
                sha=f"{developer_id}_{d}_{_}_{random.randint(1000,9999)}",
                message=random.choice(COMMIT_MESSAGES),
                timestamp=ts,
                additions=random.randint(5, 400),
                deletions=random.randint(0, 150),
                files_changed=random.randint(1, 15),
                hour_of_day=hour,
            ))
    return commits


def generate_pr_reviews(
    developer_id: str,
    burnout_risk: str,
    days: int = 30,
) -> List[PRReview]:
    reviews = []
    base = datetime.utcnow() - timedelta(days=days)
    # High-burnout devs often do more reviews (invisible work)
    count = random.randint(15, 30) if burnout_risk == "high" else random.randint(5, 15)

    for i in range(count):
        ts = base + timedelta(
            days=random.randint(0, days - 1),
            hours=random.randint(9, 20),
            minutes=random.randint(0, 59),
        )
        reviews.append(PRReview(
            pr_id=f"PR-{random.randint(100, 999)}",
            pr_title=random.choice(PR_TITLES),
            review_type=random.choice(["approved", "changes_requested", "commented"]),
            timestamp=ts,
            comments_count=random.randint(1, 12),
            time_spent_minutes=random.randint(10, 90),
        ))
    return reviews


def generate_issue_comments(
    developer_id: str,
    days: int = 30,
) -> List[IssueComment]:
    comments = []
    base = datetime.utcnow() - timedelta(days=days)
    count = random.randint(5, 20)

    for i in range(count):
        ts = base + timedelta(
            days=random.randint(0, days - 1),
            hours=random.randint(10, 18),
        )
        comments.append(IssueComment(
            issue_id=f"ISS-{random.randint(50, 500)}",
            issue_title=random.choice(ISSUE_TITLES),
            timestamp=ts,
            is_helping_others=random.random() > 0.3,
        ))
    return comments


def generate_developer_activity(
    developer_id: str | None = None,
    days: int = 30,
) -> DeveloperActivity:
    """Generate a full developer activity bundle."""
    dev_info = next(
        (d for d in DEVELOPERS if d["id"] == developer_id),
        random.choice(DEVELOPERS),
    )

    now = datetime.utcnow()
    commits = generate_commits(
        dev_info["id"], dev_info["style"], dev_info["burnout_risk"], days
    )
    reviews = generate_pr_reviews(dev_info["id"], dev_info["burnout_risk"], days)
    comments = generate_issue_comments(dev_info["id"], days)

    # Simulate hours logged (visible vs invisible gap)
    visible_hours = len(commits) * 0.5
    total_hours = visible_hours + sum(r.time_spent_minutes for r in reviews) / 60

    return DeveloperActivity(
        developer_id=dev_info["id"],
        developer_name=dev_info["name"],
        period_start=now - timedelta(days=days),
        period_end=now,
        commits=commits,
        pr_reviews=reviews,
        issue_comments=comments,
        raw_hours_logged=round(total_hours, 1),
    )


def get_all_developers() -> list[dict]:
    return DEVELOPERS
