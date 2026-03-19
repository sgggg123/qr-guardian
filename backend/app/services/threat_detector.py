import re
import httpx
from typing import List, Tuple
from urllib.parse import urlparse
from difflib import SequenceMatcher
from app.core.config import settings
from app.models.schemas import Flag, Severity, InfoRequirement, InfoRequirementLevel


class ThreatDetector:
    def __init__(self):
        self.suspicious_tlds = settings.SUSPICIOUS_TLDS
        self.popular_brands = settings.POPULAR_BRANDS
        self.trusted_domains = settings.TRUSTED_DOMAINS

        # Login/authentication related keywords
        self.auth_keywords = [
            "login", "signin", "sign-in", "log-in", "auth",
            "password", "credential", "verify", "verification",
            "account", "secure", "security", "confirm",
            "로그인", "비밀번호", "인증", "본인확인"
        ]

        # Personal information keywords
        self.personal_info_keywords = [
            "ssn", "social-security", "credit-card", "card-number",
            "bank", "payment", "billing", "주민등록", "카드번호",
            "계좌", "결제", "휴대폰", "phone"
        ]

        # Known phishing patterns (확장)
        self.phishing_patterns = [
            # 영문 패턴
            r"secure.*login",
            r"account.*verify",
            r"update.*payment",
            r"confirm.*identity",
            r"suspended.*account",
            r"verify.*account",
            r"unlock.*account",
            r"restore.*access",
            r"security.*alert",
            r"unusual.*activity",
            r"verify.*email",
            r"confirm.*order",
            r"prize.*winner",
            r"free.*gift",
            r"claim.*reward",
            r"limited.*offer",
            r"urgent.*action",
            r"password.*expire",
            r"account.*blocked",
            r"verify.*identity",
            r"bank.*verification",
            r"card.*suspended",
            # ClearFake / 악성코드 사회공학 패턴
            r"verification\.google",
            r"update.*browser",
            r"browser.*update",
            r"install.*update",
            # 한글 패턴 (기본)
            r"본인.*인증",
            r"계정.*확인",
            r"비밀번호.*변경",
            r"보안.*경고",
            r"당첨.*축하",
            r"무료.*지급",
            r"긴급.*조치",
            r"계좌.*정지",
            r"카드.*중지",
            # 택배 사칭 피싱
            r"택배.*조회",
            r"배송.*확인",
            r"운송장.*조회",
            r"배달.*완료.*확인",
            r"택배.*배송.*실패",
            r"미수령.*택배",
            # 정부기관 사칭
            r"국세청.*환급",
            r"건강보험.*확인",
            r"교통.*범칙금",
            r"과태료.*납부",
            r"정부.*지원금",
            r"재난.*지원",
            r"국민연금.*확인",
            r"전자.*고지서",
            # 금융 사칭
            r"카드.*결제.*취소",
            r"해외.*결제.*승인",
            r"이체.*확인",
            r"대출.*승인",
            r"금리.*인하",
            r"보험.*만기",
            r"입금.*확인.*요청",
            # 기타 사칭
            r"청첩장.*확인",
            r"돌잔치.*초대",
            r"부고.*안내",
            r"모바일.*초대장",
        ]

    def _is_trusted_domain(self, domain: str) -> bool:
        """Check if domain is in trusted whitelist."""
        domain = domain.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        for trusted in self.trusted_domains:
            if domain == trusted or domain.endswith("." + trusted):
                return True
        return False

    def analyze_url_structure(self, url: str, domain_info: dict) -> List[Flag]:
        """Analyze URL structure for suspicious patterns."""
        flags = []
        is_trusted = self._is_trusted_domain(domain_info["domain"])

        # Skip most checks for trusted domains
        if is_trusted:
            return flags

        # Check for malware file extensions in URL path
        malware_extensions = ['.exe', '.bat', '.sh', '.ps1', '.elf', '.msi', '.vbs', '.dll', '.hta', '.scr']
        path_lower = domain_info["path"].lower()
        for ext in malware_extensions:
            if path_lower.endswith(ext):
                flags.append(Flag(
                    type="malware_extension",
                    severity=Severity.DANGER,
                    message=f"악성코드로 의심되는 파일 확장자가 감지되었습니다 ({ext})"
                ))
                break

        # Check for suspicious double TLD patterns used by malware (.in.net, .in.ua etc.)
        suspicious_double_tlds = [".in.net", ".in.ua", ".co.cc", ".com.co"]
        domain_lower = domain_info["domain"]
        for double_tld in suspicious_double_tlds:
            if domain_lower.endswith(double_tld):
                flags.append(Flag(
                    type="suspicious_tld",
                    severity=Severity.WARNING,
                    message=f"악성코드에 자주 사용되는 도메인 패턴이 감지되었습니다 ({double_tld})"
                ))
                break

        # Check for suspicious TLD
        if domain_info["tld"] in self.suspicious_tlds:
            flags.append(Flag(
                type="suspicious_tld",
                severity=Severity.WARNING,
                message=f"의심스러운 도메인 확장자({domain_info['tld']})가 사용되었습니다"
            ))

        # Check for IP address instead of domain
        if domain_info["is_ip"]:
            flags.append(Flag(
                type="ip_address",
                severity=Severity.WARNING,
                message="도메인 대신 IP 주소가 사용되었습니다"
            ))

        # Check for suspicious port
        if domain_info["uses_suspicious_port"]:
            flags.append(Flag(
                type="suspicious_port",
                severity=Severity.WARNING,
                message="비표준 포트가 사용되었습니다"
            ))

        # Check for long subdomain (potential phishing)
        domain_parts = domain_info["domain"].split(".")
        if len(domain_parts) > 3:
            flags.append(Flag(
                type="long_subdomain",
                severity=Severity.WARNING,
                message="비정상적으로 긴 서브도메인이 감지되었습니다"
            ))

        # Check for typosquatting
        typosquat_brand = self._detect_typosquatting(domain_info["domain"])
        if typosquat_brand:
            flags.append(Flag(
                type="typosquatting",
                severity=Severity.DANGER,
                message=f"'{typosquat_brand}' 브랜드를 사칭하는 것으로 의심됩니다"
            ))

        # Check for authentication keywords in URL path
        path_lower = domain_info["path"].lower()
        for keyword in self.auth_keywords:
            if keyword in path_lower:
                flags.append(Flag(
                    type="login_path",
                    severity=Severity.INFO,
                    message="로그인/인증 관련 페이지로 연결됩니다"
                ))
                break

        # Check for phishing patterns in URL
        url_lower = url.lower()
        for pattern in self.phishing_patterns:
            if re.search(pattern, url_lower):
                flags.append(Flag(
                    type="phishing_pattern",
                    severity=Severity.DANGER,
                    message="피싱 공격에서 자주 사용되는 URL 패턴이 감지되었습니다"
                ))
                break

        return flags

    def _detect_typosquatting(self, domain: str) -> str | None:
        """Detect potential typosquatting of popular brands."""
        domain_base = domain.split(".")[0].lower()

        for brand in self.popular_brands:
            # Skip if exact match
            if domain_base == brand:
                continue

            # Adaptive similarity threshold based on brand length
            # Short brands (<=4 chars) are prone to false positives
            threshold = 0.85 if len(brand) <= 4 else 0.7
            similarity = SequenceMatcher(None, domain_base, brand).ratio()
            if threshold <= similarity < 1.0:
                return brand

            # Check for common typosquatting patterns
            if self._is_typosquat_variant(domain_base, brand):
                return brand

        return None

    def _is_typosquat_variant(self, domain: str, brand: str) -> bool:
        """Check if domain is a typosquat variant of brand."""
        # Map fake characters → real characters (one direction only!)
        # Key = fake/substitution character, Value = real character
        char_map = {
            '0': 'o',  # zero → o
            'ο': 'o',  # Greek omicron → o
            '1': 'l',  # one → l
            '|': 'l',  # pipe → l
            '!': 'i',  # exclamation → i
            '3': 'e',  # three → e
            'є': 'e',  # Cyrillic → e
            '5': 's',  # five → s
            '$': 's',  # dollar → s
            '4': 'a',  # four → a
            '@': 'a',  # at → a
            'α': 'a',  # Greek alpha → a
            '9': 'g',  # nine → g
            '8': 'b',  # eight → b
            '6': 'b',  # six → b
            '7': 't',  # seven → t
            '+': 't',  # plus → t
            'rn': 'm', # rn → m (looks like m)
            'vv': 'w', # vv → w
        }

        # Normalize domain by replacing fake characters with real ones
        def normalize(text: str) -> str:
            result = text.lower()
            # Handle multi-character substitutions first
            result = result.replace('rn', 'm').replace('vv', 'w')
            # Then single character substitutions
            for fake, real in char_map.items():
                if len(fake) == 1:
                    result = result.replace(fake, real)
            return result

        normalized_domain = normalize(domain)
        normalized_brand = normalize(brand)

        # After normalization, check if they match
        if normalized_domain == normalized_brand:
            return True

        # Check single character difference (after normalization)
        if abs(len(normalized_domain) - len(normalized_brand)) <= 1:
            if len(normalized_domain) == len(normalized_brand):
                diff_count = sum(1 for a, b in zip(normalized_domain, normalized_brand) if a != b)
                if diff_count <= 2:  # Allow up to 2 character differences
                    return True
            # Check for added/removed character
            longer, shorter = (normalized_domain, normalized_brand) if len(normalized_domain) > len(normalized_brand) else (normalized_brand, normalized_domain)
            if len(longer) == len(shorter) + 1:
                for i in range(len(longer)):
                    if longer[:i] + longer[i+1:] == shorter:
                        return True

        return False

    async def analyze_page_content(self, url: str) -> Tuple[List[Flag], List[str]]:
        """Analyze page content for information requirements."""
        flags = []
        evidence = []

        # Check if trusted domain
        try:
            parsed = urlparse(url)
            is_trusted = self._is_trusted_domain(parsed.netloc)
        except Exception:
            is_trusted = False

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, follow_redirects=True)
                if response.status_code == 200:
                    content = response.text.lower()

                    # Check for login forms (INFO level - normal for most sites)
                    if self._has_login_form(content):
                        flags.append(Flag(
                            type="login_form",
                            severity=Severity.INFO,
                            message="로그인 폼이 감지되었습니다"
                        ))
                        evidence.extend(["이메일/아이디 입력 필드", "비밀번호 입력 필드"])

                    # Check for personal info requests (INFO for trusted, WARNING for others)
                    personal_info = self._detect_personal_info_fields(content)
                    if personal_info:
                        flags.append(Flag(
                            type="personal_info_request",
                            severity=Severity.INFO if is_trusted else Severity.WARNING,
                            message="개인정보 입력 필드가 있습니다" if is_trusted else "개인정보 입력을 요청하는 페이지입니다"
                        ))
                        evidence.extend(personal_info)

                    # Check for payment forms (INFO for trusted, WARNING for others)
                    if self._has_payment_form(content):
                        flags.append(Flag(
                            type="payment_form",
                            severity=Severity.INFO if is_trusted else Severity.WARNING,
                            message="결제 기능이 있는 페이지입니다" if is_trusted else "결제 정보 입력을 요청하는 페이지입니다"
                        ))
                        evidence.append("결제/카드 정보 입력 필드")
        except Exception:
            # If we can't fetch the page, that's okay - we'll rely on URL analysis
            pass

        return flags, evidence

    def _has_login_form(self, content: str) -> bool:
        """Check if page has a login form."""
        login_indicators = [
            'type="password"',
            "type='password'",
            'input.*password',
            'name="password"',
            'id="password"',
            'placeholder="password"',
            'placeholder="비밀번호"',
        ]
        return any(re.search(pattern, content) for pattern in login_indicators)

    def _detect_personal_info_fields(self, content: str) -> List[str]:
        """Detect personal information input fields."""
        detected = []

        patterns = {
            "주민등록번호 입력 필드": [r'주민.*번호', r'ssn', r'social.*security'],
            "휴대폰 번호 입력 필드": [r'휴대폰', r'phone.*number', r'mobile'],
            "주소 입력 필드": [r'우편번호', r'zipcode', r'address'],
            "생년월일 입력 필드": [r'생년월일', r'birth.*date', r'date.*birth'],
        }

        for evidence_text, pattern_list in patterns.items():
            if any(re.search(p, content) for p in pattern_list):
                detected.append(evidence_text)

        return detected

    def _has_payment_form(self, content: str) -> bool:
        """Check if page has a payment form."""
        # More specific patterns to avoid false positives (e.g., twitter:card)
        payment_indicators = [
            r'<input[^>]*card[^>]*number',  # input field with card number
            r'<input[^>]*카드[^>]*번호',
            r'name=["\']?card',  # form field named card
            r'id=["\']?card',
            r'placeholder=["\']?카드',
            r'placeholder=["\']?card\s*number',
            r'credit\s*card\s*number',
            r'<input[^>]*cvv',
            r'<input[^>]*cvc',
            r'name=["\']?cvv',
            r'name=["\']?cvc',
            r'카드\s*번호\s*입력',
            r'유효\s*기간\s*입력',
        ]
        return any(re.search(pattern, content, re.IGNORECASE) for pattern in payment_indicators)

    def determine_info_requirement(
        self,
        flags: List[Flag],
        evidence: List[str]
    ) -> InfoRequirement:
        """Determine the information requirement level."""
        if not flags and not evidence:
            return InfoRequirement(level=InfoRequirementLevel.LOW, evidence=[])

        # Only consider WARNING or DANGER level flags for risk assessment
        warning_or_danger_flags = [f for f in flags if f.severity in (Severity.WARNING, Severity.DANGER)]

        if not warning_or_danger_flags:
            # All flags are INFO level (trusted domain) - LOW risk
            return InfoRequirement(level=InfoRequirementLevel.LOW, evidence=evidence)

        # Check for high-risk indicators (only if WARNING or DANGER severity)
        high_risk_types = {"payment_form", "personal_info_request", "phishing_pattern"}
        medium_risk_types = {"login_form", "login_path", "typosquatting"}

        warning_danger_types = {f.type for f in warning_or_danger_flags}

        if warning_danger_types & high_risk_types:
            return InfoRequirement(level=InfoRequirementLevel.HIGH, evidence=evidence)
        elif warning_danger_types & medium_risk_types:
            return InfoRequirement(level=InfoRequirementLevel.MEDIUM, evidence=evidence)
        else:
            return InfoRequirement(level=InfoRequirementLevel.LOW, evidence=evidence)


threat_detector = ThreatDetector()
