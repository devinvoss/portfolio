# rn-portfolio

The portfolio site (`apps/ng-portfolio`) rebuilt with React Native and Expo, for iOS, Android and the web. It talks to the same NestJS API (`apps/api`) and shares its types from `@portfolio/models`.

## Running it

Start the API (`npm run start:api`), then:

```sh
npm run start:rn            # Expo dev server: scan the QR code with Expo Go, or press w for the web
npx nx serve rn-portfolio   # web only, at http://localhost:8081
```

`npm run start:rn` runs `expo start` in this folder rather than going through Nx. Expo only draws the QR code and takes keyboard shortcuts when it has the terminal to itself, and `nx start rn-portfolio` gets in between, so that one only prints the server address.

In development the app finds the API on the machine running Metro, at port 3333. Expo Go on your phone uses that machine's LAN address, so the phone and the PC need to be on the same network, and Windows Firewall has to let port 3333 in. To point the app at a different API, set `EXPO_PUBLIC_API_URL`:

```sh
EXPO_PUBLIC_API_URL=https://devinvoss.dev/api npm run start:rn
```

Production builds use `https://devinvoss.dev/api`.

Expo Go only runs the latest Expo SDK, so keep `expo` and its packages on the current SDK (`npx expo install --fix` from this folder lists anything out of step).

## What's here

| Website | App |
|---|---|
| Home | `src/app/home.tsx` |
| Devin's Watched, Recommendations (search, filters, infinite scroll) | `src/app/movie/index.tsx`, `src/app/recommendations/index.tsx` |
| Movie and recommendation pages, poster viewer, comments, likes, replies | `src/app/movie/detail/[id].tsx`, `src/app/recommendations/[id].tsx` |
| Recommend a movie (TMDB search) | `src/app/recommendations/add.tsx` |
| Sign in, account, notifications | `src/app/login.tsx`, `src/app/account.tsx`, the header |

Routes are files in `src/app` (Expo Router); the screens themselves are in `src/features`. Notification links use `?comment=<id>` where the website uses `#comment-<id>`.

Not here yet: the admin screens (admin login, adding and editing movies, ImageKit uploads, converting recommendations). The comment moderation buttons are in place for when the admin can sign in.

## Signing in

The website keeps its session in an HttpOnly cookie, which a native app can't use. The app signs in like this instead:

1. It opens `/api/auth/<provider>?redirectUri=…&codeChallenge=…` in an in-app browser.
2. After Google or GitHub, the API sends the browser back to the app with a one-time code (`rnportfolio://auth?code=…`, or `exp://<your PC>/--/auth?code=…` in Expo Go).
3. The app trades the code and its PKCE verifier for the session JWT at `POST /api/auth/app/token`, keeps it in SecureStore (localStorage on the web) and sends it as `Authorization: Bearer <token>`.

See "Mobile app sign-in" in `docs/ACCOUNTS.md` for what the API allows.

**Testing sign-in on a phone in development:** Google and GitHub send the browser to the API's `publicUrl` (`http://localhost:4200` in dev), which your phone can't reach. Sign-in works on the web build on your PC, or on the phone against an API it can reach over https (for example the live site once these API changes are deployed). Everything that doesn't need an account works on the phone in development.

## Tests

```sh
npx nx test rn-portfolio
npx nx lint rn-portfolio
```
