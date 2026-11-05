from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from pymongo.database import Database
from pymongo.collection import ReturnDocument

try:
    from python.config import get_database
    from python.validators import (
        validate_user,
        validate_team,
        validate_project,
        validate_task,
        validate_comment,
        ValidationError,
    )
except ImportError:
    from config import get_database
    from validators import (
        validate_user,
        validate_team,
        validate_project,
        validate_task,
        validate_comment,
        ValidationError,
    )


def _to_json_friendly(doc: Any) -> Any:
    """Recursively convert BSON ObjectIds and datetimes to serializable types."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [_to_json_friendly(item) for item in doc]
    if isinstance(doc, dict):
        res = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                res[k] = str(v)
            elif isinstance(v, datetime):
                res[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                res[k] = _to_json_friendly(v)
            else:
                res[k] = v
        # Ensure _id is also represented as id for convenience
        if "_id" in res and "id" not in res:
            res["id"] = res["_id"]
        return res
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc


class DevCollabCRUD:
    """
    CRUD operation manager implementing Create, Read, Update, and Delete
    for DevCollab developer collaboration entities.
    """

    def __init__(self, db: Optional[Database] = None):
        self.db = db if db is not None else get_database()
        self.users = self.db["users"]
        self.teams = self.db["teams"]
        self.projects = self.db["projects"]
        self.tasks = self.db["tasks"]

    # =================================================================
    # 1. CREATE OPERATIONS (insert_one, insert_many, $push)
    # =================================================================

    def create_user(
        self,
        name: str,
        email: str,
        password: str = "Password123!",
        role: str = "developer",
        skills: Optional[List[str]] = None,
        bio: str = "",
        avatar: str = "",
    ) -> Dict[str, Any]:
        """Create a new developer user document."""
        validated = validate_user({
            "name": name,
            "email": email,
            "password": password,
            "role": role,
            "skills": skills or [],
            "bio": bio,
            "avatar": avatar,
        })
        if self.users.find_one({"email": validated["email"]}):
            raise ValidationError(f"User with email '{validated['email']}' already exists", field="email")

        now = datetime.now(timezone.utc)
        doc = {
            **validated,
            "createdAt": now,
            "updatedAt": now,
        }
        res = self.users.insert_one(doc)
        doc["_id"] = res.inserted_id
        return _to_json_friendly(doc)

    def create_team(self, name: str, creator_id: Any, description: str = "") -> Dict[str, Any]:
        """Create a new software team with creator as initial Admin."""
        creator_oid = ObjectId(str(creator_id))
        validated = validate_team({
            "name": name,
            "description": description,
            "creator": creator_oid,
        })
        now = datetime.now(timezone.utc)
        doc = {
            **validated,
            "members": [
                {
                    "_id": ObjectId(),
                    "user": creator_oid,
                    "role": "Admin",
                    "joinedAt": now,
                }
            ],
            "createdAt": now,
            "updatedAt": now,
        }
        res = self.teams.insert_one(doc)
        doc["_id"] = res.inserted_id
        return _to_json_friendly(doc)

    def add_team_member(self, team_id: Any, user_id: Any, role: str = "Developer") -> bool:
        """Add a member to an existing team with a specified role."""
        t_oid = ObjectId(str(team_id))
        u_oid = ObjectId(str(user_id))
        team = self.teams.find_one({"_id": t_oid})
        if not team:
            raise ValidationError("Team not found", field="teamId")
        if any(str(m.get("user")) == str(u_oid) for m in team.get("members", [])):
            raise ValidationError("User is already a member of this team", field="userId")

        member_entry = {
            "_id": ObjectId(),
            "user": u_oid,
            "role": role,
            "joinedAt": datetime.now(timezone.utc),
        }
        res = self.teams.update_one(
            {"_id": t_oid},
            {"$push": {"members": member_entry}, "$set": {"updatedAt": datetime.now(timezone.utc)}},
        )
        return res.modified_count > 0

    def create_project(
        self,
        name: str,
        team_id: Any,
        creator_id: Any,
        description: str = "",
        status: str = "Planning",
        priority: str = "Medium",
        progress: int = 0,
        start_date: Optional[datetime] = None,
        deadline: Optional[datetime] = None,
        assigned_members: Optional[List[Any]] = None,
    ) -> Dict[str, Any]:
        """Create a new project within a team."""
        validated = validate_project({
            "name": name,
            "description": description,
            "team": team_id,
            "creator": creator_id,
            "status": status,
            "priority": priority,
            "progress": progress,
            "startDate": start_date,
            "deadline": deadline,
            "assignedMembers": assigned_members or [creator_id],
        })
        now = datetime.now(timezone.utc)
        doc = {
            **validated,
            "createdAt": now,
            "updatedAt": now,
        }
        res = self.projects.insert_one(doc)
        doc["_id"] = res.inserted_id
        return _to_json_friendly(doc)

    def create_task(
        self,
        title: str,
        project_id: Any,
        creator_id: Any,
        description: str = "",
        priority: str = "Medium",
        status: str = "To Do",
        assigned_developer: Optional[Any] = None,
        due_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Create a new Kanban task inside a project."""
        validated = validate_task({
            "title": title,
            "description": description,
            "project": project_id,
            "creator": creator_id,
            "priority": priority,
            "status": status,
            "assignedDeveloper": assigned_developer,
            "dueDate": due_date,
        })
        now = datetime.now(timezone.utc)
        doc = {
            **validated,
            "comments": [],
            "createdAt": now,
            "updatedAt": now,
        }
        res = self.tasks.insert_one(doc)
        doc["_id"] = res.inserted_id
        return _to_json_friendly(doc)

    def add_comment(self, task_id: Any, user_id: Any, text: str) -> Dict[str, Any]:
        """Append a discussion comment to a task using $push."""
        validated = validate_comment({"user": user_id, "text": text})
        res = self.tasks.find_one_and_update(
            {"_id": ObjectId(str(task_id))},
            {
                "$push": {"comments": validated},
                "$set": {"updatedAt": datetime.now(timezone.utc)},
            },
            return_document=ReturnDocument.AFTER,
        )
        if not res:
            raise ValidationError("Task not found", field="taskId")
        return _to_json_friendly(validated)

    def batch_insert_tasks(self, tasks_data: List[dict]) -> List[str]:
        """Demonstrate insert_many for batch task seeding."""
        validated_docs = []
        now = datetime.now(timezone.utc)
        for item in tasks_data:
            val = validate_task(item)
            val["comments"] = []
            val["createdAt"] = now
            val["updatedAt"] = now
            validated_docs.append(val)
        if not validated_docs:
            return []
        res = self.tasks.insert_many(validated_docs)
        return [str(oid) for oid in res.inserted_ids]

    # =================================================================
    # 2. READ OPERATIONS (find_one, find, regex search, projections)
    # =================================================================

    def get_user_by_id(self, user_id: Any) -> Optional[Dict[str, Any]]:
        """Find user by ObjectId."""
        doc = self.users.find_one({"_id": ObjectId(str(user_id))}, {"password": 0})
        return _to_json_friendly(doc)

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find user by unique email."""
        doc = self.users.find_one({"email": email.strip().lower()}, {"password": 0})
        return _to_json_friendly(doc)

    def get_team_by_id(self, team_id: Any) -> Optional[Dict[str, Any]]:
        """Find team by ID with all populated details."""
        doc = self.teams.find_one({"_id": ObjectId(str(team_id))})
        return _to_json_friendly(doc)

    def get_projects_by_team(self, team_id: Any, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve projects belonging to a team, with optional status filter."""
        query = {"team": ObjectId(str(team_id))}
        if status:
            query["status"] = status
        cursor = self.projects.find(query).sort("updatedAt", -1)
        return _to_json_friendly(list(cursor))

    def get_project_by_id(self, project_id: Any) -> Optional[Dict[str, Any]]:
        """Find project by ObjectId."""
        doc = self.projects.find_one({"_id": ObjectId(str(project_id))})
        return _to_json_friendly(doc)

    def get_tasks_for_kanban(
        self,
        project_id: Any,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_developer: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """
        Query tasks for Kanban board with multi-dimensional filtering.
        Leverages the compound index { project: 1, status: 1 }.
        """
        query = {"project": ObjectId(str(project_id))}
        if status and status != "ALL":
            query["status"] = status
        if priority and priority != "ALL":
            query["priority"] = priority
        if assigned_developer is not None:
            if assigned_developer == "unassigned":
                query["assignedDeveloper"] = None
            else:
                query["assignedDeveloper"] = ObjectId(str(assigned_developer))

        cursor = self.tasks.find(query).sort("updatedAt", -1)
        return _to_json_friendly(list(cursor))

    def search_tasks(self, keyword: str, project_id: Optional[Any] = None) -> List[Dict[str, Any]]:
        """Search tasks by title or description using case-insensitive regex."""
        pattern = {"$regex": keyword.strip(), "$options": "i"}
        query = {"$or": [{"title": pattern}, {"description": pattern}]}
        if project_id:
            query["project"] = ObjectId(str(project_id))

        cursor = self.tasks.find(query).limit(50)
        return _to_json_friendly(list(cursor))

    # =================================================================
    # 3. UPDATE OPERATIONS (update_one, update_many, $set, $addToSet)
    # =================================================================

    def update_task_status(self, task_id: Any, new_status: str) -> Optional[Dict[str, Any]]:
        """
        Update task Kanban status column (To Do, In Progress, In Review, Completed).
        Simulates drag-and-drop operations.
        """
        from python.validators import VALID_TASK_STATUSES
        if new_status not in VALID_TASK_STATUSES:
            raise ValidationError(f"Invalid status '{new_status}'", field="status")

        updated = self.tasks.find_one_and_update(
            {"_id": ObjectId(str(task_id))},
            {"$set": {"status": new_status, "updatedAt": datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )
        return _to_json_friendly(updated)

    def reassign_task(self, task_id: Any, new_developer_id: Optional[Any]) -> Optional[Dict[str, Any]]:
        """Reassign task to another developer (or unassign)."""
        dev_oid = ObjectId(str(new_developer_id)) if new_developer_id else None
        updated = self.tasks.find_one_and_update(
            {"_id": ObjectId(str(task_id))},
            {"$set": {"assignedDeveloper": dev_oid, "updatedAt": datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )
        return _to_json_friendly(updated)

    def update_project_progress(self, project_id: Any, progress: int, status: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update progress percentage and optional status."""
        val = int(progress)
        if val < 0 or val > 100:
            raise ValidationError("Progress must be between 0 and 100", field="progress")

        update_fields = {"progress": val, "updatedAt": datetime.now(timezone.utc)}
        if status:
            update_fields["status"] = status
        elif val == 100:
            update_fields["status"] = "Completed"

        updated = self.projects.find_one_and_update(
            {"_id": ObjectId(str(project_id))},
            {"$set": update_fields},
            return_document=ReturnDocument.AFTER,
        )
        return _to_json_friendly(updated)

    def assign_member_to_project(self, project_id: Any, user_id: Any) -> bool:
        """Assign member to project using $addToSet (prevents duplicates)."""
        res = self.projects.update_one(
            {"_id": ObjectId(str(project_id))},
            {
                "$addToSet": {"assignedMembers": ObjectId(str(user_id))},
                "$set": {"updatedAt": datetime.now(timezone.utc)},
            },
        )
        return res.modified_count > 0

    def bulk_update_task_priority(self, project_id: Any, old_priority: str, new_priority: str) -> int:
        """Demonstrate update_many by updating all matching tasks in a project."""
        res = self.tasks.update_many(
            {"project": ObjectId(str(project_id)), "priority": old_priority},
            {"$set": {"priority": new_priority, "updatedAt": datetime.now(timezone.utc)}},
        )
        return res.modified_count

    # =================================================================
    # 4. DELETE OPERATIONS (delete_one, delete_many, $pull, cascading)
    # =================================================================

    def delete_task(self, task_id: Any) -> bool:
        """Delete a single task document (delete_one)."""
        res = self.tasks.delete_one({"_id": ObjectId(str(task_id))})
        return res.deleted_count > 0

    def delete_comment(self, task_id: Any, comment_id: Any) -> bool:
        """Remove a comment subdocument from task comments array using $pull."""
        res = self.tasks.update_one(
            {"_id": ObjectId(str(task_id))},
            {
                "$pull": {"comments": {"_id": ObjectId(str(comment_id))}},
                "$set": {"updatedAt": datetime.now(timezone.utc)},
            },
        )
        return res.modified_count > 0

    def delete_completed_tasks(self, project_id: Any) -> int:
        """Delete all completed tasks in a project (delete_many)."""
        res = self.tasks.delete_many({
            "project": ObjectId(str(project_id)),
            "status": "Completed",
        })
        return res.deleted_count

    def delete_project_cascading(self, project_id: Any) -> Dict[str, int]:
        """Delete a project and automatically cascade deletion to all its tasks."""
        p_oid = ObjectId(str(project_id))
        task_res = self.tasks.delete_many({"project": p_oid})
        proj_res = self.projects.delete_one({"_id": p_oid})
        return {
            "projects_deleted": proj_res.deleted_count,
            "tasks_deleted": task_res.deleted_count,
        }

    def delete_team_cascading(self, team_id: Any) -> Dict[str, int]:
        """Delete a team, all associated projects, and all associated tasks."""
        t_oid = ObjectId(str(team_id))
        team_projects = list(self.projects.find({"team": t_oid}, {"_id": 1}))
        proj_ids = [p["_id"] for p in team_projects]

        tasks_res = self.tasks.delete_many({"project": {"$in": proj_ids}})
        projects_res = self.projects.delete_many({"team": t_oid})
        team_res = self.teams.delete_one({"_id": t_oid})

        return {
            "teams_deleted": team_res.deleted_count,
            "projects_deleted": projects_res.deleted_count,
            "tasks_deleted": tasks_res.deleted_count,
        }
