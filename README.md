# DevCollab – Developer Collaboration Platform

DevCollab is a full-stack developer collaboration platform designed for software teams to manage organizations, projects, and sprint workflows with real-time interactive Kanban boards and strict role-based access control.

---

## 🛠️ Tech Stack

- **Frontend**: React.js (v18), Vite, Tailwind CSS (Custom Dark Navy Theme), Lucide Icons, Axios
- **Backend**: Node.js, Express.js (ES Modules), CORS, Dotenv
- **Database**: MongoDB & Mongoose
- **Authentication**: JWT (JSON Web Tokens) with Bearer headers & bcryptjs password hashing
- **Workflow & UI**: HTML5 Drag and Drop Kanban Board with multi-dimensional filtering

---

## 📁 Project Structure

```
dev-collab/
├── package.json                   # Root workspace scripts (runs both services concurrently)
├── .gitignore                     # Production git ignore (secrets & build outputs excluded)
├── README.md                      # Complete project documentation & API guide
│
├── frontend/                      # React + Vite client
│   ├── index.html                 # HTML entry point with dark navy background
│   ├── vite.config.js             # Vite configuration with backend API proxy (Port 5001)
│   ├── tailwind.config.js         # Custom navy palette (#070b14) & modern blue accents
│   ├── postcss.config.js          # PostCSS configuration
│   ├── package.json               # Frontend dependencies & build scripts
│   └── src/
│       ├── main.jsx               # React DOM root entry point
│       ├── App.jsx                # Main application dashboard, navigation & auth session
│       ├── index.css              # Tailwind directives & custom scrollbars
│       └── components/
│           ├── AuthModal.jsx      # Modal for Sign In, Registration & test quick-switch
│           ├── TeamsView.jsx      # Team creation, member invitations & role management
│           ├── ProjectsView.jsx   # Project cards, status sliders & member assignments
│           ├── KanbanBoard.jsx    # 4-column drag-and-drop Kanban board with filters
│           ├── TaskCard.jsx       # Draggable task card with priority badges & due dates
│           └── TaskModal.jsx      # Task creation, editing & interactive comment thread
│
└── backend/                       # Node.js + Express REST API
    ├── .env                       # Local environment variables (Port 5001, Mongo URI, JWT secret)
    ├── .env.example               # Safe environment template with placeholders
    ├── package.json               # Backend dependencies & testing scripts
    ├── test_audit.js              # Phases 1–4 automated integration audit suite (50 tests)
    ├── test_phase5_tasks.js       # Phase 5 Kanban & Task automated audit suite (34 tests)
    └── src/
        ├── server.js              # Express app entry point, route mounts & error handlers
        ├── config/
        │   └── db.js              # Mongoose connection with decoupled local fallback
        ├── models/
        │   ├── User.js            # User model with bcrypt hashing & safe serialization
        │   ├── Team.js            # Team model with embedded member roles
        │   ├── Project.js         # Project model with deadlines, status & assigned members
        │   └── Task.js            # Task model with status, priority, developer & comments
        ├── controllers/
        │   ├── health.controller.js  # Diagnostic health-check controller
        │   ├── auth.controller.js    # Register, Login & Profile handlers
        │   ├── team.controller.js    # Team CRUD, invitations & role administration
        │   ├── project.controller.js # Project CRUD & member assignment
        │   └── task.controller.js    # Task CRUD, drag & drop status patch & comments
        ├── routes/
        │   ├── health.routes.js   # /api/health endpoint
        │   ├── auth.routes.js     # /api/auth endpoints
        │   ├── team.routes.js     # /api/teams endpoints
        │   ├── project.routes.js  # /api/projects endpoints
        │   └── task.routes.js     # /api/tasks endpoints
        ├── middlewares/
        │   ├── auth.middleware.js # JWT Bearer token authentication guard
        │   └── rbac.middleware.js # Role-based access control middleware
        └── utils/
            └── generateToken.js   # JWT signing utility
```

---

## 🚀 Installation & Running the Project

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MongoDB** Community Server running locally on `localhost:27017` (or MongoDB Atlas connection string)
- **npm** (v9.0.0 or higher)

### 2. Environment Configuration
Copy the template in the `backend/` directory:
```bash
cp backend/.env.example backend/.env
```
Default configuration (`backend/.env`):
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/devcollab
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
```

> **Port Notice**: macOS AirPlay Receiver uses port 5000 by default. DevCollab runs on **Port 5001** with Vite automatically proxying `/api` requests from `http://localhost:5173` to `http://localhost:5001`.

### 3. Install All Dependencies
From the root directory:
```bash
npm run install:all
```
*(This automatically runs `npm install` in both `backend` and `frontend` directories).*

### 4. Run Development Servers
From the root directory:
```bash
npm run dev
```
*(Runs backend on port 5001 and frontend on port 5173 concurrently).*

Alternatively, run each service independently:
```bash
# Terminal 1 - Backend API (Port 5001)
cd backend && npm run dev

# Terminal 2 - Frontend Client (Port 5173)
cd frontend && npm run dev
```

### 5. Production Build
To create a production-optimized frontend bundle:
```bash
npm run build:frontend
```

---

## 🧪 Automated Testing Suites

DevCollab includes two automated regression suites:

```bash
# 1. Run Phases 1-4 Audit (Auth, Teams, Projects, RBAC - 50 assertions)
cd backend && npm run test:audit

# 2. Run Phase 5 Audit (Tasks, Kanban Drag & Drop, Comments, RBAC - 34 assertions)
cd backend && npm run test:phase5
```

---

## 🔐 API Reference & Role-Based Permissions

All protected endpoints require the HTTP header:
```
Authorization: Bearer <JWT_TOKEN>
```

### 1. Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account with hashed password |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive signed JWT token |
| `GET` | `/api/auth/me` | Protected | Retrieve authenticated user profile (password omitted) |

---

### 2. Team Management & RBAC (`/api/teams`)

#### Team Permissions Matrix
| Action | Admin | Team Leader | Developer |
| :--- | :---: | :---: | :---: |
| **View Team & Member List** | ✅ | ✅ | ✅ |
| **Add Developers** | ✅ | ✅ | ❌ |
| **Add Team Leaders / Admins** | ✅ | ❌ | ❌ |
| **Change Member Roles** | ✅ | ❌ | ❌ |
| **Remove Developers** | ✅ | ✅ | ❌ |
| **Remove Leaders / Admins** | ✅ | ❌ | ❌ |
| **Delete Team** | ✅ | ❌ | ❌ |
| **Leave Team** | ✅ | ✅ | ✅ |

#### Team Endpoints
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/teams` | Authenticated | Create new team (creator becomes initial `Admin`) |
| `GET` | `/api/teams` | Authenticated | Get all teams belonging to current user |
| `GET` | `/api/teams/:teamId` | Team Members | Get team details and populated member roster |
| `POST` | `/api/teams/:teamId/members` | Admin, Team Leader | Add member by email (`Leader` can only add `Developer`) |
| `DELETE` | `/api/teams/:teamId/members/:userId` | Admin, Leader, Self | Remove member (Leader can only remove Devs; members can leave) |
| `PUT` | `/api/teams/:teamId/members/:userId/role` | Admin | Update member role (`Admin`, `Team Leader`, `Developer`) |
| `DELETE` | `/api/teams/:teamId` | Admin | Delete team (cascades deletion of all team projects & tasks) |

---

### 3. Project Management (`/api/projects`)

- **Statuses**: `Planning`, `Active`, `On Hold`, `Completed`
- **Priorities**: `Low`, `Medium`, `High`, `Critical`

#### Project Permissions Matrix
| Action | Admin | Team Leader | Developer |
| :--- | :---: | :---: | :---: |
| **View Team Projects** | ✅ | ✅ | ✅ |
| **View Project Details** | ✅ | ✅ | ✅ |
| **Create Project inside Team** | ✅ | ✅ | ❌ |
| **Edit Project Scope & Status** | ✅ | ✅ | ❌ |
| **Update Dates & Deadlines** | ✅ | ✅ | ❌ |
| **Assign Team Members** | ✅ | ✅ | ❌ |
| **Remove Assigned Members** | ✅ | ✅ | ❌ |
| **Unassign Themselves** | ✅ | ✅ | ✅ |
| **Delete Project** | ✅ | ❌ | ❌ |

#### Project Endpoints
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/projects` | Admin, Team Leader | Create a project within a team |
| `GET` | `/api/projects` | Team Members | List accessible projects (`?teamId=...`, `?status=...`) |
| `GET` | `/api/projects/:projectId` | Team Members | View project details and member roster |
| `PUT` | `/api/projects/:projectId` | Admin, Team Leader | Update name, description, status, progress, priority, dates |
| `POST` | `/api/projects/:projectId/members` | Admin, Team Leader | Assign team member to project |
| `DELETE` | `/api/projects/:projectId/members/:userId` | Admin, Leader, Self | Remove assigned member from project |
| `DELETE` | `/api/projects/:projectId` | Admin | Delete project (cascades deletion of all project tasks) |

---

### 4. Task Management & Kanban Board (`/api/tasks`)

- **Four Kanban Status Columns**: `To Do`, `In Progress`, `In Review`, `Completed`
- **Priorities**: `Low`, `Medium`, `High`, `Critical`

#### Task Permissions Matrix
| Action | Admin | Team Leader | Developer (Assigned) | Developer (Peer / Unassigned) | Outsider |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Project Tasks** | ✅ | ✅ | ✅ | ✅ | ❌ (403) |
| **Create Task** | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Edit Task Details** | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Assign / Reassign Developers** | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Drag & Update Status** | ✅ | ✅ | ✅ (Own Task) | ❌ (403) | ❌ (403) |
| **Delete Task** | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Post Comments** | ✅ | ✅ | ✅ | ✅ | ❌ (403) |
| **Delete Comments** | ✅ (Any) | ❌ (Own only) | ✅ (Own only) | ✅ (Own only) | ❌ (403) |

#### Task Endpoints
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/tasks` | Admin, Team Leader | Create task in project with priority, due date & developer |
| `GET` | `/api/tasks` | Team Members | Query tasks (`?projectId=...`, `?status=...`, `?priority=...`, `?assignedDeveloper=...`, `?search=...`) |
| `GET` | `/api/tasks/:taskId` | Team Members | Get full task details, assigned developer & populated comments |
| `PUT` | `/api/tasks/:taskId` | Admin, Team Leader | Edit task title, description, priority, dates & developer assignment |
| `PATCH` | `/api/tasks/:taskId/status` | Admin, Leader, Assigned Dev | Update status (`To Do`, `In Progress`, `In Review`, `Completed`) |
| `DELETE` | `/api/tasks/:taskId` | Admin, Team Leader | Delete task |
| `POST` | `/api/tasks/:taskId/comments` | Team Members | Post a comment to the task discussion thread |
| `DELETE` | `/api/tasks/:taskId/comments/:commentId` | Comment Author, Admin | Delete a comment |

---

## 🔒 Security Best Practices Implemented

- **Password Security**: Passwords salted and hashed with `bcryptjs` (cost factor 10); hashes never exposed in API outputs.
- **JWT Protection**: Signed JSON Web Tokens validated on every protected route via Express middleware.
- **Role Isolation**: Strict vertical and horizontal RBAC prevent unauthorized access across teams and projects.
- **Zero Secrets in Repository**: `.env` and sensitive configurations are strictly excluded via `.gitignore`.
- **Cascading Integrity**: Automatic unassignment and deletion cascades prevent orphaned records when teams or projects are deleted.
