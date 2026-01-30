import httpx
from urllib.parse import urlparse
from typing import Tuple, List
from app.core.config import settings


class RedirectHop:
    """Represents a single hop in the redirect chain."""
    def __init__(self, url: str, status_code: int, domain: str):
        self.url = url
        self.status_code = status_code
        self.domain = domain

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "status_code": self.status_code,
            "domain": self.domain
        }


class URLAnalyzer:
    def __init__(self):
        self.shortener_domains = settings.SHORTENER_DOMAINS
        self.max_redirects = settings.MAX_REDIRECTS
        self.timeout = settings.REQUEST_TIMEOUT

    def is_shortened_url(self, url: str) -> bool:
        """Check if URL is from a known URL shortener."""
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        # Remove www. prefix if present
        if domain.startswith("www."):
            domain = domain[4:]
        return domain in self.shortener_domains

    async def resolve_redirects(self, url: str) -> Tuple[str, int]:
        """Follow redirects and return final URL with redirect count."""
        final_url, _, redirect_count = await self.resolve_redirects_with_chain(url)
        return final_url, redirect_count

    async def resolve_redirects_with_chain(self, url: str) -> Tuple[str, List[dict], int]:
        """Follow redirects and return final URL, full chain, and redirect count."""
        final_url = url
        redirect_chain: List[dict] = []
        redirect_count = 0

        # Add initial URL to chain
        initial_domain = urlparse(url).netloc.lower()
        redirect_chain.append({
            "url": url,
            "status_code": 0,  # Initial request
            "domain": initial_domain
        })

        try:
            async with httpx.AsyncClient(
                follow_redirects=False,
                timeout=self.timeout
            ) as client:
                current_url = url
                for _ in range(self.max_redirects):
                    try:
                        response = await client.head(
                            current_url,
                            follow_redirects=False
                        )
                        if response.status_code in (301, 302, 303, 307, 308):
                            location = response.headers.get("location")
                            if location:
                                # Handle relative URLs
                                if location.startswith("/"):
                                    parsed = urlparse(current_url)
                                    location = f"{parsed.scheme}://{parsed.netloc}{location}"

                                current_url = location
                                redirect_count += 1
                                final_url = current_url

                                # Add to chain
                                domain = urlparse(current_url).netloc.lower()
                                redirect_chain.append({
                                    "url": current_url,
                                    "status_code": response.status_code,
                                    "domain": domain
                                })
                            else:
                                break
                        else:
                            final_url = current_url
                            # Update last entry with final status
                            if redirect_chain:
                                redirect_chain[-1]["status_code"] = response.status_code
                            break
                    except httpx.RequestError:
                        break
        except Exception:
            pass

        return final_url, redirect_chain, redirect_count

    def extract_domain_info(self, url: str) -> dict:
        """Extract domain information from URL."""
        parsed = urlparse(url)
        domain = parsed.netloc.lower()

        # Remove www. prefix
        if domain.startswith("www."):
            domain = domain[4:]

        # Extract TLD
        parts = domain.split(".")
        tld = f".{parts[-1]}" if len(parts) > 1 else ""

        # Check for IP address
        is_ip = self._is_ip_address(domain)

        # Check for suspicious port
        port = parsed.port
        uses_suspicious_port = port is not None and port not in (80, 443)

        return {
            "domain": domain,
            "tld": tld,
            "is_ip": is_ip,
            "uses_suspicious_port": uses_suspicious_port,
            "path": parsed.path,
            "query": parsed.query,
            "scheme": parsed.scheme
        }

    def _is_ip_address(self, domain: str) -> bool:
        """Check if domain is an IP address."""
        # Remove port if present
        if ":" in domain:
            domain = domain.split(":")[0]

        parts = domain.split(".")
        if len(parts) == 4:
            try:
                return all(0 <= int(part) <= 255 for part in parts)
            except ValueError:
                pass
        return False


url_analyzer = URLAnalyzer()
