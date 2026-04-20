import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score
import joblib
from ml.features import extract_features

def create_mock_dataset():
    """
    Creates an expanded, diverse mock dataset of URLs and their phishing status.
    1 = Phishing, 0 = Legitimate
    
    The dataset is intentionally large and diverse so the model learns structural
    patterns rather than memorising specific domains. Legitimate URLs include
    many *unseen* domains (no whitelist dependency) so the model generalises.
    """
    data = [
        # ==================== LEGITIMATE URLs (100+) ====================

        # --- Major search / tech ---
        ("https://www.google.com", 0),
        ("https://www.google.com/search?q=hello", 0),
        ("https://mail.google.com", 0),
        ("https://drive.google.com", 0),
        ("https://cloud.google.com", 0),
        ("https://fonts.google.com", 0),
        ("https://www.bing.com", 0),
        ("https://www.yahoo.com", 0),
        ("https://duckduckgo.com", 0),

        # --- Social media ---
        ("https://www.facebook.com", 0),
        ("https://www.instagram.com", 0),
        ("https://www.twitter.com", 0),
        ("https://x.com", 0),
        ("https://www.linkedin.com", 0),
        ("https://www.reddit.com", 0),
        ("https://www.pinterest.com", 0),
        ("https://www.tiktok.com", 0),
        ("https://www.youtube.com", 0),
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", 0),
        ("https://www.snapchat.com", 0),
        ("https://discord.com", 0),
        ("https://www.twitch.tv", 0),
        ("https://mastodon.social", 0),
        ("https://bsky.app", 0),

        # --- E-commerce ---
        ("https://www.amazon.com", 0),
        ("https://www.amazon.com/dp/B08N5WRWNW", 0),
        ("https://www.ebay.com", 0),
        ("https://www.etsy.com", 0),
        ("https://www.walmart.com", 0),
        ("https://www.flipkart.com", 0),
        ("https://www.shopify.com", 0),
        ("https://www.target.com", 0),
        ("https://www.bestbuy.com", 0),
        ("https://www.costco.com", 0),
        ("https://www.alibaba.com", 0),

        # --- Dev / Tech ---
        ("https://github.com", 0),
        ("https://github.com/torvalds/linux", 0),
        ("https://gitlab.com", 0),
        ("https://bitbucket.org", 0),
        ("https://stackoverflow.com", 0),
        ("https://stackoverflow.com/questions/123456/how-to-do-x", 0),
        ("https://www.microsoft.com", 0),
        ("https://learn.microsoft.com/en-us/docs", 0),
        ("https://www.apple.com", 0),
        ("https://developer.apple.com", 0),
        ("https://www.npmjs.com", 0),
        ("https://www.npmjs.com/package/react", 0),
        ("https://pypi.org", 0),
        ("https://docs.python.org/3/", 0),
        ("https://react.dev", 0),
        ("https://nodejs.org", 0),
        ("https://code.visualstudio.com", 0),
        ("https://vercel.com", 0),
        ("https://nextjs.org", 0),
        ("https://nuxt.com", 0),
        ("https://svelte.dev", 0),
        ("https://angular.dev", 0),
        ("https://vuejs.org", 0),
        ("https://tailwindcss.com", 0),
        ("https://vite.dev", 0),
        ("https://astro.build", 0),
        ("https://remix.run", 0),
        ("https://deno.land", 0),
        ("https://bun.sh", 0),
        ("https://rust-lang.org", 0),
        ("https://go.dev", 0),
        ("https://www.typescriptlang.org", 0),
        ("https://kotlinlang.org", 0),
        ("https://www.ruby-lang.org", 0),
        ("https://www.php.net", 0),
        ("https://dart.dev", 0),
        ("https://flutter.dev", 0),
        ("https://www.jetbrains.com", 0),
        ("https://www.docker.com", 0),
        ("https://kubernetes.io", 0),
        ("https://www.terraform.io", 0),
        ("https://aws.amazon.com", 0),
        ("https://azure.microsoft.com", 0),
        ("https://console.cloud.google.com", 0),
        ("https://www.heroku.com", 0),
        ("https://www.digitalocean.com", 0),
        ("https://www.cloudflare.com", 0),
        ("https://www.netlify.com", 0),
        ("https://railway.app", 0),
        ("https://supabase.com", 0),
        ("https://firebase.google.com", 0),

        # --- News / Info ---
        ("https://en.wikipedia.org/wiki/Main_Page", 0),
        ("https://en.wikipedia.org/wiki/Phishing", 0),
        ("https://www.bbc.com", 0),
        ("https://www.nytimes.com", 0),
        ("https://www.cnn.com", 0),
        ("https://www.reuters.com", 0),
        ("https://www.theguardian.com", 0),
        ("https://www.washingtonpost.com", 0),
        ("https://www.forbes.com", 0),
        ("https://techcrunch.com", 0),
        ("https://www.wired.com", 0),
        ("https://arstechnica.com", 0),
        ("https://www.theverge.com", 0),

        # --- Cloud / services ---
        ("https://www.netflix.com", 0),
        ("https://www.spotify.com", 0),
        ("https://www.dropbox.com", 0),
        ("https://zoom.us", 0),
        ("https://www.slack.com", 0),
        ("https://www.notion.so", 0),
        ("https://www.figma.com", 0),
        ("https://www.canva.com", 0),
        ("https://www.adobe.com", 0),
        ("https://trello.com", 0),
        ("https://www.atlassian.com", 0),
        ("https://www.salesforce.com", 0),
        ("https://www.hubspot.com", 0),
        ("https://www.zendesk.com", 0),

        # --- Banks / finance (legitimate) ---
        ("https://www.paypal.com", 0),
        ("https://www.chase.com", 0),
        ("https://www.bankofamerica.com", 0),
        ("https://www.wellsfargo.com", 0),
        ("https://www.citi.com", 0),
        ("https://www.capitalone.com", 0),
        ("https://www.americanexpress.com", 0),
        ("https://www.fidelity.com", 0),
        ("https://www.schwab.com", 0),
        ("https://robinhood.com", 0),
        ("https://www.coinbase.com", 0),
        ("https://stripe.com", 0),

        # --- Legitimate domains with hyphens (important!) ---
        ("https://web.whatsapp.com", 0),
        ("https://www.t-mobile.com", 0),
        ("https://www.coca-cola.com", 0),
        ("https://www.rolls-royce.com", 0),
        ("https://www.mercedes-benz.com", 0),
        ("https://www.ruby-lang.org", 0),
        ("https://rust-lang.org", 0),
        ("https://www.warner-bros.com", 0),
        ("https://www.lego.com", 0),

        # --- Education ---
        ("https://www.mit.edu", 0),
        ("https://www.stanford.edu", 0),
        ("https://www.harvard.edu", 0),
        ("https://www.coursera.org", 0),
        ("https://www.udemy.com", 0),
        ("https://www.khanacademy.org", 0),
        ("https://www.edx.org", 0),

        # --- Government ---
        ("https://www.usa.gov", 0),
        ("https://www.irs.gov", 0),
        ("https://www.cdc.gov", 0),
        ("https://www.nasa.gov", 0),

        # --- Short / minimal legitimate ---
        ("https://x.com", 0),
        ("https://t.co", 0),
        ("https://bit.ly", 0),
        ("https://goo.gl", 0),
        ("https://is.gd", 0),
        ("https://v.gd", 0),
        ("http://example.com", 0),
        ("http://example.org", 0),
        ("https://example.net", 0),

        # --- Medium-length legitimate with paths ---
        ("https://medium.com/@user/my-article-title-12345", 0),
        ("https://www.quora.com/What-is-phishing", 0),
        ("https://archive.org/details/example", 0),
        ("https://www.reddit.com/r/programming/comments/abc123/", 0),
        ("https://docs.github.com/en/authentication", 0),

        # ==================== PHISHING URLs (100+) ====================

        # --- IP-based ---
        ("http://192.168.1.1/login.php", 1),
        ("http://10.0.0.5/admin/password_reset", 1),
        ("http://172.16.0.1/secure/login", 1),
        ("http://45.33.32.156/account/verify", 1),
        ("http://91.198.174.192/bank-login", 1),
        ("http://203.0.113.42/paypal/signin", 1),
        ("http://198.51.100.23/login/confirm", 1),

        # --- @ symbol abuse ---
        ("http://secure-login.paypal.com@hacker.com", 1),
        ("http://www.google.com@malicious-site.com/login", 1),
        ("http://accounts.google.com@evil.com/auth", 1),
        ("http://www.amazon.com@phish.ru/order", 1),
        ("http://www.chase.com@evil.net/verify", 1),
        ("http://www.apple.com@hackersite.ru/login", 1),

        # --- Excessive subdomains ---
        ("http://www.login.secure.bank.com.hacker.com", 1),
        ("http://accounts.google.secure.login.verify.evil.com", 1),
        ("http://paypal.com.secure.login.verify.malware.com", 1),
        ("http://apple.id.secure.signin.account.evil.net", 1),
        ("http://microsoft.com.login.verify.security.bad.com", 1),
        ("http://amazon.com.order.track.verify.bad.com", 1),
        ("http://netflix.com.billing.update.verify.evil.com", 1),

        # --- Deceptive domain names (misspellings / lookalikes) ---
        ("http://www.g00gle.com/login", 1),
        ("http://www.faceb00k-login.com", 1),
        ("http://www.amaz0n-secure.com", 1),
        ("http://www.paypa1-verify.com", 1),
        ("http://www.micr0soft-support.com", 1),
        ("http://www.netfl1x-account.com", 1),
        ("http://www.1nstagram-verify.com", 1),
        ("http://www.app1e-id-secure.com", 1),
        ("http://www.tw1tter-login.com", 1),
        ("http://www.l1nkedin-verify.com", 1),
        ("http://www.sp0tify-billing.com", 1),
        ("http://www.y0utube-verify.com", 1),

        # --- Long suspicious URLs ---
        ("http://free-iphone-winner.com/claim!prize", 1),
        ("http://you-won-a-prize-click-here-now.com/redeem", 1),
        ("http://verify-your-account-now-secure-login.com/auth", 1),
        ("http://update-billing-information-paypal.com/confirm", 1),
        ("http://suspicious-long-domain-with-many-words-security.com/login.php?user=admin&pass=12345", 1),
        ("http://claim-your-prize-now-free-gift.com/winner", 1),
        ("http://urgent-account-verification-required-now.com/login", 1),
        ("http://your-package-delivery-update-confirm.com/track", 1),

        # --- No HTTPS + suspicious patterns ---
        ("http://banking-secure-login.com", 1),
        ("http://account-verification-required.net", 1),
        ("http://password-reset-confirm.org", 1),
        ("http://secure-update-billing.com", 1),
        ("http://login-verify-account-now.com", 1),
        ("http://confirm-identity-secure.com", 1),
        ("http://reset-password-urgent.com", 1),
        ("http://verify-payment-method.com", 1),
        ("http://update-account-security.com", 1),
        ("http://urgent-login-required.com", 1),

        # --- Abnormal characters ---
        ("http://win-free-prize.com/claim!now!here", 1),
        ("http://click-here.com/get%20free%20stuff", 1),
        ("http://redirect.com/go?url=http://evil.com&track=1", 1),
        ("http://hack.com/payload?cmd=rm%20-rf%20/", 1),
        ("http://phish.com/login?redirect=http://evil.com&user=admin", 1),

        # --- URL shortener lookalikes ---
        ("http://bit.ly.evil.com/3xYz12", 1),
        ("http://goo-gl.com/short", 1),
        ("http://tinyurl.evil.com/abc123", 1),
        ("http://is-gd.evil.com/xyz", 1),

        # --- Banking impersonation ---
        ("http://chase-secure-login.com/verify", 1),
        ("http://wellsfargo-account-alert.com", 1),
        ("http://bank-of-america-verify.net/login", 1),
        ("http://citibank-security-alert.com/update", 1),
        ("http://capitalone-account-verify.com/confirm", 1),
        ("http://paypal-billing-update.com/login", 1),
        ("http://coinbase-verify-account.com/signin", 1),
        ("http://robinhood-account-suspended.com/login", 1),

        # --- Tech impersonation ---
        ("http://support-apple-id.com/verify", 1),
        ("http://help-microsoft-account.com/reset", 1),
        ("http://secure-google-drive.com/share", 1),
        ("http://dropbox-shared-file.com/download", 1),
        ("http://netflix-payment-update.com/billing", 1),
        ("http://spotify-account-verify.com/login", 1),
        ("http://amazon-order-confirm.com/track", 1),
        ("http://facebook-security-alert.com/login", 1),
        ("http://instagram-verify-account.com/confirm", 1),
        ("http://twitter-account-suspended.com/verify", 1),
        ("http://linkedin-security-update.com/login", 1),
        ("http://github-account-verify.com/signin", 1),

        # --- Random phishing with multiple red flags ---
        ("http://82.94.12.55/secure-login/paypal", 1),
        ("http://login-now-or-lose-access.com/urgent", 1),
        ("http://click-here-to-verify-identity.com/confirm", 1),
        ("http://your-account-has-been-compromised.com/reset", 1),
        ("http://online-banking-verify.com/signin", 1),
        ("http://account-update-required.com/login?token=abc123", 1),
        ("http://password-expired-reset-now.com/update", 1),
        ("http://suspicious-activity-detected.com/verify", 1),
        ("http://limited-time-offer-winner.com/claim", 1),
        ("http://free-gift-card-redeem.com/prize", 1),

        # --- Phishing with digits in domain ---
        ("http://secur3-login.com/verify", 1),
        ("http://upd4te-billing.com/confirm", 1),
        ("http://acc0unt-verify.com/login", 1),
        ("http://pa55word-reset.com/update", 1),
        ("http://b4nking-login.com/secure", 1),
        ("http://l0gin-verify.com/account", 1),

        # --- More hyphens-heavy phishing ---
        ("http://secure-account-login-verify-update.com", 1),
        ("http://banking-security-alert-confirm-identity.com", 1),
        ("http://paypal-secure-billing-update-confirm.com", 1),
        ("http://verify-your-identity-confirm-account-login.com", 1),
    ]
    
    df = pd.DataFrame(data, columns=['url', 'label'])
    
    # Try to add URLs from database dataset_queue
    try:
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from database import get_database
        db = get_database()
        if db is not None:
            queue_data = list(db.dataset_queue.find({}))
            if queue_data:
                print(f"Found {len(queue_data)} URLs from user reports to add to dataset.")
                db_data = [(item['url'], 1 if item.get('label') == 'phishing' else 0) for item in queue_data]
                db_df = pd.DataFrame(db_data, columns=['url', 'label'])
                df = pd.concat([df, db_df], ignore_index=True)
                # Ensure no duplicates
                df = df.drop_duplicates(subset=['url'])
    except Exception as e:
        print(f"Warning: Could not fetch from dataset_queue: {e}")

    # Extract features for each URL
    feature_list = []
    for url in df['url']:
        features = extract_features(url)
        feature_list.append(features)
        
    features_df = pd.DataFrame(feature_list)
    
    # Combine features with labels
    final_df = pd.concat([features_df, df['label']], axis=1)
    return final_df

def train_model():
    print("Creating expanded dataset...")
    df = create_mock_dataset()
    
    X = df.drop('label', axis=1)
    y = df['label']
    
    print(f"Dataset: {len(df)} samples ({sum(y==0)} legitimate, {sum(y==1)} phishing)")
    print(f"Features: {list(X.columns)}")
    
    print("Training Random Forest model...")
    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=3,
        random_state=42,
        class_weight='balanced'
    )
    model.fit(X, y)
    
    # Cross-validation score for better generalisation metric
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
    print(f"Training accuracy: {model.score(X, y):.2f}")
    print(f"Cross-validation accuracy: {cv_scores.mean():.2f} (+/- {cv_scores.std():.2f})")
    
    # Feature importance
    importances = sorted(
        zip(X.columns, model.feature_importances_),
        key=lambda x: x[1], reverse=True
    )
    print("\nFeature importance:")
    for name, imp in importances:
        print(f"  {name:<30s} {imp:.4f}")
    
    # Save the model
    os.makedirs(os.path.dirname(__file__), exist_ok=True)
    model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    joblib.dump(model, model_path)
    print(f"\nModel saved to {model_path}")

if __name__ == '__main__':
    train_model()
