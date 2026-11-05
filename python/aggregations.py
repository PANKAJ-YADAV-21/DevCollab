from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from pymongo.database import Database

try:
    from python.config import get_database
    from python.crud import _to_json_friendly
except ImportError:
    from config import get_database
    from crud import _to_json_friendly


class DevCollabAggregations:
    """
    Advanced MongoDB Aggregation Pipelines demonstrating multi-stage analytics
    across DevCollab tasks, projects, teams, and developers.
    """

    def __init__(self, db: Optional[Database] = None):
        self.db = db if db is not None else get_database()
        self.tasks = self.db["tasks"]
        self.projects = self.db["projects"]
        self.teams = self.db["teams"]
        self.users = self.db["users"]

    # =================================================================
    # Pipeline 1: Kanban Task Distribution by Status & Priority
    # Stages: $match -> $group -> $lookup -> $unwind -> $project -> $sort
    # =================================================================
    def get_kanban_status_distribution(self, project_id: Optional[Any] = None) -> List[Dict[str, Any]]:
        """
        Aggregate task counts by Kanban column and compute sprint completion percentage.
        """
        pipeline = []
        if project_id:
            pipeline.append({"$match": {"project": ObjectId(str(project_id))}})

        pipeline.extend([
            {
                "$group": {
                    "_id": "$project",
                    "totalTasks": {"$sum": 1},
                    "toDoCount": {"$sum": {"$cond": [{"$eq": ["$status", "To Do"]}, 1, 0]}},
                    "inProgressCount": {"$sum": {"$cond": [{"$eq": ["$status", "In Progress"]}, 1, 0]}},
                    "inReviewCount": {"$sum": {"$cond": [{"$eq": ["$status", "In Review"]}, 1, 0]}},
                    "completedCount": {"$sum": {"$cond": [{"$eq": ["$status", "Completed"]}, 1, 0]}},
                    "criticalCount": {"$sum": {"$cond": [{"$eq": ["$priority", "Critical"]}, 1, 0]}},
                    "highCount": {"$sum": {"$cond": [{"$eq": ["$priority", "High"]}, 1, 0]}},
                }
            },
            {
                "$lookup": {
                    "from": "projects",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "projectInfo",
                }
            },
            {
                "$unwind": {
                    "path": "$projectInfo",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            {
                "$project": {
                    "projectId": "$_id",
                    "projectName": {"$ifNull": ["$projectInfo.name", "Unknown Project"]},
                    "projectStatus": "$projectInfo.status",
                    "totalTasks": 1,
                    "toDo": "$toDoCount",
                    "inProgress": "$inProgressCount",
                    "inReview": "$inReviewCount",
                    "completed": "$completedCount",
                    "critical": "$criticalCount",
                    "high": "$highCount",
                    "completionRate": {
                        "$cond": [
                            {"$gt": ["$totalTasks", 0]},
                            {"$round": [{"$multiply": [{"$divide": ["$completedCount", "$totalTasks"]}, 100]}, 1]},
                            0,
                        ]
                    },
                }
            },
            {"$sort": {"critical": -1, "totalTasks": -1}},
        ])

        results = list(self.tasks.aggregate(pipeline))
        return _to_json_friendly(results)

    # =================================================================
    # Pipeline 2: Developer Workload & Critical Task Matrix
    # Stages: $match -> $group -> $lookup -> $unwind -> $project -> $sort
    # =================================================================
    def get_developer_workload_matrix(self) -> List[Dict[str, Any]]:
        """
        Aggregate active (non-completed) tasks per developer, weighting critical and high items.
        """
        pipeline = [
            {"$match": {"status": {"$ne": "Completed"}}},
            {
                "$group": {
                    "_id": "$assignedDeveloper",
                    "activeTasks": {"$sum": 1},
                    "criticalTasks": {"$sum": {"$cond": [{"$eq": ["$priority", "Critical"]}, 1, 0]}},
                    "highTasks": {"$sum": {"$cond": [{"$eq": ["$priority", "High"]}, 1, 0]}},
                    "inProgressTasks": {"$sum": {"$cond": [{"$eq": ["$status", "In Progress"]}, 1, 0]}},
                    "inReviewTasks": {"$sum": {"$cond": [{"$eq": ["$status", "In Review"]}, 1, 0]}},
                }
            },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "devInfo",
                }
            },
            {
                "$unwind": {
                    "path": "$devInfo",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            {
                "$project": {
                    "developerId": "$_id",
                    "developerName": {"$ifNull": ["$devInfo.name", "Unassigned Tasks Pool"]},
                    "developerEmail": {"$ifNull": ["$devInfo.email", "unassigned@devcollab.io"]},
                    "globalRole": {"$ifNull": ["$devInfo.role", "N/A"]},
                    "activeTasks": 1,
                    "criticalTasks": 1,
                    "highTasks": 1,
                    "inProgressTasks": 1,
                    "inReviewTasks": 1,
                    "workloadIndex": {
                        "$add": [
                            {"$multiply": ["$criticalTasks", 3]},
                            {"$multiply": ["$highTasks", 2]},
                            "$activeTasks",
                        ]
                    },
                }
            },
            {"$sort": {"workloadIndex": -1, "activeTasks": -1}},
        ]

        results = list(self.tasks.aggregate(pipeline))
        return _to_json_friendly(results)

    # =================================================================
    # Pipeline 3: Team Collaboration & Comment Activity Leaderboard
    # Stages: $match -> $unwind -> $group -> $lookup -> $unwind -> $project -> $sort
    # =================================================================
    def get_team_collaboration_leaderboard(self) -> List[Dict[str, Any]]:
        """
        Measure team discussion engagement by unwinding comments and ranking active contributors.
        """
        pipeline = [
            {"$match": {"comments": {"$exists": True, "$not": {"$size": 0}}}},
            {"$unwind": "$comments"},
            {
                "$group": {
                    "_id": "$comments.user",
                    "totalComments": {"$sum": 1},
                    "distinctTasksDiscussed": {"$addToSet": "$_id"},
                    "latestActivity": {"$max": "$comments.createdAt"},
                }
            },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "userInfo",
                }
            },
            {
                "$unwind": {
                    "path": "$userInfo",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            {
                "$project": {
                    "userId": "$_id",
                    "userName": {"$ifNull": ["$userInfo.name", "Unknown Member"]},
                    "userEmail": {"$ifNull": ["$userInfo.email", "unknown@devcollab.io"]},
                    "userRole": {"$ifNull": ["$userInfo.role", "developer"]},
                    "totalComments": 1,
                    "tasksDiscussedCount": {"$size": "$distinctTasksDiscussed"},
                    "latestActivity": 1,
                }
            },
            {"$sort": {"totalComments": -1, "tasksDiscussedCount": -1}},
        ]

        results = list(self.tasks.aggregate(pipeline))
        return _to_json_friendly(results)

    # =================================================================
    # Pipeline 4: Project Health & Overdue Risk Analysis
    # Stages: $match -> $addFields -> $group -> $lookup -> $unwind -> $project -> $sort
    # =================================================================
    def get_project_overdue_risk_analysis(self) -> List[Dict[str, Any]]:
        """
        Detect active tasks where dueDate < NOW, compute hours overdue, and rank projects.
        """
        pipeline = [
            {
                "$match": {
                    "status": {"$ne": "Completed"},
                    "dueDate": {"$ne": None},
                }
            },
            {
                "$addFields": {
                    "isOverdue": {"$cond": [{"$lt": ["$dueDate", "$$NOW"]}, True, False]},
                    "overdueMilliseconds": {
                        "$cond": [
                            {"$lt": ["$dueDate", "$$NOW"]},
                            {"$subtract": ["$$NOW", "$dueDate"]},
                            0,
                        ]
                    },
                }
            },
            {
                "$group": {
                    "_id": "$project",
                    "monitoredTasksCount": {"$sum": 1},
                    "overdueCount": {"$sum": {"$cond": ["$isOverdue", 1, 0]}},
                    "maxDelayHours": {"$max": {"$divide": ["$overdueMilliseconds", 3600000]}},
                    "criticalOverdue": {
                        "$sum": {"$cond": [{"$and": ["$isOverdue", {"$eq": ["$priority", "Critical"]}]}, 1, 0]}
                    },
                }
            },
            {
                "$lookup": {
                    "from": "projects",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "proj",
                }
            },
            {
                "$unwind": {
                    "path": "$proj",
                    "preserveNullAndEmptyArrays": True,
                }
            },
            {
                "$project": {
                    "projectId": "$_id",
                    "projectName": {"$ifNull": ["$proj.name", "Unknown"]},
                    "projectStatus": "$proj.status",
                    "monitoredTasksCount": 1,
                    "overdueCount": 1,
                    "criticalOverdue": 1,
                    "maxDaysOverdue": {"$round": [{"$divide": ["$maxDelayHours", 24]}, 1]},
                    "overdueRiskPercentage": {
                        "$cond": [
                            {"$gt": ["$monitoredTasksCount", 0]},
                            {"$round": [{"$multiply": [{"$divide": ["$overdueCount", "$monitoredTasksCount"]}, 100]}, 1]},
                            0,
                        ]
                    },
                }
            },
            {"$sort": {"criticalOverdue": -1, "overdueCount": -1}},
        ]

        results = list(self.tasks.aggregate(pipeline))
        return _to_json_friendly(results)

    # =================================================================
    # Pipeline 5: Multi-Dimensional Sprint Analytics ($facet)
    # Single-pass multi-bucket aggregation
    # =================================================================
    def get_sprint_multi_facet_analytics(self) -> Dict[str, Any]:
        """
        Perform multi-bucket analytics in a single database pass using $facet.
        Returns: byStatus, byPriority, topUrgentTasks, and summaryMetrics.
        """
        pipeline = [
            {
                "$facet": {
                    "byStatus": [
                        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}},
                    ],
                    "byPriority": [
                        {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}},
                    ],
                    "topUrgentTasks": [
                        {"$match": {"status": {"$ne": "Completed"}, "priority": {"$in": ["Critical", "High"]}}},
                        {
                            "$project": {
                                "title": 1,
                                "priority": 1,
                                "status": 1,
                                "dueDate": 1,
                                "project": 1,
                            }
                        },
                        {"$sort": {"priority": 1, "dueDate": 1}},
                        {"$limit": 5},
                    ],
                    "summaryMetrics": [
                        {
                            "$group": {
                                "_id": None,
                                "totalTasks": {"$sum": 1},
                                "completedTasks": {"$sum": {"$cond": [{"$eq": ["$status", "Completed"]}, 1, 0]}},
                                "commentCount": {"$sum": {"$size": {"$ifNull": ["$comments", []]}}},
                            }
                        }
                    ],
                }
            }
        ]

        raw = list(self.tasks.aggregate(pipeline))
        if not raw:
            return {}
        return _to_json_friendly(raw[0])
