# Security testing evidence (course submission checklist)

Use this document as a **table of contents** for your assignment. Store screenshots and exported reports under `docs/evidence/` (add that folder to `.gitignore` if reports must not be public). Replace placeholders with your real URLs, dates, and finding IDs.

---

## 1. OWASP ZAP (mandatory)

### 1.1 What to capture

| Deliverable | What it proves |
|-------------|----------------|
| **HTML report screenshot** | You ran an automated baseline scan and kept a human-readable report. |
| **Short narrative (this file or appendix)** | Tool version, target URL, scan type (e.g. `zap-baseline.py`), date/time. |

### 1.2 How to produce it (example)

1. Deploy the app (or run locally with the same URL Jenkins uses).
2. Run OWASP ZAP Baseline (Docker example):

   ```bash
   mkdir -p zap-reports
   docker run --rm -v "$(pwd)/zap-reports:/zap/wrk" \
     owasp/zap2docker-stable \
     zap-baseline.py -t https://YOUR_APP_URL -r zap-report.html
   ```

3. Open `zap-reports/zap-report.html` in a browser.
4. **Screenshot**: capture the **first page / summary** showing alerts counts and the report title bar (include URL or filename in the screenshot caption).

### 1.3 What to write in your report

- Target URL and environment (staging / ALB / localhost).
- ZAP image tag or version.
- Whether the build **passed or warned** (`-l WARN` vs fail on high).

---

## 2. Wireshark (mandatory proof)

### 2.1 What to capture

| Deliverable | What it proves |
|-------------|----------------|
| **Screenshot** | You inspected live packets while using the app. |
| **1–2 sentences** | What filter you used and what you looked for (e.g. TLS vs plaintext). |

### 2.2 Suggested workflow

1. Start Wireshark on the correct interface (Wi‑Fi / Ethernet).
2. Use display filter examples:
   - `tcp.port == 443` — HTTPS to your server or ALB.
   - `http` — only if you **intentionally** test HTTP (expect sensitive data risk).
3. Reproduce a **login** and **ticket submit** while capturing.
4. **Screenshot**: show the packet list with **TLS** Application Data (encrypted) for HTTPS, or show **plain HTTP** if testing insecure mode (then document as a finding).

### 2.3 What to write

- Whether passwords/tokens appear **encrypted** on the wire (expected for HTTPS).
- If anything sensitive was visible in plaintext, tie it to a **fix** (HTTPS, HSTS, secure cookies) in section 4.

---

## 3. Burp Suite Community (mandatory proof)

### 3.1 What to capture

| Deliverable | What it proves |
|-------------|----------------|
| **Screenshot(s)** | Proxy is on; you intercepted at least one relevant request. |
| **Short note** | Which feature you tested (e.g. ticket form, admin API with key). |

### 3.2 Suggested tests

1. Configure browser to use Burp proxy; install Burp CA for HTTPS.
2. Intercept **POST** `/api/complaints` (customer token + body).
3. Try **parameter tampering** (e.g. change `email` to another user) — expect **403** if controls work.
4. **Screenshot**: Burp showing **Request** and **Response** for one meaningful attempt.

### 3.3 Safety

- **Redact** real `ADMIN_KEY`, database URLs, and tokens in screenshots or replace with `***`.

---

## 4. Fixing proof (mandatory)

### 4.1 Before-fix scan report

| Item | Your notes |
|------|------------|
| Tool | e.g. OWASP ZAP Baseline |
| Report file | e.g. `docs/evidence/zap-before/zap-report.html` |
| Date | |
| Top issues (IDs) | e.g. Missing header, Cookie flags, CSP, XSS — list ZAP alert names |

**Attach**: export or screenshot of summary table from the **before** report.

---

### 4.2 After-fix scan report

| Item | Your notes |
|------|------------|
| Report file | e.g. `docs/evidence/zap-after/zap-report.html` |
| Date | |
| Change in risk | e.g. fewer High/Medium alerts; closed issues listed |

**Attach**: summary screenshot **after** remediation and re-scan.

---

### 4.3 Explanation of fixes applied

Use this table (copy into your assignment).

| Finding (from ZAP / Burp / manual) | Root cause | Fix applied | File / config touched (examples) |
|--------------------------------------|------------|-------------|----------------------------------|
| Missing security headers | Reverse proxy default | Added Helmet + Apache headers | `middleware/security.js`, Ansible `httpd` |
| XSS / reflected input | Unescaped fields | `express-validator` `.escape()`, CSP | `routes/complaints.js`, Helmet CSP |
| SQL injection | String-built SQL | Parameterized queries | `db.js` |
| Weak session / token exposure | Plain HTTP | HTTPS on ALB, redirect HTTP→HTTPS | Terraform listener / Ansible |
| ... | ... | ... | ... |

**Re-test**: state that you **re-ran ZAP** (and optionally Burp) **after** fixes and reference the **after** report filename.

---

## 5. Folder layout (recommended)

```text
docs/
  SECURITY_EVIDENCE.md          ← this file
  evidence/
    zap-before/
      zap-report.html
      summary-screenshot.png
    zap-after/
      zap-report.html
      summary-screenshot.png
    burp/
      intercept-ticket-submit.png
    wireshark/
      tls-capture-login.png
```

---

## 6. One-line summary for your README

You can paste this into the root `README.md`:

> **Security evidence:** OWASP ZAP baseline (HTML + screenshots), Burp Suite request interception screenshots, Wireshark TLS/privacy screenshot, plus before/after ZAP reports and a short remediation table — see `docs/SECURITY_EVIDENCE.md`.

---

*ComplainHub: attachments on tickets are stored server-side and are not a substitute for HTTPS on production; always terminate TLS at the load balancer for the evidence in section 2 to be meaningful.*
