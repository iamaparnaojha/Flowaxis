# FlowAxis

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?logo=mongodb)
![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs)
![License](https://img.shields.io/badge/License-MIT-7C3AED)

> Built by [Aparna Ojha](https://github.com/iamaparnaojha) as a production-grade backend intern assignment.

FlowAxis is a project and task management platform with role-based access control, JWT authentication with refresh token rotation, Redis caching, and a Next.js frontend with a "precise and technical" design identity. Every architectural decision here was made deliberately — this isn't boilerplate, it's a working system I would ship.

---

## Tech Stack

| Layer | Technology | Why I chose it |
|---|---|---|
| Runtime | Node.js 18+ | LTS stability, native fetch, excellent async performance |
| Framework | Express 4 | I know its ecosystem deeply; the feature-based structure I built compensates for its lack of opinion |
| Database | MongoDB + Mongoose | Flexible schema for evolving project/task models; Mongoose gives me schema enforcement at the application layer |
| Cache | Redis (ioredis) | Sub-millisecond list reads; ioredis has the best retry and cluster support in the Node ecosystem |
| Auth | JWT (access + refresh) | Stateless by design — scales horizontally without a shared session store |
| Validation | Zod | Schema inference doubles as documentation; more composable than Joi for complex nested types |
| Frontend | Next.js 14 (App Router) | Server-first rendering + React ecosystem; I used client components deliberately only where state is needed |
| HTTP Client | Axios | Interceptor API is clean and well-tested for the silent refresh pattern I implemented |

---

## Project Structure

```
flowaxis/
├── backend/
│   ├── src/
│   │   ├── config/         — env validation, db, redis, swagger
│   │   ├── modules/
│   │   │   ├── auth/       — register, login, refresh, logout
│   │   │   ├── users/      — profile + admin user management
│   │   │   ├── projects/   — full CRUD + member management + status transitions
│   │   │   └── tasks/      — nested under projects, status transitions, priority
│   │   ├── middleware/     — authenticate, authorize, errorHandler, rateLimiter, validate
│   │   ├── utils/          — ApiError, ApiResponse, asyncHandler, logger
│   │   └── db/             — connection + seed script
│   ├── app.js
│   └── server.js
└── frontend/
    └── src/
        ├── app/            — Next.js App Router pages
        ├── components/     — UI primitives + layout + project components
        ├── context/        — AuthContext (in-memory token + silent refresh)
        ├── hooks/          — useAuth, useToast
        └── services/       — api.js with axios instance + interceptors
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or Redis Cloud)

### 1. Clone the repository

```bash
git clone https://github.com/iamaparnaojha/flowaxis.git
cd flowaxis
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, REDIS_URL

# Frontend
cp frontend/.env.local.example frontend/.env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### 3. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Seed the database

```bash
cd backend && npm run seed
```

This creates:
- **Admin**: `admin@flowaxis.dev` / `Admin@flowaxis1`
- **Demo user**: `demo@flowaxis.dev` / `Demo@flowaxis1`
- A sample project with two tasks

### 5. Run the development servers

```bash
# Terminal 1 — Backend (port 8080)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

### 6. Access the app

| Resource | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8080/api/v1 |
| Swagger Docs | http://localhost:8080/api/v1/docs |
| Health Check | http://localhost:8080/health |

---

## API Reference

### Auth (`/api/v1/auth`) — Rate limited: 10 requests / 15 minutes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register a new user |
| POST | `/auth/login` | — | Login → access token + refresh cookie |
| POST | `/auth/refresh` | Cookie | Rotate refresh token |
| POST | `/auth/logout` | Bearer | Revoke current session |

### Users (`/api/v1/users`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Bearer | Get own profile |
| PATCH | `/users/me` | Bearer | Update own profile |
| GET | `/users` | Bearer + Admin | List all users |
| DELETE | `/users/:id` | Bearer + Admin | Delete a user |

### Projects (`/api/v1/projects`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/projects` | Bearer | Create a project |
| GET | `/projects` | Bearer | List my projects (cached) |
| GET | `/projects/:id` | Bearer + Member | Get project detail (cached) |
| PATCH | `/projects/:id` | Bearer + Editor | Update project |
| DELETE | `/projects/:id` | Bearer + Owner | Delete project |
| PATCH | `/projects/:id/status` | Bearer + Editor | Status transition |
| POST | `/projects/:id/members` | Bearer + Owner | Add member |
| DELETE | `/projects/:id/members/:userId` | Bearer + Owner | Remove member |

### Tasks (`/api/v1/projects/:projectId/tasks`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/tasks` | Bearer + Member | Create a task |
| GET | `/tasks` | Bearer + Member | List tasks (cached) |
| GET | `/tasks/:taskId` | Bearer + Member | Get task detail |
| PATCH | `/tasks/:taskId` | Bearer + Assignee | Update task |
| PATCH | `/tasks/:taskId/status` | Bearer + Member | Status transition |
| DELETE | `/tasks/:taskId` | Bearer + Owner | Delete task |

---

## Design Decisions

**Why feature-based folders instead of MVC?**
MVC tends to create files that are conceptually related but physically scattered. A feature folder keeps `auth.controller`, `auth.service`, `auth.routes`, and `auth.schema` together — when I need to modify auth, I work in one directory, not four.

**Why in-memory token storage instead of localStorage?**
localStorage is readable by any JavaScript on the page, including injected scripts from XSS. An in-memory variable in a JS module is invisible to attackers who don't have full code execution. The trade-off (lost on refresh) is handled by a silent refresh call on every app mount using the httpOnly cookie.

**Why refresh token rotation?**
A single long-lived refresh token is a single point of compromise. Rotation means each use generates a new token and invalidates the old one. If an attacker steals a refresh token and uses it after the legitimate user already has, the server detects the reuse and revokes all tokens for that user — a security tripwire.

**Why Zod over Joi for validation?**
Zod schemas are TypeScript-native (even in JS, the inference is clean), chainable, and produce error objects that map directly to my `ApiError` shape. I also use the same Zod schema in `config/env.js` to validate environment variables at startup — one validation library, multiple uses.

**Why services handle business logic, not controllers?**
Controllers are I/O boundary layers — they translate HTTP into function calls. If I ever want to add a CLI, a cron job, or a WebSocket handler, the service layer is reusable without touching any Express code. This separation also makes unit testing trivial: mock the service, test the controller in isolation.

---

## Scalability Note

See [docs/SCALABILITY.md](./docs/SCALABILITY.md) for the full discussion. The short version: stateless JWT design + Redis caching + MongoDB indexing means FlowAxis can scale horizontally behind a load balancer without any architectural changes.

---

## Screenshots

> _Add screenshots here after running the app locally_

---

## License

MIT
