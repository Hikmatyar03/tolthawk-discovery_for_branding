# ToltHawk brand discovery (KreaitX)

Static site + one serverless function (`api/data.js`).

## Deploy on Vercel
1. Put this folder in a Git repo and import it in Vercel (or run `vercel` in this folder).
2. In the Vercel project: Storage / Marketplace, add **Upstash Redis** and connect it to the project. This adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars.
3. Add an env var `ADMIN_KEY` with a long random value.
4. Redeploy.
5. Send the client the site URL. Open `/admin.html` and enter your `ADMIN_KEY` to read answers and comments, reply as KreaitX, and download JSON or text.

Answers and the current position autosave while the client types. "Save progress" gives the client a resume link (`?r=...`) that restores answers and place on any device. Comments are per page and visible to everyone who opens the link.
