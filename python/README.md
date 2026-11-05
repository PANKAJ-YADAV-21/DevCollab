# DevCollab Python–MongoDB (PyMongo) Integration

This module fulfills the complete set of academic database requirements for the **DevCollab** developer-collaboration platform using **MongoDB** and **PyMongo**.

---

## 📋 Academic Requirements Mapping

| # | Academic Requirement | DevCollab Implementation | File / Component |
|---|---|---|---|
| **1** | **MongoDB Database** | Local MongoDB instance (`devcollab` db) or MongoDB Atlas via `MONGO_URI` connection pooling | [`python/config.py`](file:///Users/pankajyadav/Desktop/frugal%20testing/dev%20collab/python/config.py) |
| **2** | **PyMongo Driver** | Native Python driver connection, error handling, lifecycle management, BSON `ObjectId` conversion | [`python/config.py`](file:///Users/pankajyadav/Desktop/frugal%20testing/dev%20collab/python/config.py) |
| **3** | **Data Validation** | **Dual-Layer Validation**:<br>• Python-level schema rules (regex, types, bounds, dates, enums)<br>• MongoDB server-side `$jsonSchema` collection validators | [`python/validators.py`](file:///Users/pankajyadav/Desktop/frugal%20testing/dev%20collab/python/validators.py) |
| **4** | **CRUD Operations** | Complete lifecycle for Users, Teams, Projects, Tasks, and embedded Comments:<br>• **Create**: `insert_one`, `insert_many` (batch)<br>• **Read**: `find_one`, `find` with regex and projection<br>• **Update**: `find_one_and_update`, `$push`, `$addToSet`, `update_many`<br>• **Delete**: `delete_one`, `$pull` (embedded comment), `delete_many`, cascading cleanup | [`python/crud.py`](file:///Users/pankajyadav/Desktop/frugal%20testing/dev%20collab/python/crud.py) |
| **5** | **MongoDB Aggregations** | 5 multi-stage aggregation pipelines answering core product analytics questions (`$match`, `$group`, `$lookup`, `$unwind`, `$addFields`, `$project`, `$facet`, `$sort`) | [`python/aggregations.py`](file:///Users/pankajyadav/Desktop/frugal%20testing/dev%20collab/python/aggregations.py) |
| **6** | **DevCollab Scenario** | Modeled directly on DevCollab developer workflows (Kanban boards, sprint velocities, pull-request-style reviews, bug priorities, and developer workloads) | Entire module |

---

## 🚀 Quick Start & Execution

### 1. Requirements & Dependencies
Ensure Python 3.10+ is installed. Install required packages:
```bash
pip install -r python/requirements.txt
```
Dependencies:
- `pymongo>=4.6.0` (Native MongoDB driver)
- `python-dotenv>=1.0.0` (Environment variable loader)
- `tabulate>=0.9.0` (CLI formatted table output)
- `dnspython>=2.4.0` (DNS seed list resolver for `mongodb+srv://`)

### 2. Run Demonstration Runner
The runner executes a full end-to-end demonstration covering connection, validation, all CRUD operations, and all 5 aggregation pipelines:
```bash
python3 python/runner.py
```

### 3. Run Automated Test Suite
Execute the 21 automated unit and integration tests:
```bash
python3 -m unittest python/test_pymongo.py -v
```

---

## 🧱 Module Architecture

```text
python/
├── __init__.py           # Package marker
├── config.py             # MongoClient connection factory & connection health check
├── validators.py         # Dual validation: Python domain rules & DB-level $jsonSchema
├── crud.py               # Create, Read, Update, Delete methods for DevCollab entities
├── aggregations.py       # 5 advanced MongoDB aggregation analytical pipelines
├── runner.py             # Interactive demonstration runner with tabular outputs
├── test_pymongo.py       # Comprehensive 21-test automated suite (unittest)
└── requirements.txt      # Python dependencies
```

---

## 🔍 Detailed Component Documentation

### 1. Database Connection (`python/config.py`)
- Reads connection string from environment variable `MONGO_URI` (defaults to `mongodb://127.0.0.1:27017/devcollab`).
- Implements connection pooling (`maxPoolSize=50`, `minPoolSize=5`, `serverSelectionTimeoutMS=5000`).
- Provides `check_connection()` for diagnostic ping and metadata inspection (server version, database name, existing collections).

### 2. Dual-Layer Data Validation (`python/validators.py`)

#### A. Application Layer (Python Custom Validators)
- **User Validation** (`validate_user`): Validates email syntax via RFC 5322 regex, name length (2–50 chars), and role membership (`developer`, `team-lead`, `admin`).
- **Team Validation** (`validate_team`): Validates team name (2–50 chars) and creator `ObjectId`.
- **Project Validation** (`validate_project`): Enforces date ordering (`startDate <= deadline`), priority enum (`Low`, `Medium`, `High`, `Critical`), and status enum (`Planning`, `Active`, `On Hold`, `Completed`).
- **Task Validation** (`validate_task`): Enforces title length (2–100 chars), Kanban column status (`To Do`, `In Progress`, `In Review`, `Completed`), and priority.
- **Comment Validation** (`validate_comment`): Enforces non-empty text, max 1000 characters, and valid user `ObjectId`.

#### B. Database Layer (MongoDB `$jsonSchema` Validators)
Applied to collections via `collMod` / `validator`:
- `tasks`: Ensures documents contain required BSON types and allowed enum values for `status` and `priority`.
- `projects`: Ensures required fields (`name`, `team`, `creator`, `status`) and progress boundaries (`0 <= progress <= 100`).

### 3. CRUD Operations (`python/crud.py`)

| Operation Type | Method | Underlying MongoDB / PyMongo Operation |
|---|---|---|
| **Create** | `create_user` | `db.users.insert_one()` |
| **Create** | `create_team` | `db.teams.insert_one()` (with creator as initial Admin member) |
| **Create** | `create_project` | `db.projects.insert_one()` |
| **Create** | `create_task` | `db.tasks.insert_one()` |
| **Create** | `add_comment` | `db.tasks.find_one_and_update(..., {"$push": {"comments": comment}})` |
| **Create** | `batch_insert_tasks` | `db.tasks.insert_many()` |
| **Read** | `get_user_by_email` | `db.users.find_one({"email": ...})` |
| **Read** | `get_tasks_for_kanban` | `db.tasks.find({"project": ...}).sort(...)` |
| **Read** | `search_tasks` | `db.tasks.find({"$or": [{"title": regex}, ...]})` |
| **Update** | `update_task_status` | `db.tasks.find_one_and_update(..., {"$set": {"status": ...}})` |
| **Update** | `assign_member_to_project` | `db.projects.update_one(..., {"$addToSet": {"assignedMembers": ...}})` |
| **Update** | `bulk_update_task_priority` | `db.tasks.update_many({"project": ..., "priority": old}, {"$set": ...})` |
| **Delete** | `delete_comment` | `db.tasks.update_one(..., {"$pull": {"comments": {"_id": ...}}})` |
| **Delete** | `delete_task` | `db.tasks.delete_one({"_id": ...})` |
| **Delete** | `delete_completed_tasks` | `db.tasks.delete_many({"project": ..., "status": "Completed"})` |
| **Delete** | `delete_team_cascading` | Cascading cleanup: deletes team, then all its projects and their associated tasks |

### 4. Aggregation Pipelines (`python/aggregations.py`)

#### Pipeline 1: Project Kanban Status Distribution & Completion Rates
- **Question**: *What is the Kanban board breakdown and completion percentage for each project?*
- **Pipeline Stages**:
  1. `$match`: Filters out deleted or inactive tasks.
  2. `$group`: Groups by `project`, calculating counts for `To Do`, `In Progress`, `In Review`, and `Completed` using conditional `$cond` expressions.
  3. `$lookup`: Joins the `projects` collection to retrieve human-readable project metadata.
  4. `$unwind`: Flattens the joined project array.
  5. `$project`: Computes `completionRate = round((completed / totalTasks) * 100, 1)`.
  6. `$sort`: Orders by `totalTasks` descending.

#### Pipeline 2: Developer Workload & Critical Task Matrix
- **Question**: *Which developers are carrying the heaviest load and how many critical items do they have?*
- **Pipeline Stages**:
  1. `$match`: Filters for active tasks (`status != "Completed"`) with assigned developers.
  2. `$group`: Groups by `assignedDeveloper`, summing active tasks, critical tasks, high priority tasks, and calculating a weighted `workloadIndex`:
     $$\text{workloadIndex} = (\text{critical} \times 3) + (\text{high} \times 2) + (\text{medium} \times 1) + (\text{inProgress} \times 1)$$
  3. `$lookup`: Joins `users` to resolve developer name and role.
  4. `$unwind`: Flattens developer details.
  5. `$project`: Reshapes output fields.
  6. `$sort`: Orders by `workloadIndex` descending.

#### Pipeline 3: Team Collaboration & Comment Activity Leaderboard
- **Question**: *Which team members are actively participating in code discussions and task comments?*
- **Pipeline Stages**:
  1. `$match`: Matches tasks having at least one comment (`comments.0: {"$exists": True}`).
  2. `$unwind`: Deconstructs the embedded `comments` array into individual documents.
  3. `$group`: Groups by `comments.user`, counting total comments, unique tasks commented on via `$addToSet`, and latest feedback timestamp (`$max`).
  4. `$lookup`: Joins `users` collection for user profile and role.
  5. `$unwind`: Flattens user record.
  6. `$project`: Formats leaderboard statistics.
  7. `$sort`: Orders by `totalComments` descending.

#### Pipeline 4: Project Overdue Risk Analysis
- **Question**: *Which projects have tasks past their due date and what is the overdue risk ratio?*
- **Pipeline Stages**:
  1. `$match`: Monitors active tasks (`status != "Completed"`) with a specified `dueDate`.
  2. `$addFields`: Evaluates boolean `isOverdue` (`dueDate < now`) and overdue delay in days.
  3. `$group`: Aggregates per project: count of monitored tasks, overdue count, critical overdue count, and maximum days delayed.
  4. `$lookup`: Joins `projects` collection for project names.
  5. `$unwind`: Flattens project metadata.
  6. `$project`: Computes `overdueRiskPercentage = round((overdueCount / monitoredCount) * 100, 1)`.
  7. `$sort`: Orders by `overdueRiskPercentage` descending.

#### Pipeline 5: Multi-Dimensional Sprint Analytics (`$facet`)
- **Question**: *How can we retrieve sprint status breakdown, priority distribution, top urgent blockers, and summary metrics in a single database round-trip?*
- **Pipeline Stages**:
  - Uses `$facet` to execute 4 parallel sub-pipelines in one query:
    1. `byStatus`: Groups count by Kanban status column.
    2. `byPriority`: Groups count by priority level (`Low`, `Medium`, `High`, `Critical`).
    3. `topUrgentTasks`: Sorts and limits top 5 active tasks by urgency (`dueDate` ascending, `priority` descending).
    4. `summaryMetrics`: Computes total tasks, completed count, and total embedded comment activity.

---

## 🧪 Verification & Regression Testing

Both the new Python integration module and the existing Node.js / React application continue to function without conflicts or regressions:

- **PyMongo Automated Suite**: `python3 -m unittest python/test_pymongo.py -v` (21 tests, 100% pass)
- **PyMongo Demonstration Runner**: `python3 python/runner.py` (Exit code 0)
- **Existing Backend Audit Suite**: `npm run test:audit --prefix backend`
- **Existing Backend Phase 5 Suite**: `npm run test:phase5 --prefix backend`
- **Existing Frontend Production Build**: `npm run build --prefix frontend`
