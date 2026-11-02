# Production deploys and CI

Vercel's Git integration builds and promotes every push to `main` on its own.
GitHub Actions (`Tests, types, lint and build`, `Every external link answers`)
run in parallel; there is no safe in-repo setting that makes Vercel wait for them:

- `ignoreCommand` polling the GitHub API from the build is racy and needs a token.
- Deploying from Actions with the Vercel CLI needs a `VERCEL_TOKEN` secret and
  turning off Git auto-deploys — an account-level change.

Platform-side options (owner decision):

1. Vercel → Project → Settings → Git: enable deployment checks / "Wait for
   checks" so production is promoted only after the GitHub checks pass.
2. GitHub branch protection on `main` requiring both checks before merge.

Until then: run `npm run test:desk && npm test && npm run build` locally before
pushing, and verify Actions after every push.
