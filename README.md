# Playwright Codegen Studio

A local GUI tool to **record**, **parse**, and **save** Playwright test cases. Built with a clean frontend/backend separation.

---

## Project Structure

```
playwrightWeb/
├── backend/          # Express API server (port 3000)
│   ├── src/
│   │   ├── config/         # DB + app configuration
│   │   ├── repositories/   # Database access layer (Repository Pattern)
│   │   ├── services/       # Business logic (Service Layer)
│   │   ├── controllers/    # Request handlers (MVC)
│   │   ├── routes/         # Express routers
│   │   └── middleware/     # Error handler
│   ├── server.js           # Entry point
│   ├── config.json         # Target URL config
│   └── docker-compose.yml  # PostgreSQL container
│
└── frontend/         # Static UI (port 8080)
    ├── src/
    │   ├── services/       # API + Clipboard services
    │   ├── components/     # UI components (Toast, Modal, etc.)
    │   ├── pages/          # Page Object Model (MainPage)
    │   ├── controllers/    # Recording / TestList / Runner controllers
    │   └── main.js         # Entry point (DI wiring)
    ├── index.html
    └── style.css
```

---

## Getting Started

### 1. Start the Database

```bash
cd backend
npm run db:up
```

### 2. Install Playwright browsers (first time only)

```bash
cd backend
npm install
npm run playwright:install
```

### 3. Start the Backend API (port 3000)

```bash
cd backend
npm start
```

### 4. Start the Frontend (port 8080)

```bash
cd frontend
npm install
npm start
```

Then open **http://localhost:8080** in your browser.

---

## Architecture

| Principle | Implementation |
|---|---|
| SOLID - SRP | Each class/module has one responsibility |
| SOLID - OCP | New languages/reporters can be added without modifying existing code |
| SOLID - DIP | Controllers depend on service abstractions, not repositories directly |
| Repository Pattern | `testCase.repository.js` isolates all DB queries |
| Service Layer | Business logic lives in `*.service.js` files only |
| MVC (Backend) | Repository → Service → Controller → Router |
| Page Object Model | `MainPage.js` encapsulates all DOM refs |
| Observer Pattern | `run-test` custom events decouple TestList from Runner |
| Centralized Error Handling | `errorHandler.js` middleware |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/config` | Get app config |
| `POST` | `/api/record/start` | Start a codegen recording |
| `GET` | `/api/record/status` | Poll recording status |
| `POST` | `/api/test-cases` | Save a test case |
| `GET` | `/api/test-cases` | List all test cases |
| `DELETE` | `/api/test-cases/:id` | Delete a test case |
| `POST` | `/api/test-cases/:id/run` | Run a test case |
| `GET` | `/api/test-cases/run-status` | Poll run status |
| `GET` | `/reports/*` | Serve HTML test reports |
| `GET` | `/health` | Health check |
