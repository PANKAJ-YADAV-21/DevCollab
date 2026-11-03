import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Layers, 
  FolderGit2, 
  AlertCircle, 
  CheckCircle2, 
  LayoutGrid, 
  Clock, 
  CheckCircle,
  HelpCircle,
  PlayCircle
} from 'lucide-react';
import axios from 'axios';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

const COLUMNS = [
  {
    id: 'To Do',
    title: 'To Do',
    icon: HelpCircle,
    color: 'slate',
    borderStyle: 'border-slate-700/60',
    headerBg: 'bg-slate-800/40 text-slate-300',
    dotColor: 'bg-slate-400',
  },
  {
    id: 'In Progress',
    title: 'In Progress',
    icon: PlayCircle,
    color: 'blue',
    borderStyle: 'border-blue-600/40',
    headerBg: 'bg-blue-600/10 text-sky-400 border border-blue-500/20',
    dotColor: 'bg-sky-400',
  },
  {
    id: 'In Review',
    title: 'In Review',
    icon: Clock,
    color: 'amber',
    borderStyle: 'border-amber-500/40',
    headerBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    dotColor: 'bg-amber-400',
  },
  {
    id: 'Completed',
    title: 'Completed',
    icon: CheckCircle,
    color: 'emerald',
    borderStyle: 'border-emerald-500/40',
    headerBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    dotColor: 'bg-emerald-400',
  },
];

export default function KanbanBoard({ currentUser, onRequireAuth }) {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');

  // Drag state
  const [dragOverCol, setDragOverCol] = useState(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3500);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // Load Projects and Teams
  const loadInitialData = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const [projRes, teamsRes] = await Promise.all([
        axios.get('/api/projects'),
        axios.get('/api/teams'),
      ]);

      const projs = projRes.data.data.projects || [];
      setProjects(projs);
      setTeams(teamsRes.data.data.teams || []);

      if (projs.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projs[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [currentUser]);

  // Load Tasks whenever active project changes
  const fetchTasks = async (projId = selectedProjectId) => {
    if (!projId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/tasks?projectId=${projId}`);
      setTasks(res.data.data.tasks || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Active Project & Team context
  const activeProject = projects.find((p) => p._id === selectedProjectId);
  const activeTeam = activeProject
    ? teams.find((t) => t._id === (activeProject.team?._id || activeProject.team))
    : null;
  const callerRole = activeTeam?.userRole || 'Developer';
  const canManage = callerRole === 'Admin' || callerRole === 'Team Leader';

  // Team members for assignment dropdown
  const teamMembers = activeTeam?.members || [];

  // Drag & Drop handlers
  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = (e, colId) => {
    if (dragOverCol === colId) {
      setDragOverCol(null);
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const taskToMove = tasks.find((t) => t._id === taskId);
    if (!taskToMove || taskToMove.status === targetStatus) return;

    // Check Developer RBAC
    const isAssignedToMe = taskToMove.assignedDeveloper && 
      ((taskToMove.assignedDeveloper._id || taskToMove.assignedDeveloper) === currentUser?._id);

    if (callerRole === 'Developer' && !isAssignedToMe) {
      setError('Permission denied: Developers can only update the status of tasks assigned to them');
      return;
    }

    // Optimistic UI update
    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      const res = await axios.patch(`/api/tasks/${taskId}/status`, { status: targetStatus });
      setSuccessMsg(`Task moved to ${targetStatus}`);
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? res.data.data.task : t))
      );
    } catch (err) {
      // Rollback on failure
      setTasks(previousTasks);
      setError(err.response?.data?.message || 'Failed to update task status');
    }
  };

  // Quick status change handler
  const handleQuickStatusChange = async (taskId, newStatus) => {
    const taskToMove = tasks.find((t) => t._id === taskId);
    if (!taskToMove || taskToMove.status === newStatus) return;

    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await axios.patch(`/api/tasks/${taskId}/status`, { status: newStatus });
      setSuccessMsg(`Task moved to ${newStatus}`);
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? res.data.data.task : t))
      );
    } catch (err) {
      setTasks(previousTasks);
      setError(err.response?.data?.message || 'Failed to update task status');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      setSuccessMsg('Task deleted successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setActiveTask(null);
    setIsEditMode(true);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (task) => {
    setActiveTask(task);
    setIsEditMode(true);
    setModalOpen(true);
  };

  // Open Detail / Comments Modal
  const handleOpenDetails = (task) => {
    setActiveTask(task);
    setIsEditMode(false);
    setModalOpen(true);
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    // Search text
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    // Priority filter
    if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) {
      return false;
    }

    // Assignee filter
    if (assigneeFilter === 'me') {
      const devId = task.assignedDeveloper?._id || task.assignedDeveloper;
      if (devId !== currentUser?._id) return false;
    } else if (assigneeFilter === 'unassigned') {
      if (task.assignedDeveloper) return false;
    } else if (assigneeFilter !== 'ALL') {
      const devId = task.assignedDeveloper?._id || task.assignedDeveloper;
      if (devId !== assigneeFilter) return false;
    }

    return true;
  });

  if (!currentUser) {
    return (
      <div className="bg-navy-900 border border-navy-700/80 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-sky-400 flex items-center justify-center mx-auto">
          <LayoutGrid className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">Interactive Kanban Board</h3>
        <p className="text-xs sm:text-sm text-slate-300">
          Sign in to access real-time task pipelines, drag-and-drop status tracking, and developer assignments.
        </p>
        <button
          onClick={onRequireAuth}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Controls: Project Selector & Action Bar */}
      <div className="bg-navy-900/80 border border-navy-700/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Project selector dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-sky-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Project:</span>
            </div>

            {projects.length > 0 ? (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-navy-950 border border-navy-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer min-w-[200px]"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.status})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-slate-400 italic">No projects found. Create a project in Phase 4 first.</span>
            )}

            {activeProject && (
              <span className="text-[11px] font-medium text-slate-400 px-2.5 py-1 rounded-lg bg-navy-950 border border-navy-800">
                Team: <span className="text-slate-200">{activeTeam?.name || 'Assigned'}</span> • Your Role: <span className="text-sky-400 font-semibold">{callerRole}</span>
              </span>
            )}
          </div>

          {/* New Task & Refresh Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTasks(selectedProjectId)}
              disabled={loading || !selectedProjectId}
              className="p-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white border border-navy-700 transition-colors cursor-pointer"
              title="Refresh Tasks"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {canManage && selectedProjectId && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="pt-3 border-t border-navy-800/80 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks by title or keyword..."
              className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-navy-950 border border-navy-700 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">Assignee:</span>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-navy-950 border border-navy-700 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Assignees</option>
              <option value="me">Assigned to Me</option>
              <option value="unassigned">Unassigned</option>
              {teamMembers.map((m) => {
                const u = m.user || m;
                return (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col bg-navy-950/70 border rounded-2xl transition-all duration-200 min-h-[480px] p-3 space-y-3 ${
                isOver 
                  ? 'border-blue-500 bg-navy-900/60 shadow-xl shadow-blue-500/10' 
                  : col.borderStyle
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-navy-800/80 px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span className="text-xs font-bold text-white tracking-wide">{col.title}</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-navy-900 border border-navy-700 text-slate-300">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List Container */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-0.5 custom-scrollbar">
                {colTasks.length > 0 ? (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      callerRole={callerRole}
                      currentUserId={currentUser?._id}
                      onEdit={handleOpenEdit}
                      onDelete={handleDeleteTask}
                      onOpenDetails={handleOpenDetails}
                      onStatusChange={handleQuickStatusChange}
                    />
                  ))
                ) : (
                  <div className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center transition-colors ${
                    isOver 
                      ? 'border-blue-500/60 bg-blue-500/5' 
                      : 'border-navy-800 text-slate-500'
                  }`}>
                    <p className="text-xs font-medium">
                      {isOver ? 'Drop task here' : 'No tasks in this stage'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {isOver ? 'Release to update status' : 'Drag tasks here to update'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Modal (Create, Edit & Details) */}
      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        task={activeTask}
        isEditMode={isEditMode}
        teamMembers={teamMembers}
        activeProjectId={selectedProjectId}
        callerRole={callerRole}
        currentUserId={currentUser?._id}
        onTaskSaved={(savedTask) => {
          setTasks((prev) => {
            const exists = prev.some((t) => t._id === savedTask._id);
            if (exists) {
              return prev.map((t) => (t._id === savedTask._id ? savedTask : t));
            }
            return [savedTask, ...prev];
          });
          setSuccessMsg(isEditMode && activeTask ? 'Task updated' : 'Task created successfully');
        }}
        onTaskUpdated={(updatedTask) => {
          setTasks((prev) =>
            prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
          );
        }}
      />
    </div>
  );
}
