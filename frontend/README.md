# SkillSwap Frontend

React + Vite frontend for SkillSwap (Team 15). Sprint 1 scope, built from our Figma design and the API in `docs/api.md`.

## Screens

| Route | Screen (Figma) | User stories |
|---|---|---|
| `#/auth` | Sign up and log in | registration, login |
| `#/setup` | Profile setup (step 1 of 2) | US-02, US-11 (contact) |
| `#/skills` | My skills (I can teach / I want to learn) | US-03, US-04, US-05 |
| `#/profile` | My profile with missing-field states | US-01 |
| `#/users/:id` | Another student's profile | US-01 |
| `#/` | Home (next steps; matches in Sprint 2) | — |

## Run locally

1. Start the backend first (see `backend/README.md`). It must run at `http://localhost:3000`.
2. Then:

```bash
cd frontend
npm install
cp .env.example .env     # Windows: copy .env.example .env
npm run dev
```

3. Open http://localhost:5173

## Configuration

`VITE_API_URL` in `.env` is the backend address. Default: `http://localhost:3000/api`.

## Project structure

```
src/
  api.js            all requests to the backend (one function per endpoint)
  auth.jsx          logged-in user + JWT token (AuthContext)
  router.jsx        small hash router (#/login, #/profile ...)
  utils.js          helpers (initials, levels, profile completion)
  components/       Header, Avatar, Page (background circles)
  pages/            AuthPage, ProfileSetup, MySkills, ProfilePage, Home
  index.css         design tokens and styles from Figma
```

## Notes for backend (Sprint 2)

- There is no endpoint that returns my own WhatsApp/Telegram, so the contact field in Profile setup cannot be pre-filled. A `GET /users/me` that includes `whatsapp` and `telegram` would fix this.
- Matching (`GET /matches`), search, request board and contact are not connected yet: they are planned for Sprint 2 in `docs/api.md`.
- Profile photo upload from Figma is not supported by the API yet, so initials are used as the avatar.
