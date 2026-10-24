# Accounts and sign-in

Visitors sign in with Google or GitHub to get a member account. The site admin uses a separate username and password login at `/admin/login`, which isn't linked anywhere in the app.

## How it fits together

| | Admin | Members |
|---|---|---|
| Stored in | `users` collection (`isAdmin: 1`) | `accounts` collection |
| Signs in with | `POST /api/auth/admin/login` (scrypt-hashed password) | `GET /api/auth/google` or `/api/auth/github` |
| Session length | 12 hours | 7 days |
| Can | add and edit movies | edit their display name, delete their account |

- Both kinds of session are a JWT in an HttpOnly `session` cookie (`SameSite=Lax`, `Path=/api`). The frontend never sees the token. It calls `GET /api/auth/me` to find out who is signed in.
- Every authenticated request reloads the admin or account record, so deleting an account or setting its `status` to `banned` signs that person out immediately.
- Accounts are matched on the provider's user id, never on email. Only Google emails marked verified are stored. GitHub is asked for no scopes, so no email is stored for GitHub accounts.
- Routes are protected with `@Auth('admin')`, `@Auth('member')` or `@Auth()` (any signed-in user) from `apps/api/src/auth/auth.decorator.ts`.

## Configuration

Add these keys to the API environment files (`environment.dev.ts` / `environment.prod.ts`):

```ts
publicUrl: 'https://your-domain',   // http://localhost:4200 in dev; https turns on Secure cookies
googleClientId: '',
googleClientSecret: '',
githubClientId: '',
githubClientSecret: '',
```

A provider with blank keys is turned off: its button doesn't appear and its routes return 404.

### Google

1. Google Cloud Console → APIs & Services → OAuth consent screen. Set up an External app with the `openid`, `email` and `profile` scopes. These scopes don't need Google's app verification.
2. Credentials → Create OAuth client ID → Web application.
3. Authorized redirect URIs: `http://localhost:4200/api/auth/google/callback` and `https://your-domain/api/auth/google/callback`.

### GitHub

GitHub OAuth apps allow one callback URL each, so create one app for dev and one for prod. Settings → Developer settings → OAuth Apps → New OAuth App, with callback URL `<publicUrl>/api/auth/github/callback`.

## Setting the admin password

Passwords are stored as scrypt hashes. A plain-text password in the database no longer works, so run this before deploying, and again whenever you want to change the password:

```sh
MONGODB_URI="<connection string>" node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/scripts/set-admin-password.mts <username>
```

It prompts for the new password (at least 12 characters) and also sets `isAdmin: 1`, which admin login now requires. Add `--create` to create the admin user in a fresh dev database.
