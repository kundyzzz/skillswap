# SkillSwap Frontend

React + Vite frontend for SkillSwap (Team 15). Sprint 1 scope, built from our Figma design and the API in `docs/api.md`.

## Screens

| Route | Screen (Figma) | User stories |
|---|---|---|
| `#/auth` | Sign up and log in | registration, login |
| `#/setup` | Profile setup (step 1 of 2) | US-02, US-11 (Show my contact) |
| `#/skills` | My skills (I can teach / I want to learn) | US-03, US-04, US-05 |
| `#/` | Home matches (Mutual match / Can teach you) | US-06 |
| `#/search` | Search students by subject and category | US-07 |
| `#/board` | Request board, "I can help" | US-08, US-09 |
| `#/profile` | My profile with missing-field states | US-01 |
| `#/users/:id` | Student profile + Contact button | US-01, US-10 |

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

## Database updates

For an existing `skillswap_db`, run once (in this order):

1. `backend/migrations/001_show_contact.sql`
2. `backend/migrations/002_request_board.sql`
3. optional demo data: `backend/demo-seed.sql` (5 demo students, password `password123`)

A new database only needs `schema.sql`, `seed.sql` (and optionally `demo-seed.sql`).

## Notes

- Profile photo upload from Figma is not in the API, so initials are used as the avatar.
