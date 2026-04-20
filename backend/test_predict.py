from ml.predict import predict_phishing
import json

test_urls = [
    "https://www.google.com",
    "https://github.com",
    "https://www.amazon.com",
    "https://stackoverflow.com/questions/123",
    "https://www.microsoft.com",
    "http://example.com",
    "https://www.flipkart.com",
    "https://medium.com",
    "https://docs.python.org",
    "https://cloud.google.com",
    "https://www.wikipedia.org",
    "https://www.netflix.com",
    "https://www.shopify.com",
    "https://vercel.com",
    "https://nextjs.org",
    "https://tailwindcss.com",
    "https://www.npmjs.com/package/react",
    "https://fonts.google.com",
    "https://www.t-mobile.com",
    "https://www.mercedes-benz.com",
    # These SHOULD be phishing:
    "http://192.168.1.1/login.php",
    "http://secure-login.paypal.com@hacker.com",
    "http://www.g00gle.com/login",
    "http://free-iphone-winner.com/claim!prize",
]

print(f"{'URL':<55} {'STATUS':<12} {'RISK':>4}")
print("-" * 75)
for url in test_urls:
    result = predict_phishing(url)
    print(f"{url:<55} {result['status']:<12} {result['risk_score']:>4}")
