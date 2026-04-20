import re
from urllib.parse import urlparse

def extract_features(url: str) -> dict:
    """
    Extracts features from a given URL for phishing detection.
    
    Features are designed to capture structural patterns that distinguish
    phishing URLs from legitimate ones, without penalising normal short URLs.
    """
    # Ensure URL has scheme for accurate parsing if missing
    if not url.startswith('http'):
        url_with_scheme = 'http://' + url
    else:
        url_with_scheme = url
        
    parsed_url = urlparse(url_with_scheme)
    domain = parsed_url.netloc
    path = parsed_url.path

    features = {}

    # 1. URL Length
    features['url_length'] = len(url)

    # 2. Presence of "@" symbol (Phishing sites sometimes use this to hide actual domain)
    features['has_at_symbol'] = 1 if '@' in url else 0

    # 3. HTTPS usage
    features['has_https'] = 1 if parsed_url.scheme == 'https' else 0

    # 4. Number of subdomains (e.g., a.b.c.com -> 3)
    # Exclude 'www' for a more accurate count
    domain_parts = domain.replace('www.', '').split('.')
    features['num_subdomains'] = max(0, len(domain_parts) - 2)

    # 5. IP Address usage instead of domain
    # Regex to check if domain is an IPv4 address
    ip_pattern = re.compile(
        r'^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$'
    )
    features['uses_ip'] = 1 if ip_pattern.match(domain) else 0

    # 6. Hyphen in domain (Phishers often use a-b.com to trick users)
    features['has_hyphen_in_domain'] = 1 if '-' in domain else 0

    # 7. Count of abnormal characters in URL
    abnormal_chars = ['!', '*', '#', '%', '&', '=']
    features['abnormal_char_count'] = sum(url.count(char) for char in abnormal_chars)

    # ─── NEW / IMPROVED FEATURES ───────────────────────────────────────

    # 8. Number of hyphens in domain — many hyphens is suspicious
    features['hyphen_count_domain'] = domain.count('-')

    # 9. Domain length — unusually long domains are suspicious
    clean_domain = domain.replace('www.', '')
    features['domain_length'] = len(clean_domain)

    # 10. Path length — long paths can indicate obfuscation
    features['path_length'] = len(path)

    # 11. Number of dots in domain — many dots suggest subdomain abuse
    features['dot_count_domain'] = domain.count('.')

    # 12. Contains digits in domain root — e.g. g00gle, faceb00k
    root_domain = domain_parts[-2] if len(domain_parts) >= 2 else domain
    features['digits_in_domain'] = sum(c.isdigit() for c in root_domain)

    # 13. Contains suspicious keywords in URL
    suspicious_keywords = [
        'login', 'verify', 'secure', 'account', 'update', 'confirm',
        'password', 'bank', 'signin', 'billing', 'alert', 'suspend',
        'prize', 'winner', 'free', 'claim', 'urgent', 'reset'
    ]
    url_lower = url.lower()
    features['suspicious_keyword_count'] = sum(
        1 for kw in suspicious_keywords if kw in url_lower
    )

    # 14. Ratio of digits to letters in the full URL
    letters = sum(c.isalpha() for c in url)
    digits = sum(c.isdigit() for c in url)
    features['digit_letter_ratio'] = round(digits / max(letters, 1), 3)

    # 15. Uses known TLD — common legitimate TLDs
    known_tlds = {
        'com', 'org', 'net', 'edu', 'gov', 'io', 'co', 'dev', 'app',
        'us', 'uk', 'in', 'de', 'fr', 'jp', 'au', 'ca', 'so', 'tv'
    }
    tld = domain_parts[-1] if domain_parts else ''
    features['known_tld'] = 1 if tld in known_tlds else 0

    # 16. Number of special characters in path
    features['special_chars_in_path'] = len(re.findall(r'[!@#$%^&*()=+\[\]{}|\\<>]', path))

    # 17. Has port number (unusual for legitimate websites)
    features['has_port'] = 1 if ':' in domain.split('@')[-1].split('.')[0] or parsed_url.port not in (None, 80, 443) else 0

    # 18. Redirect count — multiple // in URL after scheme
    url_after_scheme = url.split('://', 1)[-1] if '://' in url else url
    features['double_slash_count'] = url_after_scheme.count('//')

    return features

# Test
if __name__ == '__main__':
    test_urls = [
        'https://www.google.com',
        'http://192.168.1.1/login.php',
        'http://secure-login.paypal.com@hacker.com'
    ]
    for u in test_urls:
        print(f"{u} -> {extract_features(u)}")
