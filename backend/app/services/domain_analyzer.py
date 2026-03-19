"""
Domain age and SSL certificate analysis service.
Provides additional risk signals based on domain characteristics.

Risk scoring: 0.0 ~ 10.0 (higher = riskier)
"""
import asyncio
import ssl
import socket
from datetime import datetime, timedelta
from typing import Optional, Tuple
from urllib.parse import urlparse
import httpx
from app.core.config import settings


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
        "Google Trust Services": 95,
        "Cloudflare": 90,
        "Microsoft": 90,
        "IdenTrust": 85,
        "Entrust": 90,
        "Thawte": 85,
        "GeoTrust": 85,
        "Baltimore": 85,
        "Let's Encrypt": 80,
        "ZeroSSL": 70,
    }

    def _is_trusted_domain(self, domain: str) -> bool:
        """Check if domain is in the trusted list."""
        clean = domain.lower()
        if clean.startswith("www."):
            clean = clean[4:]
        for trusted in settings.TRUSTED_DOMAINS:
            if clean == trusted or clean.endswith("." + trusted):
                return True
        return False

    async def analyze_domain(self, url: str) -> dict:
        """
        Comprehensive domain analysis.
        Returns domain age, SSL info, risk indicators,
        plus new risk_score (0-10) and risk_breakdown.
        """
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        # Strip port number if present (e.g. 125.42.232.134:43575 → 125.42.232.134)
        if ":" in domain:
            domain = domain.split(":")[0]

        is_trusted = self._is_trusted_domain(domain)

        result = {
            "domain": domain,
            "ssl_info": None,
            "domain_age_days": None,
            "risk_factors": [],
            "trust_score": 100,  # Legacy: start at 100, subtract for risks
            "risk_score": 0.0,   # New: 0-10, add for risks
            "risk_breakdown": [],  # New: list of {"factor", "score", "reason"}
        }

        # Trusted domains get score 0 immediately
        if is_trusted:
            result["risk_breakdown"].append({
                "factor": "trusted_domain",
                "score": 0.0,
                "reason": "신뢰할 수 있는 도메인 목록에 등록된 사이트입니다",
            })
            # Still gather SSL info for display
            if parsed.scheme == "https":
                ssl_info = await self._get_ssl_info(domain)
                if ssl_info:
                    result["ssl_info"] = ssl_info
            whois_age = self._get_whois_age(domain)
            if whois_age is not None:
                result["domain_age_days"] = whois_age
            return result

        # --- SSL analysis ---
        ssl_risk = 0.0
        ssl_reason = "정상 SSL 인증서"
        whois_failed = False

        if parsed.scheme == "https":
            ssl_info = await self._get_ssl_info(domain)
            if ssl_info:
                result["ssl_info"] = ssl_info
                # Legacy scoring
                result["trust_score"] = self._adjust_score_for_ssl(
                    result["trust_score"], ssl_info, result["risk_factors"]
                )
                # New risk scoring for SSL
                if ssl_info.get("is_expired"):
                    ssl_risk = 2.0
                    ssl_reason = "SSL 인증서가 만료되었습니다"
                elif ssl_info.get("trust_level") in ("low", "unknown"):
                    ssl_risk = 2.0
                    ssl_reason = f"저신뢰 인증서 발급기관: {ssl_info.get('issuer', 'Unknown')}"
                elif ssl_info.get("days_until_expiry") and ssl_info["days_until_expiry"] < 30:
                    ssl_risk = 1.0
                    ssl_reason = f"인증서가 곧 만료됩니다 ({ssl_info['days_until_expiry']}일 후)"
                else:
                    ssl_risk = 0.0
                    ssl_reason = "정상 SSL 인증서"
        else:
            # HTTP (no SSL)
            ssl_risk = 3.0
            ssl_reason = "HTTPS를 사용하지 않는 사이트입니다"

        result["risk_breakdown"].append({
            "factor": "ssl",
            "score": ssl_risk,
            "reason": ssl_reason,
        })

        # --- WHOIS domain age ---
        whois_age = self._get_whois_age(domain)
        age_risk = 0.0
        age_reason = ""

        if whois_age is not None:
            result["domain_age_days"] = whois_age
            if whois_age < 30:
                age_risk = 4.0
                age_reason = f"최근 등록된 도메인입니다 ({whois_age}일 전)"
                result["risk_factors"].append({
                    "type": "new_domain",
                    "message": f"최근 등록된 도메인입니다 ({whois_age}일 전, WHOIS 기준)",
                    "severity": "warning"
                })
                result["trust_score"] -= 20
            elif whois_age < 90:
                age_risk = 2.0
                age_reason = f"비교적 새로운 도메인입니다 ({whois_age}일)"
                result["risk_factors"].append({
                    "type": "young_domain",
                    "message": f"비교적 새로운 도메인입니다 ({whois_age}일)",
                    "severity": "info"
                })
                result["trust_score"] -= 5
            elif whois_age < 365:
                age_risk = 1.0
                age_reason = f"1년 미만의 도메인입니다 ({whois_age}일)"
            else:
                age_risk = 0.0
                age_reason = f"오래된 도메인입니다 ({whois_age}일)"
        else:
            # WHOIS lookup failed
            whois_failed = True
            age_reason = "WHOIS 조회 실패"

        result["risk_breakdown"].append({
            "factor": "domain_age",
            "score": age_risk,
            "reason": age_reason,
        })

        # --- WHOIS failure penalty ---
        whois_fail_risk = 1.0 if whois_failed else 0.0
        result["risk_breakdown"].append({
            "factor": "whois_failure",
            "score": whois_fail_risk,
            "reason": "WHOIS 정보를 조회할 수 없습니다" if whois_failed else "WHOIS 조회 성공",
        })

        # Calculate total risk_score (sum of breakdown, capped at 10)
        result["risk_score"] = min(
            10.0,
            round(sum(item["score"] for item in result["risk_breakdown"]), 1)
        )

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
        """Extract SSL certificate information using async I/O."""
        try:
            ssl_context = ssl.create_default_context()
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(domain, 443, ssl=ssl_context, server_hostname=domain),
                timeout=5,
            )
            ssl_object = writer.get_extra_info("ssl_object")
            cert = ssl_object.getpeercert() if ssl_object else None
            writer.close()
            await writer.wait_closed()

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

            # Calculate trust level based on issuer
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
        """Adjust trust score based on SSL certificate characteristics (legacy)."""

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
