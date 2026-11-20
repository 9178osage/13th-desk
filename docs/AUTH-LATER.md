# If sign-in is ever turned on

Eugene Desk ships with sign-in **off** (`VITE_AUTH_ENABLED` is `"false"` in
`.app-builder/app-env.json`, and only the exact string `"true"` turns it on). Everything a
visitor saves stays in their own browser under `13th-desk-v1`. `scripts/constraints.test.mjs`
fails the build if the flag default changes or an `/api/auth` or `/auth` route appears.

Flipping the flag is not enough on its own. Turning accounts on needs, at minimum:

1. **An account model**: what a user, a session and a device are, and how an account is
   deleted (with its data).
2. **Server-side authorization**: every server function checks the session and scopes every
   query to the signed-in user; nothing trusts a user id sent by the browser.
3. **A data-ownership migration**: a defined, reversible path from "this browser's desk" to
   "this account's desk", including what happens with several browsers and old backups.
4. **A privacy review**: what is stored, where, for how long, who can see it, and the
   notice shown to students (many are minors).
5. **No automatic upload of local data.** A desk saved in the browser is uploaded only after
   the visitor explicitly chooses to, and the local copy stays until they remove it.
