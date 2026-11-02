
# SkillSwap Backend

Backend API for the SkillSwap project.

## Requirements

- Node.js
- PostgreSQL
- Git

## 1. Clone the repository

```bash
git clone -b dev https://github.com/kundyzzz/skillswap.git
cd skillswap/backend
```

## 2. Install dependencies

```bash
npm install
```

## 3. Create the database

Create a PostgreSQL database named:

skillswap_db

Run the SQL files in this order:

1. schema.sql
2. seed.sql

## 4. Configure environment variables

Copy `.env.example` to a new file named `.env`.

Update the values in `.env`:

- DB_PASSWORD: your local PostgreSQL password
- JWT_SECRET: your own long random secret

Do not upload `.env` to GitHub.

## 5. Start the backend

```bash
npm start
```

Backend runs at:

http://localhost:3000

## 6. Test the API

Open in your browser:

http://localhost:3000/api/health

Expected response:

```json
{
  "status": "ok"
}
```

## 7. API documentation

See `docs/api.md` in the repository.

API base URL:

http://localhost:3000/api

Protected endpoints require:

Authorization: Bearer YOUR_JWT_TOKEN
```
