import re
from datetime import datetime, timezone
from bson import ObjectId
from pymongo.database import Database

# Permitted domain enums matching DevCollab specifications
VALID_GLOBAL_ROLES = ["developer", "team-lead", "admin"]
VALID_TEAM_ROLES = ["Admin", "Team Leader", "Developer"]
VALID_PROJECT_STATUSES = ["Planning", "Active", "On Hold", "Completed"]
VALID_PRIORITIES = ["Low", "Medium", "High", "Critical"]
VALID_TASK_STATUSES = ["To Do", "In Progress", "In Review", "Completed"]

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class ValidationError(Exception):
    """Custom exception raised when document validation fails."""
    def __init__(self, message: str, field: str = None):
        super().__init__(message)
        self.message = message
        self.field = field

    def to_dict(self):
        return {"error": "ValidationError", "field": self.field, "message": self.message}


def _ensure_object_id(val, field_name: str) -> ObjectId:
    if isinstance(val, ObjectId):
        return val
    if isinstance(val, str) and ObjectId.is_valid(val):
        return ObjectId(val)
    raise ValidationError(f"Invalid ObjectId format for field '{field_name}'", field=field_name)


def validate_user(data: dict) -> dict:
    """Validate user registration / profile document."""
    if not isinstance(data, dict):
        raise ValidationError("User payload must be a dictionary")

    name = data.get("name")
    if not name or not isinstance(name, str) or len(name.strip()) < 2 or len(name.strip()) > 50:
        raise ValidationError("User name must be between 2 and 50 characters", field="name")

    email = data.get("email")
    if not email or not isinstance(email, str) or not EMAIL_REGEX.match(email.strip()):
        raise ValidationError("A valid email address is required", field="email")

    password = data.get("password")
    if password is not None:
        if not isinstance(password, str) or len(password) < 6:
            raise ValidationError("Password must be at least 6 characters long", field="password")

    role = data.get("role", "developer")
    if role not in VALID_GLOBAL_ROLES:
        raise ValidationError(f"Invalid global role '{role}'. Allowed: {VALID_GLOBAL_ROLES}", field="role")

    skills = data.get("skills", [])
    if not isinstance(skills, list):
        raise ValidationError("Skills must be a list of strings", field="skills")

    return {
        "name": name.strip(),
        "email": email.strip().lower(),
        "role": role,
        "avatar": data.get("avatar", ""),
        "bio": data.get("bio", "")[:250],
        "skills": [str(s).strip() for s in skills if s],
    }


def validate_team(data: dict) -> dict:
    """Validate team creation document."""
    if not isinstance(data, dict):
        raise ValidationError("Team payload must be a dictionary")

    name = data.get("name")
    if not name or not isinstance(name, str) or len(name.strip()) < 2 or len(name.strip()) > 60:
        raise ValidationError("Team name must be between 2 and 60 characters", field="name")

    creator = _ensure_object_id(data.get("creator"), "creator")

    return {
        "name": name.strip(),
        "description": data.get("description", "").strip()[:300],
        "creator": creator,
    }


def validate_project(data: dict) -> dict:
    """Validate project creation and update document."""
    if not isinstance(data, dict):
        raise ValidationError("Project payload must be a dictionary")

    name = data.get("name")
    if not name or not isinstance(name, str) or len(name.strip()) < 2 or len(name.strip()) > 100:
        raise ValidationError("Project name must be between 2 and 100 characters", field="name")

    team = _ensure_object_id(data.get("team"), "team")
    creator = _ensure_object_id(data.get("creator"), "creator")

    status = data.get("status", "Planning")
    if status not in VALID_PROJECT_STATUSES:
        raise ValidationError(f"Invalid project status '{status}'. Allowed: {VALID_PROJECT_STATUSES}", field="status")

    priority = data.get("priority", "Medium")
    if priority not in VALID_PRIORITIES:
        raise ValidationError(f"Invalid priority '{priority}'. Allowed: {VALID_PRIORITIES}", field="priority")

    progress = data.get("progress", 0)
    try:
        progress_val = int(progress)
        if progress_val < 0 or progress_val > 100:
            raise ValueError()
    except (TypeError, ValueError):
        raise ValidationError("Project progress must be an integer between 0 and 100", field="progress")

    start_date = data.get("startDate")
    deadline = data.get("deadline")

    if start_date and deadline:
        sd = datetime.fromisoformat(str(start_date).replace("Z", "+00:00")) if isinstance(start_date, str) else start_date
        dl = datetime.fromisoformat(str(deadline).replace("Z", "+00:00")) if isinstance(deadline, str) else deadline
        if sd > dl:
            raise ValidationError("Project start date cannot be later than the deadline", field="dates")

    return {
        "name": name.strip(),
        "description": data.get("description", "").strip()[:1000],
        "team": team,
        "creator": creator,
        "status": status,
        "priority": priority,
        "progress": progress_val,
        "startDate": start_date,
        "deadline": deadline,
        "assignedMembers": [_ensure_object_id(m, "assignedMembers") for m in data.get("assignedMembers", [])],
    }


def validate_task(data: dict) -> dict:
    """Validate task creation and update document."""
    if not isinstance(data, dict):
        raise ValidationError("Task payload must be a dictionary")

    title = data.get("title")
    if not title or not isinstance(title, str) or len(title.strip()) < 2 or len(title.strip()) > 100:
        raise ValidationError("Task title must be between 2 and 100 characters", field="title")

    project = _ensure_object_id(data.get("project"), "project")
    creator = _ensure_object_id(data.get("creator"), "creator")

    status = data.get("status", "To Do")
    if status not in VALID_TASK_STATUSES:
        raise ValidationError(f"Invalid task status '{status}'. Allowed: {VALID_TASK_STATUSES}", field="status")

    priority = data.get("priority", "Medium")
    if priority not in VALID_PRIORITIES:
        raise ValidationError(f"Invalid task priority '{priority}'. Allowed: {VALID_PRIORITIES}", field="priority")

    assigned_dev = data.get("assignedDeveloper")
    assigned_dev_id = _ensure_object_id(assigned_dev, "assignedDeveloper") if assigned_dev else None

    return {
        "title": title.strip(),
        "description": data.get("description", "").strip()[:2000],
        "project": project,
        "creator": creator,
        "assignedDeveloper": assigned_dev_id,
        "status": status,
        "priority": priority,
        "dueDate": data.get("dueDate"),
    }


def validate_comment(data: dict) -> dict:
    """Validate task comment document."""
    if not isinstance(data, dict):
        raise ValidationError("Comment payload must be a dictionary")

    user = _ensure_object_id(data.get("user"), "user")
    text = data.get("text")
    if not text or not isinstance(text, str) or len(text.strip()) == 0:
        raise ValidationError("Comment text cannot be empty", field="text")
    if len(text.strip()) > 1000:
        raise ValidationError("Comment text cannot exceed 1000 characters", field="text")

    return {
        "_id": ObjectId(),
        "user": user,
        "text": text.strip(),
        "createdAt": datetime.now(timezone.utc),
    }


# =====================================================================
# MongoDB Server-Level $jsonSchema Validation Rules
# =====================================================================

TASK_JSON_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["title", "project", "creator", "status", "priority"],
        "properties": {
            "title": {
                "bsonType": "string",
                "minLength": 2,
                "maxLength": 100,
                "description": "must be a string between 2 and 100 characters and is required",
            },
            "description": {
                "bsonType": "string",
                "maxLength": 2000,
                "description": "must be a string up to 2000 characters",
            },
            "project": {
                "bsonType": "objectId",
                "description": "must be an ObjectId referencing project and is required",
            },
            "creator": {
                "bsonType": "objectId",
                "description": "must be an ObjectId referencing creator user",
            },
            "assignedDeveloper": {
                "bsonType": ["objectId", "null"],
                "description": "must be an ObjectId referencing assigned developer or null",
            },
            "status": {
                "enum": ["To Do", "In Progress", "In Review", "Completed"],
                "description": "must be one of: 'To Do', 'In Progress', 'In Review', 'Completed'",
            },
            "priority": {
                "enum": ["Low", "Medium", "High", "Critical"],
                "description": "must be one of: 'Low', 'Medium', 'High', 'Critical'",
            },
        },
    }
}

PROJECT_JSON_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["name", "team", "creator", "status"],
        "properties": {
            "name": {
                "bsonType": "string",
                "minLength": 2,
                "maxLength": 100,
                "description": "must be a string between 2 and 100 chars and is required",
            },
            "team": {
                "bsonType": "objectId",
                "description": "must be an ObjectId referencing team",
            },
            "status": {
                "enum": ["Planning", "Active", "On Hold", "Completed"],
                "description": "must be one of: 'Planning', 'Active', 'On Hold', 'Completed'",
            },
            "priority": {
                "enum": ["Low", "Medium", "High", "Critical"],
            },
            "progress": {
                "bsonType": ["int", "double", "long"],
                "minimum": 0,
                "maximum": 100,
            },
        },
    }
}


def apply_db_validators(db: Database) -> dict:
    """
    Apply MongoDB server-side $jsonSchema validators to tasks and projects collections.
    """
    results = {}
    existing = db.list_collection_names()

    # Apply task validator
    try:
        if "tasks" in existing:
            db.command("collMod", "tasks", validator=TASK_JSON_SCHEMA, validationLevel="moderate")
        else:
            db.create_collection("tasks", validator=TASK_JSON_SCHEMA)
        results["tasks"] = "Validator applied successfully"
    except Exception as e:
        results["tasks"] = f"Warning: {str(e)}"

    # Apply project validator
    try:
        if "projects" in existing:
            db.command("collMod", "projects", validator=PROJECT_JSON_SCHEMA, validationLevel="moderate")
        else:
            db.create_collection("projects", validator=PROJECT_JSON_SCHEMA)
        results["projects"] = "Validator applied successfully"
    except Exception as e:
        results["projects"] = f"Warning: {str(e)}"

    return results
