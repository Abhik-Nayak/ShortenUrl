# Business Reqirements
1. User can shorten URL.
2. Opening short URL redirects.
3. User can view Links.
4. User can delete Links.
5. Link Expiration.
6. Custome Alias(premium)
        Instead of short.ly/dfdfd78yu, User wants alias like name(eg:abhik) short.ly/abhik
7. Analytics(Total Clicks, Todays Clicks, Country,  Browser, Device, Referrer)
8. QR Code
9. Authentication
10. Nice To Have => Password Protected Links, One-time links, Geo-based redirects, A/B testing, Deep link for mobile Apps,  Team work spaces, Bulk upload, API Keys,  Web Hooks

# Functional Requirements
1. Create Short URL.
2. Redirect.
3. Store Mapping.
4. Track Clicks.
5. Manage URLS(Update, Delete, Expire).
6. User Authentication.
7. Analytics Dashboard.

# Non-Functional Requirements
1. Avaiability(99.99%).
2. Low Latency(<100ms).
3. Scalability(Should support millions -> billions -> Trillions of URLs without redesign).
4. Durability(Never loose mappings. If Redis crashes, data still exists.)
5. Reliability(always correct Url)
6. Security(Phishing, malicious, URLs, Brute Force, abuse, SPAM, DDoS).
7. Maintainability(Easy deployment, monitoring, upgrades, rollback).
8. Observability(logs, Metrics, Tracing, alerts).

# Real-world Constraints
1. Most Requests are Reads not Writes.
2. Traffic Spikes( Ex: Taylor Swift Posts your short URL. With in 2 minutes 50 million requests. So need scalling.)
3. Analytics should distinguish bot traffic from user traffic where possible.
    (Ex: Google crawler, Facebook crawler, Twitter Crawler, WhatsApp Crawler, Everyone open urls, Not just humans )
4. Duplicate URLs.(1000 users shorten https://google.com/lnikedin.....)
5. Abuse(Attackers generate 50 Million URLs/day).
      Need-> Rate Limiting, Quotas, CAPTCHA, Abuse Detection
6. Very Long Urls( Can be 8000+ characters).
    Need DB support.

# Capacity Estimation
Rough numbers to drive architectural decisions.

1. Assumptions: 10M new URLs/day, 500M clicks/day, ~700 bytes/row (500 URL + 8 code + 200 metadata).
2. Storage: 10M × 700 bytes ≈ 7 GB/day ≈ 2.5 TB/year → single DB becomes a bottleneck (need sharding).
3. Write traffic: 10M/day ≈ 115 writes/sec.
4. Read traffic: 500M/day ≈ 5,800 reads/sec (avg); ~58,000 reads/sec at 10× peak.
5. Read:Write ratio ≈ 50:1 → read-heavy → need caching, load balancing, horizontal scaling.
6. Key space: base62, 8 chars ≈ 218 trillion codes → ample headroom, no rollover risk.