import os
import joblib
import pandas as pd
from ml.features import extract_features

# Load the model when the module is imported
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')
model = None

try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
    else:
        print(f"Warning: Model file not found at {MODEL_PATH}. Please train the model first.")
except Exception as e:
    print(f"Error loading model: {e}")

# Known-safe top domains (whitelist) — these should never be flagged
SAFE_DOMAINS = {
    "google.com", "youtube.com", "facebook.com", "amazon.com", "wikipedia.org",
    "twitter.com", "instagram.com", "linkedin.com", "reddit.com", "microsoft.com",
    "apple.com", "github.com", "stackoverflow.com", "netflix.com", "spotify.com",
    "yahoo.com", "bing.com", "zoom.us", "dropbox.com", "slack.com",
    "whatsapp.com", "pinterest.com", "tiktok.com", "paypal.com", "ebay.com",
    "walmart.com", "etsy.com", "shopify.com", "notion.so", "figma.com",
    "chase.com", "bankofamerica.com", "wellsfargo.com", "citi.com",
    "nytimes.com", "bbc.com", "cnn.com", "reuters.com", "theguardian.com",
    "npmjs.com", "pypi.org", "react.dev", "nodejs.org", "python.org",
    "example.com", "example.org", "example.net",
    "flipkart.com", "snapchat.com", "discord.com", "twitch.tv",
    "medium.com", "quora.com", "tumblr.com", "archive.org",
    "t-mobile.com", "coca-cola.com", "rolls-royce.com", "mercedes-benz.com",
}

# Mock real-time blacklist
BLACKLISTED_DOMAINS = [
    "192.168.1.1",
    "hacker.com",
    "free-iphone-winner.com",
    "login.secure.bank.com.hacker.com"
]

def _extract_root_domain(url: str) -> str:
    """Extract root domain from URL (e.g., 'mail.google.com' -> 'google.com')."""
    from urllib.parse import urlparse
    if not url.startswith('http'):
        url = 'http://' + url
    domain = urlparse(url).netloc.lower()
    # Remove www.
    if domain.startswith('www.'):
        domain = domain[4:]
    # Handle @ in URL (take domain after @)
    if '@' in domain:
        domain = domain.split('@')[-1]
    # Get root domain (last 2 parts for normal TLDs, last 3 for co.uk etc.)
    parts = domain.split('.')
    if len(parts) >= 2:
        return '.'.join(parts[-2:])
    return domain

def check_blacklist(url: str) -> bool:
    from urllib.parse import urlparse
    if not url.startswith('http'):
        url_check = 'http://' + url
    else:
        url_check = url
    domain = urlparse(url_check).netloc
    for bad_domain in BLACKLISTED_DOMAINS:
        if bad_domain in domain:
            return True
    return False

def check_whitelist(url: str) -> bool:
    """Check if URL belongs to a known-safe domain."""
    root = _extract_root_domain(url)
    return root in SAFE_DOMAINS

def predict_phishing(url: str) -> dict:
    """
    Predicts whether a URL is phishing or legitimate.
    Returns a dictionary with the prediction, risk score, and explanation.
    """
    features = extract_features(url)
    
    # 1. Fast Path: Real-time Blacklist Check
    if check_blacklist(url):
        return {
            "url": url,
            "status": "Phishing",
            "risk_score": 99,
            "features": features,
            "explanation": [
                "CRITICAL: This URL matches a known entry in our real-time global phishing blacklist."
            ]
        }
    
    # 2. Fast Path: Whitelist Check — known-safe domains get a pass
    #    But still flag if there's an @ sign (domain spoofing)
    if check_whitelist(url) and not features.get('has_at_symbol', 0):
        return {
            "url": url,
            "status": "Safe",
            "risk_score": 5,
            "features": features,
            "explanation": [
                "This URL belongs to a well-known, trusted domain.",
                "No immediate red flags detected in the URL structure."
            ]
        }
    
    if model is None:
        return {
            "error": "Model not loaded",
            "features": features
        }
        
    # 3. ML Model prediction
    features_df = pd.DataFrame([features])
    
    probs = model.predict_proba(features_df)[0]
    # class 1 = phishing, class 0 = legitimate
    phishing_prob = probs[1]
    
    # Calculate Risk Score (0-100)
    risk_score = round(phishing_prob * 100)
    
    # Determine classification with reasonable thresholds
    if risk_score > 70:
        status = "Phishing"
    elif risk_score > 40:
        status = "Suspicious"
    else:
        status = "Safe"
        
    # Generate Explanation based on triggered features
    explanations = []
    if features['uses_ip']:
        explanations.append("URL uses an IP address instead of a domain name.")
    if features['has_at_symbol']:
        explanations.append("URL contains an '@' symbol, often used to hide the real domain.")
    if features['num_subdomains'] > 2:
        explanations.append(f"URL has {features['num_subdomains']} subdomains, which is suspiciously high.")
    if features['has_hyphen_in_domain'] and not features['has_https']:
        explanations.append("Domain contains a hyphen and lacks HTTPS — common in phishing attempts.")
    elif features['has_hyphen_in_domain'] and risk_score > 40:
        explanations.append("Domain contains a hyphen, which can be a tactic in typo-squatting.")
    if features['abnormal_char_count'] > 0:
        explanations.append(f"URL contains {features['abnormal_char_count']} abnormal characters.")
    if not features['has_https']:
        explanations.append("URL does not use secure HTTPS protocol.")
    if features['url_length'] > 75:
        explanations.append(f"URL is unusually long ({features['url_length']} characters), which can indicate obfuscation.")
        
    if not explanations:
        explanations.append("No immediate red flags detected in the URL structure.")
        
    return {
        "url": url,
        "status": status,
        "risk_score": risk_score,
        "features": features,
        "explanation": explanations
    }

import re

def predict_email_phishing(email_content: str) -> dict:
    """Basic heuristic-based phishing email detection."""
    content_lower = email_content.lower()
    
    suspicious_keywords = [
        "urgent", "verify your account", "click here", "password expires",
        "suspended", "unusual activity", "claim your prize", "winner",
        "lottery", "bank details", "social security", "irs", "invoice attached"
    ]
    
    score = 0
    explanations = []
    
    # Check for keywords
    for keyword in suspicious_keywords:
        if keyword in content_lower:
            score += 20
            explanations.append(f"Contains suspicious phrase: '{keyword}'")
            
    # Check for excessive links
    urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', email_content)
    if len(urls) > 2:
        score += 25
        explanations.append(f"Contains high number of links ({len(urls)}).")
        
    # Check for urgency/money
    if "$" in email_content or "€" in email_content or "£" in email_content:
        if "urgent" in content_lower or "immediate" in content_lower:
            score += 35
            explanations.append("Contains monetary symbols combined with urgent language.")

    # Normalize score
    risk_score = min(score, 99)
    
    if risk_score > 60:
        status = "Phishing"
    elif risk_score > 35:
        status = "Suspicious"
    else:
        status = "Safe"
        
    if not explanations:
        explanations.append("No immediate phishing indicators found in the email content.")
        
    return {
        "status": status,
        "risk_score": max(risk_score, 5), # base score 5
        "explanation": explanations
    }

async def predict_live_website(url: str) -> dict:
    """Analyzes a live website by fetching its content and checking for phishing indicators."""
    import httpx
    from bs4 import BeautifulSoup
    
    if not url.startswith('http'):
        url = 'https://' + url
        
    explanations = []
    score = 0
    status = "Safe"
    
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url)
            html = response.text
            
            # Check for redirects
            if response.history:
                score += 15
                explanations.append(f"Page redirected {len(response.history)} time(s).")
            
            soup = BeautifulSoup(html, 'html.parser')
            
            # 1. Detect Forms (especially sensitive ones)
            forms = soup.find_all('form')
            has_sensitive_form = False
            if forms:
                for form in forms:
                    inputs = form.find_all('input')
                    for inp in inputs:
                        if inp.get('type') in ['password', 'tel', 'email'] or \
                           any(x in (inp.get('name') or '').lower() for x in ['card', 'ssn', 'social', 'account']):
                            has_sensitive_form = True
                            break
                
                if has_sensitive_form:
                    score += 45
                    explanations.append("⚠️ This page is trying to collect sensitive info (login/financial forms detected).")
                else:
                    score += 10
                    explanations.append("Page contains data entry forms.")
            
            # 2. Check for hidden redirects (Meta refresh)
            meta_refresh = soup.find('meta', attrs={'http-equiv': 'refresh'})
            if meta_refresh:
                score += 30
                explanations.append("Found suspicious meta-refresh (auto-redirect) tag.")
                
            # 3. Check for external resources (common in phishing to load assets from legitimate sites)
            links = soup.find_all('a', href=True)
            external_links = [l['href'] for l in links if l['href'].startswith('http') and _extract_root_domain(l['href']) != _extract_root_domain(url)]
            if len(external_links) > 20:
                score += 15
                explanations.append(f"High number of external links ({len(external_links)}) detected.")
                
            # 4. Text analysis for phishing keywords
            text_content = soup.get_text().lower()
            keywords = ["login", "signin", "verify", "account", "secure", "bank", "update", "suspended", "urgent"]
            found_keywords = [k for k in keywords if k in text_content]
            if len(found_keywords) > 3:
                score += 20
                explanations.append(f"Found phishing-related keywords: {', '.join(found_keywords)}")

    except Exception as e:
        return {
            "url": url,
            "status": "Error",
            "risk_score": 0,
            "error": f"Failed to fetch website: {str(e)}",
            "explanation": ["Could not connect to the website for live analysis."]
        }
        
    # Combine with basic URL prediction
    url_result = predict_phishing(url)
    if url_result['status'] == "Phishing":
        score += 30
        explanations.extend(url_result['explanation'])
        
    risk_score = min(score, 99)
    if risk_score > 60:
        status = "Phishing"
    elif risk_score > 35:
        status = "Suspicious"
    else:
        status = "Safe"
        
    if not explanations:
        explanations.append("No immediate live phishing indicators found on the page.")
        
    return {
        "url": url,
        "status": status,
        "risk_score": max(risk_score, 5),
        "explanation": list(set(explanations)), # unique explanations
        "live_data": {
            "forms_detected": len(forms) if 'forms' in locals() else 0,
            "has_sensitive_form": has_sensitive_form if 'has_sensitive_form' in locals() else False
        }
    }
