#!/usr/bin/env python3
"""Simple integration test for CampusPulse API.

Tests core endpoints and validates responses. Useful for CI/CD and
post-deployment verification.

Usage:
  python backend/test_api.py [--url http://localhost:5001]
"""

import sys
import time
import json
import requests
from pathlib import Path

BASE_URL = "http://localhost:5001"


def test_health():
    """Test that server is running."""
    print("Testing health...")
    try:
        r = requests.get(f"{BASE_URL}/", timeout=5)
        assert r.status_code == 200, f"Got {r.status_code}"
        print("  ✓ Server is running")
        return True
    except Exception as e:
        print(f"  ✗ Server health check failed: {e}")
        return False


def test_login():
    """Test login endpoint."""
    print("Testing login...")
    try:
        r = requests.post(
            f"{BASE_URL}/api/login",
            json={"username": "student", "password": "student123"},
            timeout=5
        )
        assert r.status_code == 200, f"Got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("user"), "No user in response"
        user_id = data["user"]["id"]
        print(f"  ✓ Login successful (user_id: {user_id})")
        return user_id
    except Exception as e:
        print(f"  ✗ Login failed: {e}")
        return None


def test_meta(user_id):
    """Test metadata endpoint."""
    print("Testing metadata...")
    try:
        headers = {"x-user-id": user_id}
        r = requests.get(f"{BASE_URL}/api/meta", headers=headers, timeout=5)
        assert r.status_code == 200, f"Got {r.status_code}"
        data = r.json()
        assert data.get("campusCategories"), "No categories"
        assert data.get("statuses"), "No statuses"
        print(f"  ✓ Metadata OK ({len(data['campusCategories'])} categories)")
        return True
    except Exception as e:
        print(f"  ✗ Metadata failed: {e}")
        return False


def test_list_issues(user_id):
    """Test issue listing."""
    print("Testing issue listing...")
    try:
        headers = {"x-user-id": user_id}
        r = requests.get(f"{BASE_URL}/api/issues", headers=headers, timeout=5)
        assert r.status_code == 200, f"Got {r.status_code}"
        data = r.json()
        assert isinstance(data.get("issues"), list), "Issues not a list"
        print(f"  ✓ Found {len(data['issues'])} issues")
        return True
    except Exception as e:
        print(f"  ✗ Issue listing failed: {e}")
        return False


def test_stats(user_id):
    """Test stats endpoint."""
    print("Testing stats...")
    try:
        headers = {"x-user-id": user_id}
        r = requests.get(f"{BASE_URL}/api/stats", headers=headers, timeout=5)
        assert r.status_code == 200, f"Got {r.status_code}"
        data = r.json()
        assert "total" in data, "No total in stats"
        print(f"  ✓ Stats: {data.get('total')} total, {data.get('Resolved', 0)} resolved")
        return True
    except Exception as e:
        print(f"  ✗ Stats failed: {e}")
        return False


def test_create_issue(user_id):
    """Test issue creation."""
    print("Testing issue creation...")
    try:
        headers = {"x-user-id": user_id}
        payload = {
            "title": "Test Issue — Automated Test Run",
            "description": "This is a test issue created by the automated test suite. It should be automatically cleaned up on next seed.",
            "category": "Other",
            "location": "Test Lab"
        }
        r = requests.post(
            f"{BASE_URL}/api/issues",
            json=payload,
            headers=headers,
            timeout=10
        )
        assert r.status_code == 201, f"Got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("issue"), "No issue in response"
        issue_id = data["issue"]["id"]
        print(f"  ✓ Issue created (id: {issue_id})")
        return issue_id
    except Exception as e:
        print(f"  ✗ Issue creation failed: {e}")
        return None


def main():
    """Run all tests."""
    url = BASE_URL
    if len(sys.argv) > 2 and sys.argv[1] == "--url":
        url = sys.argv[2]
        globals()["BASE_URL"] = url

    print(f"\n🧪 CampusPulse Integration Tests")
    print(f"   Target: {url}\n")

    # Wait for server to be ready
    for attempt in range(5):
        try:
            requests.head(url, timeout=2)
            break
        except requests.ConnectionError:
            if attempt < 4:
                print(f"  Waiting for server ({attempt + 1}/5)...")
                time.sleep(1)

    results = []

    # Run tests
    results.append(("Health", test_health()))

    user_id = test_login()
    results.append(("Login", user_id is not None))

    if user_id:
        results.append(("Metadata", test_meta(user_id)))
        results.append(("List Issues", test_list_issues(user_id)))
        results.append(("Stats", test_stats(user_id)))
        results.append(("Create Issue", test_create_issue(user_id) is not None))

    # Summary
    print("\n" + "=" * 50)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"Results: {passed}/{total} tests passed\n")

    if passed == total:
        print("✓ All tests passed!")
        return 0
    else:
        print("✗ Some tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
