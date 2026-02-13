# Frontend & Backend Structure

MayaGen is a monorepo-style project containing two distinct applications:

1.  **Frontend**: `mayagen-fe` (Next.js)
2.  **Backend**: `mayagen-be` (FastAPI)

## 1. Directory Structure

### Backend (`mayagen-be/`)

```bash
mayagen-be/
├── app/
│   ├── api/            # API Route implementations
│   ├── core/           # Config, Security, Events
│   ├── services/       # AI Integration (Azure/Flux logic)
│   ├── workers/        # Background processing
│   ├── models.py       # SQLModel definitions
│   └── database.py     # DB Connection logic
├── docs/               # Architecture & Workflow documentation
├── synthetic_dataset/  # Storage for generated images
├── tests/              # Pytest suite
├── run_server.py       # Entry point (spawns API + Worker)
└── pyproject.toml      # Dependencies
```

### Frontend (`mayagen-fe/`)

```bash
mayagen-fe/
├── src/
│   ├── app/            # Next.js App Router pages
│   │   ├── (auth)/     # Login/Callback routes
│   │   ├── edit/       # Image Editor
│   │   ├── bulk-edit/  # Bulk Processing Wizard
│   │   └── gallery/    # Image browser
│   ├── components/     # UI Components
│   │   ├── ui/         # Shadcn Primitives (Button, Dialog...)
│   │   └── shared/     # App-specific components (NavBar, Cards)
│   ├── lib/            # Utilities & API Clients
│   └── hooks/          # Custom React Hooks
└── public/             # Static assets
```

## 2. Integration Points

### API Contract (OpenAPI)
The backend exposes a comprehensive OpenAPI schema at `/openapi.json`. The frontend consumes this API using standard `fetch` or `axios` calls wrapper in `src/lib/api.ts`.

*   **Base URL**: `http://localhost:8000/api/v1`
*   **Static Files**: `http://localhost:8000/images/` -> Serves `synthetic_dataset/`

### Authentication Flow
1.  **Frontend** redirects user to Google OAuth.
2.  **Google** redirects back to Frontend (`/auth/callback`) with a `code`.
3.  **Frontend** sends `code` to Backend (`POST /auth/google/callback`).
4.  **Backend** validates code, creates/retrieves User, issues **JWT Access Token**.
5.  **Frontend** stores JWT (localStorage/Cookie) and attaches it to `Authorization: Bearer <token>` header for all subsequent requests.

### Real-Time Updates
*   **Polling**: The frontend polls endpoint status (e.g., `GET /batch/{id}`) to update progress bars.
*   **Optimistic Updates**: The UI assumes success for immediate feedback (e.g., "Queued" status) before the server confirms.
