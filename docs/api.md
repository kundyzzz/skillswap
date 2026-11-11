# SkillSwap API

Base URL: `/api`
Format: JSON, field names in snake_case.
Protected endpoints require the header `Authorization: Bearer <jwt-token>`.

Error format (all endpoints):

{
  "error": { "code": "VALIDATION_ERROR", "message": "Email is invalid" }
}

Status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 404 Not Found, 409 Conflict (e.g. email already exists).

## 1. Authentication

### POST /auth/register

Register a new user.

Request:

{
  "name": "Student",
  "email": "student@example.com",
  "password": "password123",
  "university": "KBTU"
}

Response (201):

{
  "id": "user-id",
  "name": "Student",
  "email": "student@example.com"
}

### POST /auth/login

Authenticate an existing user.

Request:

{
  "email": "student@example.com",
  "password": "password123"
}

Response (200):

{
  "token": "jwt-token",
  "user_id": "user-id"
}

### GET /auth/me

Get the current user by token. Protected.

Response (200):

{
  "id": "user-id",
  "name": "Student",
  "email": "student@example.com"
}

## 2. Profile

### GET /users/:id

Get a public user profile. Protected.

Response (200):

{
  "id": "user-id",
  "name": "Student",
  "university": "KBTU",
  "faculty": "IT",
  "year": 2,
  "bio": "Love web development",
  "skills": [
    { "id": "user-skill-id", "skill_id": "skill-id", "name": "React", "category_id": "cat-id", "type": "teach", "level": "intermediate" }
  ]
}

Contact fields (WhatsApp/Telegram) are not returned here, see Sprint 2 section.

### PUT /users/me

Update own profile. Protected.

Request:

{
  "name": "Student",
  "university": "KBTU",
  "faculty": "IT",
  "year": 2,
  "bio": "Love web development",
  "whatsapp": "+77001234567",
  "telegram": "@student"
}

Response (200): updated profile (same format as GET /users/:id).

## 3. Categories

### GET /categories

Get the list of skill categories.

Response (200):

[
  { "id": "cat-id", "name": "Programming" },
  { "id": "cat-id-2", "name": "Mathematics" }
]

### GET /categories/:id/skills

Get skills inside a category.

Response (200):

[
  { "id": "skill-id", "name": "React", "category_id": "cat-id" }
]

## 4. Skills

### GET /skills

Get the skill directory. Optional filter: `?category=<category_id>`.

Response (200):

[
  { "id": "skill-id", "name": "React", "category_id": "cat-id" }
]

### GET /users/me/skills

Get own skills ("teach" and "learn"). Protected.

Response (200):

[
  { "id": "user-skill-id", "skill_id": "skill-id", "name": "React", "category_id": "cat-id", "type": "teach", "level": "intermediate" }
]

### POST /users/me/skills

Add a skill to own profile. Protected.

Request:

{
  "skill_id": "skill-id",
  "type": "teach",
  "level": "intermediate"
}

`type`: `teach` | `learn`. `level`: `beginner` | `intermediate` | `advanced`.

Response (201):

{
  "id": "user-skill-id",
  "skill_id": "skill-id",
  "name": "React",
  "category_id": "cat-id",
  "type": "teach",
  "level": "intermediate"
}

### PUT /users/me/skills/:id

Change type or level of an own skill. Protected.

Request:

{
  "type": "learn",
  "level": "beginner"
}

Response (200): updated user skill (same format as above).

### DELETE /users/me/skills/:id

Remove a skill from own profile. Protected.

Response: 204 No Content.

## 5. Sprint 2 (implemented)

- GET /matches: complementary students, mutual first (US-06)
- GET /search?subject=&category=: students who teach a subject; `subject` also matches a student's name (US-07)
- GET /requests, POST /requests, PATCH /requests/:id: public request board (US-08)
- POST /requests/:id/responses, DELETE /requests/:id/responses: "I can help" and cancelling it (US-09)
- GET /users/:id/contact: Telegram/WhatsApp (US-10, US-11, US-12 rules below)

## 6. Contact requests (US-12)

A contact is visible when its owner shares it publicly (`show_contact = true`) or after the owner
accepted a contact request (either direction). A mutual match does not open a hidden contact; it is
only shown as `mutual_match: true` to help the owner decide. Run `migrations/003_contact_requests.sql` once.

GET /users/:id now also returns, for the logged-in viewer: `has_contact`, `contact_public`,
`contact_available` (viewer can open it now), `mutual_match`, and
`contact_request: { id, status: pending|accepted|declined, direction: outgoing|incoming, message } | null`.

### GET /contact-requests

Protected. Response (200): `{ "incoming": [pending requests to me, with "from" card and "mutual_match"], "outgoing": [requests I sent] }`.

### POST /contact-requests

Protected. Request: `{ "to_user_id": "uuid", "message": "optional, up to 200 chars" }`. Response (201): the request.
Errors: 400 NO_CONTACT, 400 CONTACT_PUBLIC, 400 OWN_PROFILE, 404 USER_NOT_FOUND,
409 ALREADY_REQUESTED / ALREADY_ACCEPTED / DECLINED / INCOMING_PENDING.

### PATCH /contact-requests/:id

Protected, receiver only. Request: `{ "status": "accepted" | "declined" }`. Response (200). 404 when not pending.

### DELETE /contact-requests/:id

Protected, sender only, while pending. Response: 204 No Content.
