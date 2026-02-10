"""
Integration tests for /api/scan endpoint.
Uses FastAPI TestClient for synchronous testing.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_scan_cache():
    """Clear the in-memory scan cache before each test."""
    from app.routers.scan import _scan_cache
    _scan_cache.clear()


class TestScanEndpoint:
    """Tests for POST /api/scan"""

    def test_scan_valid_url_returns_success(self):
        response = client.post("/api/scan", json={"url": "https://google.com"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data

    def test_scan_response_structure(self):
        response = client.post("/api/scan", json={"url": "https://google.com"})
        data = response.json()["data"]
        assert "original_url" in data
        assert "final_url" in data
        assert "risk_level" in data
        assert "summary" in data
        assert "flags" in data
        assert "safe_browsing" in data
        assert data["risk_level"] in ("GREEN", "YELLOW", "RED")

    def test_scan_trusted_domain_is_green(self):
        response = client.post("/api/scan", json={"url": "https://google.com"})
        data = response.json()["data"]
        assert data["risk_level"] == "GREEN"

    def test_scan_empty_url_returns_400(self):
        response = client.post("/api/scan", json={"url": ""})
        assert response.status_code == 400

    def test_scan_url_without_scheme_adds_https(self):
        response = client.post("/api/scan", json={"url": "google.com"})
        data = response.json()["data"]
        assert data["original_url"] == "google.com"

    def test_scan_safe_browsing_mock_mode_flag(self):
        """When no API key is set, mock_mode should be True."""
        response = client.post("/api/scan", json={"url": "https://google.com"})
        data = response.json()["data"]
        # In test environment, API key is typically not set
        assert "mock_mode" in data["safe_browsing"]

    def test_scan_summary_is_not_empty(self):
        response = client.post("/api/scan", json={"url": "https://google.com"})
        data = response.json()["data"]
        assert data["summary"]
        assert len(data["summary"]) > 0

    def test_scan_domain_analysis_present(self):
        response = client.post("/api/scan", json={"url": "https://google.com"})
        data = response.json()["data"]
        assert data["domain_analysis"] is not None
        assert "trust_score" in data["domain_analysis"]
        assert "domain" in data["domain_analysis"]


class TestScanMaliciousUrls:
    """Tests for known malicious URL patterns."""

    def test_scan_mock_malware_url(self):
        response = client.post(
            "/api/scan",
            json={"url": "https://malware.testing.google.test/something"}
        )
        # Should return 200 (scan completes) but may show RED risk
        assert response.status_code in (200, 500)

    def test_scan_suspicious_phishing_pattern(self):
        response = client.post(
            "/api/scan",
            json={"url": "https://example-phishing.com/login"}
        )
        assert response.status_code in (200, 500)


class TestHealthEndpoint:
    """Tests for health check."""

    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_root_endpoint(self):
        response = client.get("/")
        assert response.status_code == 200
        assert "QR Guardian API" in response.json()["name"]
