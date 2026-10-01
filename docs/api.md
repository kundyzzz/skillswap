# SkillSwap API

## 1. Authentication

### POST /auth/register

Register a new user.


Request:

{
  "name": "Student",
  "email": "student@example.com",
  "password": "password123"
}

Response:

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

Response:

{
  "token": "jwt-token",
  "user_id": "user-id"
}

### Groups
### POST /groups

Create a new skill-sharing group.

Request:

{
  "name": "Web Development",
  "description": "Students learning web development"
}

Response:

{
  "id": "group-id",
  "name": "Web Development",
  "description": "Students learning web development"
}
