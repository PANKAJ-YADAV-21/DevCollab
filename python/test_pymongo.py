"""
DevCollab - Python & PyMongo Automated Test Suite
================================================
Comprehensive test suite verifying all 6 academic requirements:
  Requirement 1: MongoDB Database
  Requirement 2: PyMongo Driver Integration
  Requirement 3: Data Validation (Python & $jsonSchema)
  Requirement 4: CRUD Operations (Create, Read, Update, Delete)
  Requirement 5: MongoDB Aggregation Pipelines
  Requirement 6: DevCollab Domain Modeling
"""

import sys
import unittest
from pathlib import Path
from datetime import datetime, timedelta, timezone
from bson import ObjectId

# Ensure workspace root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

try:
    from python.config import check_connection, get_database, close_connection
    from python.validators import (
        validate_user,
        validate_team,
        validate_project,
        validate_task,
        validate_comment,
        apply_db_validators,
        ValidationError,
    )
    from python.crud import DevCollabCRUD
    from python.aggregations import DevCollabAggregations
except ImportError:
    from config import check_connection, get_database, close_connection
    from validators import (
        validate_user,
        validate_team,
        validate_project,
        validate_task,
        validate_comment,
        apply_db_validators,
        ValidationError,
    )
    from crud import DevCollabCRUD
    from aggregations import DevCollabAggregations


class TestConnection(unittest.TestCase):
    """Verifies Requirements 1 & 2: MongoDB & PyMongo Integration."""

    def test_database_ping(self):
        conn = check_connection()
        self.assertEqual(conn["status"], "connected", f"Connection failed: {conn.get('error')}")
        self.assertIsNotNone(conn.get("version"))
        self.assertEqual(conn["database"], "devcollab")

    def test_database_handle(self):
        db = get_database()
        self.assertIsNotNone(db)
        cols = db.list_collection_names()
        self.assertIsInstance(cols, list)


class TestValidation(unittest.TestCase):
    """Verifies Requirement 3: Client & Database Data Validation."""

    def setUp(self):
        self.valid_user_id = str(ObjectId())
        self.valid_team_id = str(ObjectId())
        self.valid_project_id = str(ObjectId())

    def test_validate_user_success(self):
        data = {
            "name": "Jane Developer",
            "email": "jane.dev@example.com",
            "role": "developer",
            "skills": ["Python", "Docker"],
            "bio": "DevOps Engineer",
        }
        res = validate_user(data)
        self.assertEqual(res["name"], "Jane Developer")
        self.assertEqual(res["email"], "jane.dev@example.com")
        self.assertEqual(res["role"], "developer")

    def test_validate_user_invalid_email(self):
        data = {"name": "Jane", "email": "invalid-email-address", "role": "developer"}
        with self.assertRaises(ValidationError) as ctx:
            validate_user(data)
        self.assertEqual(ctx.exception.field, "email")

    def test_validate_user_invalid_role(self):
        data = {"name": "Jane", "email": "jane@test.com", "role": "super-hacker"}
        with self.assertRaises(ValidationError) as ctx:
            validate_user(data)
        self.assertEqual(ctx.exception.field, "role")

    def test_validate_team_success(self):
        data = {"name": "Security Core", "creator": self.valid_user_id}
        res = validate_team(data)
        self.assertEqual(res["name"], "Security Core")
        self.assertIsInstance(res["creator"], ObjectId)

    def test_validate_team_short_name(self):
        data = {"name": "S", "creator": self.valid_user_id}
        with self.assertRaises(ValidationError) as ctx:
            validate_team(data)
        self.assertEqual(ctx.exception.field, "name")

    def test_validate_project_success(self):
        start = datetime.now(timezone.utc)
        deadline = start + timedelta(days=14)
        data = {
            "name": "Observability Stack",
            "team": self.valid_team_id,
            "creator": self.valid_user_id,
            "priority": "High",
            "status": "Active",
            "startDate": start,
            "deadline": deadline,
        }
        res = validate_project(data)
        self.assertEqual(res["name"], "Observability Stack")
        self.assertEqual(res["priority"], "High")

    def test_validate_project_inverted_dates(self):
        now = datetime.now(timezone.utc)
        data = {
            "name": "Timeline Warp",
            "team": self.valid_team_id,
            "creator": self.valid_user_id,
            "startDate": now + timedelta(days=10),
            "deadline": now,
        }
        with self.assertRaises(ValidationError) as ctx:
            validate_project(data)
        self.assertEqual(ctx.exception.field, "dates")

    def test_validate_task_success(self):
        data = {
            "title": "Configure Prometheus Exporters",
            "project": self.valid_project_id,
            "creator": self.valid_user_id,
            "priority": "Critical",
            "status": "In Progress",
        }
        res = validate_task(data)
        self.assertEqual(res["title"], "Configure Prometheus Exporters")
        self.assertEqual(res["status"], "In Progress")

    def test_validate_task_short_title(self):
        data = {
            "title": "X",
            "project": self.valid_project_id,
            "creator": self.valid_user_id,
        }
        with self.assertRaises(ValidationError) as ctx:
            validate_task(data)
        self.assertEqual(ctx.exception.field, "title")

    def test_validate_task_invalid_status(self):
        data = {
            "title": "Valid Title Here",
            "project": self.valid_project_id,
            "creator": self.valid_user_id,
            "status": "NonExistentStatus",
        }
        with self.assertRaises(ValidationError) as ctx:
            validate_task(data)
        self.assertEqual(ctx.exception.field, "status")

    def test_validate_comment_success(self):
        data = {"user": self.valid_user_id, "text": "Metrics dashboard verified in staging."}
        res = validate_comment(data)
        self.assertEqual(res["text"], "Metrics dashboard verified in staging.")
        self.assertIsInstance(res["_id"], ObjectId)

    def test_validate_comment_empty(self):
        data = {"user": self.valid_user_id, "text": "   "}
        with self.assertRaises(ValidationError) as ctx:
            validate_comment(data)
        self.assertEqual(ctx.exception.field, "text")

    def test_apply_db_validators(self):
        db = get_database()
        res = apply_db_validators(db)
        self.assertIn("tasks", res)
        self.assertIn("projects", res)
        self.assertIn("successfully", res["tasks"])
        self.assertIn("successfully", res["projects"])


class TestCRUD(unittest.TestCase):
    """Verifies Requirement 4: Create, Read, Update, Delete Lifecycle."""

    @classmethod
    def setUpClass(cls):
        cls.db = get_database()
        cls.crud = DevCollabCRUD(cls.db)
        cls.created_user_ids = []
        cls.created_team_ids = []
        cls.created_project_ids = []
        cls.created_task_ids = []

    @classmethod
    def tearDownClass(cls):
        """Cleanup any remaining test entities created during test suite execution."""
        if cls.created_task_ids:
            cls.db.tasks.delete_many({"_id": {"$in": [ObjectId(tid) for tid in cls.created_task_ids]}})
        if cls.created_project_ids:
            cls.db.projects.delete_many({"_id": {"$in": [ObjectId(pid) for pid in cls.created_project_ids]}})
        if cls.created_team_ids:
            cls.db.teams.delete_many({"_id": {"$in": [ObjectId(tid) for tid in cls.created_team_ids]}})
        if cls.created_user_ids:
            cls.db.users.delete_many({"_id": {"$in": [ObjectId(uid) for uid in cls.created_user_ids]}})

    def test_crud_full_lifecycle(self):
        ts = int(datetime.now(timezone.utc).timestamp())

        # 1. CREATE USER
        user = self.crud.create_user(
            name=f"Test Developer {ts}",
            email=f"test_dev_{ts}@devcollab.test",
            role="developer",
            skills=["Python", "PyMongo", "MongoDB"],
            bio="Automated test engineer",
        )
        self.assertIn("_id", user)
        user_id = user["_id"]
        self.created_user_ids.append(user_id)

        # 2. READ USER
        user_by_id = self.crud.get_user_by_id(user_id)
        self.assertIsNotNone(user_by_id)
        self.assertEqual(user_by_id["email"], f"test_dev_{ts}@devcollab.test")

        user_by_email = self.crud.get_user_by_email(f"test_dev_{ts}@devcollab.test")
        self.assertIsNotNone(user_by_email)
        self.assertEqual(user_by_email["_id"], user_id)

        # 3. CREATE TEAM
        team = self.crud.create_team(
            name=f"Automation Squad {ts}",
            creator_id=user_id,
            description="Integration & quality assurance squad",
        )
        self.assertIn("_id", team)
        team_id = team["_id"]
        self.created_team_ids.append(team_id)

        # 4. ADD TEAM MEMBER (create second user and add to team)
        user2 = self.crud.create_user(
            name=f"Peer Developer {ts}",
            email=f"peer_dev_{ts}@devcollab.test",
            role="developer",
            skills=["React", "TypeScript"],
        )
        self.created_user_ids.append(user2["_id"])
        added = self.crud.add_team_member(team_id, user2["_id"], role="Developer")
        self.assertTrue(added)
        team_read = self.crud.get_team_by_id(team_id)
        self.assertEqual(len(team_read["members"]), 2)

        # 5. CREATE PROJECT
        project = self.crud.create_project(
            name=f"CI/CD Pipeline Engine {ts}",
            team_id=team_id,
            creator_id=user_id,
            description="Robust build and test orchestration system",
            priority="Critical",
            status="Active",
            start_date=datetime.now(timezone.utc),
            deadline=datetime.now(timezone.utc) + timedelta(days=10),
            assigned_members=[user_id],
        )
        self.assertIn("_id", project)
        project_id = project["_id"]
        self.created_project_ids.append(project_id)

        # 6. UPDATE PROJECT (Progress & Member Assignment)
        updated_proj = self.crud.update_project_progress(project_id, 60)
        self.assertEqual(updated_proj["progress"], 60)

        # 7. CREATE TASK
        task = self.crud.create_task(
            title=f"Write Integration Tests for PyMongo {ts}",
            project_id=project_id,
            creator_id=user_id,
            description="Exercise all CRUD verbs and edge cases",
            priority="High",
            status="To Do",
            assigned_developer=user_id,
            due_date=datetime.now(timezone.utc) + timedelta(days=3),
        )
        self.assertIn("_id", task)
        task_id = task["_id"]
        self.created_task_ids.append(task_id)

        # 8. ADD COMMENT ($push)
        comment = self.crud.add_comment(
            task_id=task_id,
            user_id=user_id,
            text="Initial test fixtures created and operational.",
        )
        self.assertIn("_id", comment)
        comment_id = comment["_id"]

        # 9. READ TASKS (Kanban & Regex Search)
        kanban = self.crud.get_tasks_for_kanban(project_id)
        self.assertTrue(len(kanban) >= 1)
        found_task = next((t for t in kanban if t["_id"] == task_id), None)
        self.assertIsNotNone(found_task)
        self.assertEqual(len(found_task["comments"]), 1)

        search_res = self.crud.search_tasks("Integration Tests", project_id=project_id)
        self.assertTrue(len(search_res) >= 1)

        # 10. UPDATE TASK (Status Column Drag & Reassign)
        moved = self.crud.update_task_status(task_id, "In Progress")
        self.assertEqual(moved["status"], "In Progress")

        # 11. BATCH INSERT TASKS ($insert_many)
        batch_ids = self.crud.batch_insert_tasks([
            {
                "title": f"Batch Task A {ts}",
                "project": project_id,
                "creator": user_id,
                "priority": "Medium",
                "status": "To Do",
            },
            {
                "title": f"Batch Task B {ts}",
                "project": project_id,
                "creator": user_id,
                "priority": "Medium",
                "status": "Completed",
            },
        ])
        self.assertEqual(len(batch_ids), 2)
        self.created_task_ids.extend(batch_ids)

        # 12. BULK UPDATE PRIORITY ($update_many)
        modified_count = self.crud.bulk_update_task_priority(project_id, "Medium", "High")
        self.assertGreaterEqual(modified_count, 2)

        # 13. DELETE COMMENT ($pull)
        comment_removed = self.crud.delete_comment(task_id, comment_id)
        self.assertTrue(comment_removed)
        reloaded = self.crud.get_tasks_for_kanban(project_id)
        reloaded_task = next(t for t in reloaded if t["_id"] == task_id)
        self.assertEqual(len(reloaded_task["comments"]), 0)

        # 14. DELETE COMPLETED TASKS ($delete_many)
        del_count = self.crud.delete_completed_tasks(project_id)
        self.assertGreaterEqual(del_count, 1)

        # 15. DELETE SINGLE TASK ($delete_one)
        task_deleted = self.crud.delete_task(task_id)
        self.assertTrue(task_deleted)

        # 16. CASCADING CLEANUP (Delete Team, associated Projects & Tasks)
        cascade = self.crud.delete_team_cascading(team_id)
        self.assertEqual(cascade["teams_deleted"], 1)
        self.assertGreaterEqual(cascade["projects_deleted"], 1)


class TestAggregations(unittest.TestCase):
    """Verifies Requirement 5: Advanced MongoDB Aggregation Pipelines."""

    @classmethod
    def setUpClass(cls):
        cls.db = get_database()
        cls.agg = DevCollabAggregations(cls.db)

    def test_pipeline_1_kanban_status_distribution(self):
        res = self.agg.get_kanban_status_distribution()
        self.assertIsInstance(res, list)
        if res:
            item = res[0]
            for key in ["projectId", "projectName", "totalTasks", "toDo", "inProgress", "inReview", "completed", "completionRate"]:
                self.assertIn(key, item)
            self.assertGreaterEqual(item["totalTasks"], 0)
            self.assertGreaterEqual(item["completionRate"], 0.0)

    def test_pipeline_2_developer_workload_matrix(self):
        res = self.agg.get_developer_workload_matrix()
        self.assertIsInstance(res, list)
        if res:
            item = res[0]
            for key in ["developerId", "developerName", "activeTasks", "criticalTasks", "workloadIndex"]:
                self.assertIn(key, item)
            self.assertGreaterEqual(item["workloadIndex"], 0)

    def test_pipeline_3_team_collaboration_leaderboard(self):
        res = self.agg.get_team_collaboration_leaderboard()
        self.assertIsInstance(res, list)
        if res:
            item = res[0]
            for key in ["userId", "userName", "userRole", "totalComments", "tasksDiscussedCount"]:
                self.assertIn(key, item)
            self.assertGreaterEqual(item["totalComments"], 1)

    def test_pipeline_4_project_overdue_risk_analysis(self):
        res = self.agg.get_project_overdue_risk_analysis()
        self.assertIsInstance(res, list)
        if res:
            item = res[0]
            for key in ["projectId", "projectName", "monitoredTasksCount", "overdueCount", "overdueRiskPercentage"]:
                self.assertIn(key, item)
            self.assertGreaterEqual(item["overdueRiskPercentage"], 0.0)

    def test_pipeline_5_sprint_multi_facet_analytics(self):
        res = self.agg.get_sprint_multi_facet_analytics()
        self.assertIsInstance(res, dict)
        self.assertIn("byStatus", res)
        self.assertIn("byPriority", res)
        self.assertIn("topUrgentTasks", res)
        self.assertIn("summaryMetrics", res)
        self.assertIsInstance(res["byStatus"], list)
        self.assertIsInstance(res["byPriority"], list)


if __name__ == "__main__":
    unittest.main()
