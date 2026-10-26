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

## Comments

Anyone can read the comments on a movie page. Signed-in members and the admin can post, reply and like.

- **Threads are one level deep.** Replying to a reply files it under the same top-level comment and starts it with an @mention of the person being answered.
- **Authors** can edit their comments, which shows "(edited)", and delete them. A deleted top-level comment that still has replies stays as "[deleted]" so the thread makes sense. It goes away with its last reply.
- **The admin** gets an "Author" badge and can delete any comment. The admin can't edit other people's comments. **Ban** on a member's comment bans the account, signs that person out, and removes all of their comments. To undo a ban, set the account's `status` back to `active` in the database (the removed comments don't come back).
- The admin's comments show the admin user's `displayName`, or "Site author" when it's blank. The login username is never shown. Set a display name in the `users` collection to choose the name.
- Comments are plain text, up to 2000 characters. Posting is limited to 5 comments a minute per IP.
- When an account is deleted, its comments stay and show as "Deleted user".

### Notifications

People are notified when someone replies to their comment, or answers their reply with an @mention. They aren't notified about their own replies. The header bell polls `GET /api/notifications/unread-count` every minute and whenever the tab comes back into view. Opening the menu marks everything read. Clicking a notification opens the movie with that thread pinned at the top. Notifications are deleted after 90 days by a TTL index.
