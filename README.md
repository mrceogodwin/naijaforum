# Kilode

Nigeria’s live forum — feeds, chat, music, videos, ads. Talk Nigeria. Live.

- Site: [kilode.ng](https://kilode.ng)
- Repo: [github.com/mrceogodwin/naijaforum](https://github.com/mrceogodwin/naijaforum)

## Run

```bash
npm install
npm run dev
```

## Super admin

Not in the public menu. Tap the **square bang mark** (left of the Kilode word) **5 times**. Sign in with username + password. If the staff table is empty, tap **Claim super admin** once.

Do not grant another user the same super role. Sub-admins are `mod` or `admin` only.

## Auth

Users register with **username + password**. No public email. Login ids are private (`user@users.kilode.ng`). Old naijaforum logins still work.

## SEO

SSR titles, Open Graph, JSON-LD, `/robots.txt`, `/sitemap.xml`, and public posts at `/p/:id`.
