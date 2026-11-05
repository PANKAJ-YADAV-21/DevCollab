import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
from tabulate import tabulate

# Ensure root directory is on sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

try:
    from python.config import check_connection, get_database
    from python.validators import (
        apply_db_validators,
        validate_task,
        validate_project,
        ValidationError,
    )
    from python.crud import DevCollabCRUD
    from python.aggregations import DevCollabAggregations
except ImportError:
    from config import check_connection, get_database
    from validators import (
        apply_db_validators,
        validate_task,
        validate_project,
        ValidationError,
    )
    from crud import DevCollabCRUD
    from aggregations import DevCollabAggregations



def print_section(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def run_demonstration():
    print_section("DevCollab Python–MongoDB (PyMongo) Demonstration Runner")

    # -------------------------------------------------------------
    # 1. Connection & Database Check
    # -------------------------------------------------------------
    print("\n[Step 1] Connecting to MongoDB via PyMongo...")
    conn = check_connection()
    if conn["status"] != "connected":
        print(f"❌ Failed to connect to MongoDB: {conn.get('error')}")
        print("Please ensure MongoDB is running at the configured MONGO_URI.")
        sys.exit(1)

    print(f"  ✓ Connected to MongoDB Server v{conn['version']}")
    print(f"  ✓ Database: '{conn['database']}'")
    print(f"  ✓ Existing Collections: {', '.join(conn['collections'])}")

    db = get_database()
    crud = DevCollabCRUD(db)
    agg = DevCollabAggregations(db)

    # -------------------------------------------------------------
    # 2. Data Validation Demonstration
    # -------------------------------------------------------------
    print_section("Requirement 3: Data Validation Demonstration")

    # 2A. Server-side $jsonSchema
    print("\n[2A] Applying MongoDB Server-Side $jsonSchema Collection Validators...")
    v_results = apply_db_validators(db)
    for col, res in v_results.items():
        print(f"  ✓ Collection '{col}': {res}")

    # 2B. Client-side Validation Checks
    print("\n[2B] Testing Python Application-Level Validation Enforcement:")

    # Invalid title test (<2 chars)
    try:
        validate_task({
            "title": "A",
            "project": "6ae8e2c7bd46fee5e48763bc",
            "creator": "6ae868fd526adb914df5d3aa",
            "status": "To Do",
        })
        print("  ✗ Failed: Short title was not rejected")
    except ValidationError as e:
        print(f"  ✓ [PASS] Short title rejected: '{e.message}' (Field: {e.field})")

    # Invalid status enum test
    try:
        validate_task({
            "title": "Setup OAuth2 Login",
            "project": "6ae8e2c7bd46fee5e48763bc",
            "creator": "6ae868fd526adb914df5d3aa",
            "status": "InvalidColumnStatus",
        })
        print("  ✗ Failed: Invalid status enum was not rejected")
    except ValidationError as e:
        print(f"  ✓ [PASS] Invalid status rejected: '{e.message}' (Field: {e.field})")

    # Date ordering test (start_date > deadline)
    try:
        validate_project({
            "name": "Backend Refactor",
            "team": "6ae8dfd7f44b989024ccfa54",
            "creator": "6ae868fd526adb914df5d3aa",
            "startDate": "2026-12-31T00:00:00Z",
            "deadline": "2026-01-01T00:00:00Z",
        })
        print("  ✗ Failed: Inverted dates were not rejected")
    except ValidationError as e:
        print(f"  ✓ [PASS] Inverted date range rejected: '{e.message}' (Field: {e.field})")

    # -------------------------------------------------------------
    # 3. CRUD Demonstration on DevCollab Domain
    # -------------------------------------------------------------
    print_section("Requirement 4: Create, Read, Update, Delete (CRUD) Demonstration")

    timestamp = int(datetime.now(timezone.utc).timestamp())

    # 3.1 CREATE
    print("\n--- [CREATE Operations] ---")
    demo_user = crud.create_user(
        name=f"Elena Rostova {timestamp}",
        email=f"elena_{timestamp}@devcollab.io",
        role="developer",
        skills=["Python", "PyMongo", "FastAPI", "MongoDB"],
        bio="Full-Stack Backend Systems Engineer",
    )
    print(f"  ✓ Created User: {demo_user['name']} ({demo_user['email']}) [ID: {demo_user['_id']}]")

    demo_team = crud.create_team(
        name=f"Core Platform Alpha {timestamp}",
        creator_id=demo_user["_id"],
        description="Core platform infrastructure & data pipeline squad",
    )
    print(f"  ✓ Created Team: '{demo_team['name']}' with creator as initial Admin")

    demo_project = crud.create_project(
        name=f"Telemetry & Query Analytics {timestamp}",
        team_id=demo_team["_id"],
        creator_id=demo_user["_id"],
        description="High-throughput telemetry ingestion & analytical reporting",
        priority="High",
        status="Active",
        start_date=datetime.now(timezone.utc),
        deadline=datetime.now(timezone.utc) + timedelta(days=21),
    )
    print(f"  ✓ Created Project: '{demo_project['name']}' (Priority: {demo_project['priority']}, Status: {demo_project['status']})")

    demo_task = crud.create_task(
        title="Construct PyMongo Aggregation Pipeline for Sprint Velocity",
        project_id=demo_project["_id"],
        creator_id=demo_user["_id"],
        description="Implement real-time analytical rollups across developer workloads",
        priority="Critical",
        status="To Do",
        assigned_developer=demo_user["_id"],
        due_date=datetime.now(timezone.utc) + timedelta(days=5),
    )
    print(f"  ✓ Created Task: '{demo_task['title']}' [Column: {demo_task['status']}]")

    comment = crud.add_comment(
        task_id=demo_task["_id"],
        user_id=demo_user["_id"],
        text="Ensure compound indexing on (project, status) is verified for fast group queries.",
    )
    print(f"  ✓ Added Comment to Task via $push: '{comment['text']}'")

    # 3.2 READ
    print("\n--- [READ Operations] ---")
    fetched_user = crud.get_user_by_email(demo_user["email"])
    print(f"  ✓ Read User by Email: {fetched_user['name']} | Role: {fetched_user['role']} | Skills: {fetched_user['skills']}")

    kanban_tasks = crud.get_tasks_for_kanban(demo_project["_id"])
    print(f"  ✓ Read Tasks for Kanban Board: retrieved {len(kanban_tasks)} active task(s)")

    search_results = crud.search_tasks("Aggregation", project_id=demo_project["_id"])
    print(f"  ✓ Regex Search for keyword 'Aggregation': found {len(search_results)} match(es)")

    # 3.3 UPDATE
    print("\n--- [UPDATE Operations] ---")
    moved_task = crud.update_task_status(demo_task["_id"], "In Progress")
    print(f"  ✓ Updated Kanban Column (Drag & Drop): '{moved_task['title']}' -> '{moved_task['status']}'")

    reviewed_task = crud.update_task_status(demo_task["_id"], "In Review")
    print(f"  ✓ Advanced Task to Review: '{reviewed_task['title']}' -> '{reviewed_task['status']}'")

    updated_proj = crud.update_project_progress(demo_project["_id"], 45)
    print(f"  ✓ Updated Project Progress: '{updated_proj['name']}' -> {updated_proj['progress']}%")

    # 3.4 DELETE
    print("\n--- [DELETE Operations] ---")
    comment_id = comment["_id"]
    comment_del = crud.delete_comment(demo_task["_id"], comment_id)
    print(f"  ✓ Deleted Comment using $pull: {comment_del}")

    task_del = crud.delete_task(demo_task["_id"])
    print(f"  ✓ Deleted Single Task (delete_one): {task_del}")

    cascading_res = crud.delete_team_cascading(demo_team["_id"])
    print(f"  ✓ Cascading Cleanup (Team + Projects + Tasks): {cascading_res}")

    # -------------------------------------------------------------
    # 4. MongoDB Aggregation Operations
    # -------------------------------------------------------------
    print_section("Requirement 5: MongoDB Aggregation Pipelines Demonstration")

    # Pipeline 1
    print("\n[Pipeline 1] Project Kanban Task Distribution & Completion Rates:")
    kanban_dist = agg.get_kanban_status_distribution()
    if kanban_dist:
        table_data = [
            [
                item["projectName"][:28],
                item["totalTasks"],
                item["toDo"],
                item["inProgress"],
                item["inReview"],
                item["completed"],
                f"{item['completionRate']}%",
                item["critical"],
            ]
            for item in kanban_dist
        ]
        headers = ["Project Name", "Total", "To Do", "In Prog", "Review", "Done", "Done %", "Critical"]
        print(tabulate(table_data, headers=headers, tablefmt="rounded_grid"))
    else:
        print("  (No tasks currently in database for distribution)")

    # Pipeline 2
    print("\n[Pipeline 2] Developer Workload & Critical Task Matrix ($lookup -> $unwind):")
    workload = agg.get_developer_workload_matrix()
    if workload:
        table_data = [
            [
                item["developerName"],
                item["activeTasks"],
                item["criticalTasks"],
                item["highTasks"],
                item["inProgressTasks"],
                item["workloadIndex"],
            ]
            for item in workload
        ]
        headers = ["Developer Name", "Active Tasks", "Critical", "High", "In Progress", "Workload Score"]
        print(tabulate(table_data, headers=headers, tablefmt="rounded_grid"))
    else:
        print("  (No active assigned tasks)")

    # Pipeline 3
    print("\n[Pipeline 3] Team Collaboration & Comment Activity Leaderboard ($unwind comments):")
    collab = agg.get_team_collaboration_leaderboard()
    if collab:
        table_data = [
            [
                item["userName"],
                item["userRole"],
                item["totalComments"],
                item["tasksDiscussedCount"],
                str(item.get("latestActivity", ""))[:19],
            ]
            for item in collab
        ]
        headers = ["Team Member", "Role", "Comments", "Tasks Discussed", "Latest Feedback"]
        print(tabulate(table_data, headers=headers, tablefmt="rounded_grid"))
    else:
        print("  (No task comments recorded)")

    # Pipeline 4
    print("\n[Pipeline 4] Project Health & Overdue Risk Analysis ($addFields -> $group):")
    risk = agg.get_project_overdue_risk_analysis()
    if risk:
        table_data = [
            [
                item["projectName"][:30],
                item["monitoredTasksCount"],
                item["overdueCount"],
                item["criticalOverdue"],
                f"{item['maxDaysOverdue']} days",
                f"{item['overdueRiskPercentage']}%",
            ]
            for item in risk
        ]
        headers = ["Project Name", "Monitored", "Overdue", "Critical Overdue", "Max Delay", "Risk %"]
        print(tabulate(table_data, headers=headers, tablefmt="rounded_grid"))
    else:
        print("  (All monitored project tasks are within deadline)")

    # Pipeline 5
    print("\n[Pipeline 5] Multi-Dimensional Sprint Analytics ($facet):")
    facet = agg.get_sprint_multi_facet_analytics()
    if facet:
        print("  Status Breakdown:")
        for s in facet.get("byStatus", []):
            print(f"    - {s['_id']}: {s['count']} task(s)")

        print("  Priority Breakdown:")
        for p in facet.get("byPriority", []):
            print(f"    - {p['_id']}: {p['count']} task(s)")

        metrics = facet.get("summaryMetrics", [])
        if metrics:
            m = metrics[0]
            print(f"  Summary: Total Tasks = {m.get('totalTasks')}, Completed = {m.get('completedTasks')}, Comments = {m.get('commentCount')}")

    print_section("All Academic Requirements (1–6) Successfully Demonstrated!")


if __name__ == "__main__":
    run_demonstration()
