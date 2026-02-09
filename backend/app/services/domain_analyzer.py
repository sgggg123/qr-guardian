"""
Domain age and SSL certificate analysis service.
Provides additional risk signals based on domain characteristics.
"""
import ssl
import socket
from datetime import datetime, timedelta
from typing import Optional, Tuple
from urllib.parse import urlparse
import httpx


class DomainAnalyzer:
    """Analyzes domain characteristics for risk assessment."""

    # SSL Certificate issuer trust levels
    TRUSTED_ISSUERS = {
        "DigiCert": 100,
        "GlobalSign": 100,
        "Comodo": 95,
        "Sectigo": 95,
        "GoDaddy": 90,
        "Amazon": 90,
        "Google Trust Services": 85,
        "Cloudflare": 85,
        "Let's Encrypt": 60,  # Free, commonly used by phishing
    }

    async def analyze_domain(self, url: str) -> dict:
        """
        Comprehensive domain analysis.
        Returns domain age, SSL info, and risk indicators.
        """
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]

        result = {
            "domain": domain,
            "ssl_info": None,
            "domain_age_days": None,
            "risk_factors": [],
            "trust_score": 100,  # Start at 100, subtract for risks
        }

        # Analyze SSL certificate
        if parsed.scheme == "https":
            ssl_info = await self._get_ssl_info(domain)
            if ssl_info:
                result["ssl_info"] = ssl_info
                result["trust_score"] = self._adjust_score_for_ssl(
                    result["trust_score"], ssl_info, result["risk_factors"]
                )

        # Check domain age via WHOIS (primary), fall back to SSL cert date
        whois_age = self._get_whois_age(domain)
        if whois_age is not None:
            result["domain_age_days"] = whois_age
        elif result["ssl_info"] and result["ssl_info"].get("valid_from"):
            try:
                valid_from = datetime.fromisoformat(result["ssl_info"]["valid_from"])
                result["domain_age_days"] = (datetime.now() - valid_from).days
            except Exception:
                pass

        # Add risk factors based on domain age
        age_days = result["domain_age_days"]
        if age_days is not None:
            if age_days < 30:
                source = "WHOIS" if whois_age is not None else "인증서"
                result["risk_factors"].append({
                    "type": "new_domain",
                    "message": f"최근 등록된 도메인입니다 ({age_days}일 전, {source} 기준)",
                    "severity": "warning"
                })
                result["trust_score"] -= 20
            elif age_days < 90:
                result["risk_factors"].append({
                    "type": "young_domain",
                    "message": f"비교적 새로운 도메인입니다 ({age_days}일)",
                    "severity": "info"
                })
                result["trust_score"] -= 5

        return result

    def _get_whois_age(self, domain: str) -> Optional[int]:
        """Get domain age in days via WHOIS lookup."""
        try:
            import whois
            w = whois.whois(domain)
            creation_date = w.creation_date
            if creation_date is None:
                return None
            # Some WHOIS results return a list of dates
            if isinstance(creation_date, list):
                creation_date = creation_date[0]
            if isinstance(creation_date, datetime):
                return (datetime.now() - creation_date).days
            return None
        except Exception:
            return None

    async def _get_ssl_info(self, domain: str) -> Optional[dict]:
        """Extract SSL certificate information."""
        try:
            context = ssl.create_default_context()
            with socket.create_connection((domain, 443), timeout=5) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()

            if not cert:
                return None

            # Extract issuer
            issuer_parts = dict(x[0] for x in cert.get("issuer", []))
            issuer_org = issuer_parts.get("organizationName", "Unknown")

            # Extract validity dates
            not_before = cert.get("notBefore", "")
            not_after = cert.get("notAfter", "")

            # Parse dates
            valid_from = None
            valid_until = None
            try:
                if not_before:
                    valid_from = datetime.strptime(not_before, "%b %d %H:%M:%S %Y %Z")
                if not_after:
                    valid_until = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z")
            except Exception:
                pass

            # Calculate trust level
            trust_level = "unknown"
            for issuer_name, score in self.TRUSTED_ISSUERS.items():
                if issuer_name.lower() in issuer_org.lower():
                    if score >= 90:
                        trust_level = "high"
                    elif score >= 70:
                        trust_level = "medium"
                    else:
                        trust_level = "low"
                    break

            return {
                "issuer": issuer_org,
                "valid_from": valid_from.isoformat() if valid_from else None,
                "valid_until": valid_until.isoformat() if valid_until else None,
                "trust_level": trust_level,
                "is_expired": valid_until < datetime.now() if valid_until else False,
                "days_until_expiry": (valid_until - datetime.now()).days if valid_until else None,
            }

        except Exception as e:
            return None

    def _adjust_score_for_ssl(
        self, score: int, ssl_info: dict, risk_factors: list
    ) -> int:
        """Adjust trust score based on SSL certificate characteristics."""

        # Check issuer trust level
        trust_level = ssl_info.get("trust_level", "unknown")
        if trust_level == "low":
            score -= 15
            risk_factors.append({
                "type": "low_trust_issuer",
                "message": f"무료/저신뢰 인증서 발급기관: {ssl_info.get('issuer', 'Unknown')}",
                "severity": "warning"
            })
        elif trust_level == "unknown":
            score -= 10
            risk_factors.append({
                "type": "unknown_issuer",
                "message": f"알 수 없는 인증서 발급기관: {ssl_info.get('issuer', 'Unknown')}",
                "severity": "info"
            })

        # Check expiration
        if ssl_info.get("is_expired"):
            score -= 30
            risk_factors.append({
                "type": "expired_cert",
                "message": "SSL 인증서가 만료되었습니다",
                "severity": "danger"
            })
        elif ssl_info.get("days_until_expiry") and ssl_info["days_until_expiry"] < 30:
            score -= 10
            risk_factors.append({
                "type": "expiring_soon",
                "message": f"인증서가 곧 만료됩니다 ({ssl_info['days_until_expiry']}일 후)",
                "severity": "warning"
            })

        return max(0, score)


domain_analyzer = DomainAnalyzer()
