import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  PauseCircle, 
  PlayCircle, 
  Users, 
  ArrowLeft, 
  Trash2, 
  Edit3, 
  UserPlus, 
  UserMinus, 
  RefreshCw, 
  Layers, 
  Shield, 
  ChevronRight,
  TrendingUp,
  X
} from 'lucide-react';
import axios from 'axios';

export default function ProjectsView({ currentUser, onRequireAuth }) {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Create / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formTeamId, setFormTeamId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState('Planning');
  const [formPriority, setFormPriority] = useState('Medium');
  const [formProgress, setFormProgress] = useState(0);
  const [formStartDate, setFormStartDate] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formAssignedMembers, setFormAssignedMembers] = useState([]);

  // Assign member in detail view state
  const [assignUserEmail, setAssignUserEmail] = useState('');
  const [assigningMember, setAssigningMember] = useState(false);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Load user teams & projects
  const fetchInitialData = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const [teamsRes, projectsRes] = await Promise.all([
        axios.get('/api/teams'),
        axios.get('/api/projects'),
      ]);
      setTeams(teamsRes.data.data.teams || []);
      setProjects(projectsRes.data.data.projects || []);

      if (teamsRes.data.data.teams?.length > 0 && !formTeamId) {
        setFormTeamId(teamsRes.data.data.teams[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects and teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [currentUser]);

  // Refresh single project details
  const fetchProjectDetails = async (projectId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/projects/${projectId}`);
      const proj = res.data.data.project;
      if (res.data.data.userTeamRole) {
        proj.userTeamRole = res.data.data.userTeamRole;
      }
      setSelectedProject(proj);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve project details');
      setSelectedProject(null);
    } finally {
      setLoading(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setIsEditing(false);
    setFormName('');
    setFormDesc('');
    setFormStatus('Planning');
    setFormPriority('Medium');
    setFormProgress(0);
    setFormStartDate('');
    setFormDeadline('');
    setFormAssignedMembers(currentUser ? [currentUser._id] : []);
    if (teams.length > 0) {
      setFormTeamId(teams[0]._id);
    }
    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = (proj) => {
    setIsEditing(true);
    setFormTeamId(proj.team?._id || proj.team);
    setFormName(proj.name);
    setFormDesc(proj.description || '');
    setFormStatus(proj.status);
    setFormPriority(proj.priority || 'Medium');
    setFormProgress(proj.progress || 0);
    setFormStartDate(proj.startDate ? proj.startDate.split('T')[0] : '');
    setFormDeadline(proj.deadline ? proj.deadline.split('T')[0] : '');
    setShowModal(true);
  };

  // Handle Form Submit (Create or Edit)
  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && selectedProject) {
        const res = await axios.put(`/api/projects/${selectedProject._id}`, {
          name: formName.trim(),
          description: formDesc.trim(),
          status: formStatus,
          priority: formPriority,
          progress: Number(formProgress),
          startDate: formStartDate || null,
          deadline: formDeadline || null,
        });
        setSuccessMsg('Project updated successfully');
        setSelectedProject(res.data.data.project);
      } else {
        const res = await axios.post('/api/projects', {
          teamId: formTeamId,
          name: formName.trim(),
          description: formDesc.trim(),
          status: formStatus,
          priority: formPriority,
          progress: Number(formProgress),
          startDate: formStartDate || null,
          deadline: formDeadline || null,
          assignedMembers: formAssignedMembers,
        });
        setSuccessMsg('Project created successfully');
        setSelectedProject(res.data.data.project);
      }

      setShowModal(false);
      // Refresh list
      const projectsRes = await axios.get('/api/projects');
      setProjects(projectsRes.data.data.projects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Assign member in detail view
  const handleAssignMember = async (e) => {
    e.preventDefault();
    if (!assignUserEmail.trim() || !selectedProject) return;

    setAssigningMember(true);
    setError(null);
    try {
      await axios.post(`/api/projects/${selectedProject._id}/members`, {
        email: assignUserEmail.trim(),
      });
      setSuccessMsg('Team member assigned to project');
      setAssignUserEmail('');
      await fetchProjectDetails(selectedProject._id);
      const projectsRes = await axios.get('/api/projects');
      setProjects(projectsRes.data.data.projects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign member');
    } finally {
      setAssigningMember(false);
    }
  };

  // Unassign member
  const handleRemoveMember = async (userId, memberName) => {
    if (!confirm(`Remove ${memberName} from this project?`)) return;

    setError(null);
    try {
      await axios.delete(`/api/projects/${selectedProject._id}/members/${userId}`);
      setSuccessMsg('Member unassigned from project');
      await fetchProjectDetails(selectedProject._id);
      const projectsRes = await axios.get('/api/projects');
      setProjects(projectsRes.data.data.projects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unassign member');
    }
  };

  // Delete project
  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to permanently delete this project?')) return;

    setError(null);
    try {
      await axios.delete(`/api/projects/${selectedProject._id}`);
      setSuccessMsg('Project deleted successfully');
      setSelectedProject(null);
      const projectsRes = await axios.get('/api/projects');
      setProjects(projectsRes.data.data.projects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project');
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-navy-900 border border-navy-700/80 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-sky-400 flex items-center justify-center mx-auto">
          <FolderGit2 className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">Project Workspaces</h3>
        <p className="text-xs sm:text-sm text-slate-300">
          Sign in to access collaborative project pipelines, deadlines, member assignments, and progress tracking.
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

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    const matchesTeam = selectedTeamFilter === 'ALL' || (p.team?._id || p.team) === selectedTeamFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || p.status === selectedStatusFilter;
    return matchesTeam && matchesStatus;
  });

  // Caller's role in selected project parent team
  const parentTeam = selectedProject
    ? teams.find((t) => t._id === (selectedProject.team?._id || selectedProject.team))
    : null;
  const callerTeamRole = selectedProject?.userTeamRole || parentTeam?.userRole || 'Developer';
  const canManageProject = callerTeamRole === 'Admin' || callerTeamRole === 'Team Leader';

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* VIEW A: Single Project Detail View */}
      {selectedProject ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Back navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedProject(null)}
                className="p-2 rounded-lg bg-navy-900 hover:bg-navy-800 border border-navy-700 text-slate-300 transition-colors"
                title="Back to projects"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-white">{selectedProject.name}</h2>
                  <StatusBadge status={selectedProject.status} />
                  <PriorityBadge priority={selectedProject.priority} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Team: <span className="text-slate-200 font-medium">{selectedProject.team?.name || 'Assigned Team'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchProjectDetails(selectedProject._id)}
                disabled={loading}
                className="p-2 rounded-lg bg-navy-900 hover:bg-navy-800 border border-navy-700 text-slate-300 text-xs flex items-center gap-1.5"
                title="Refresh project"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {canManageProject && (
                <button
                  onClick={() => openEditModal(selectedProject)}
                  className="px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Project
                </button>
              )}

              {callerTeamRole === 'Admin' && (
                <button
                  onClick={handleDeleteProject}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Project Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Description & Progress Card */}
            <div className="md:col-span-2 bg-navy-900 border border-navy-700/80 rounded-2xl p-6 shadow-lg space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Project Description
                </h3>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {selectedProject.description || 'No description provided for this project.'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-sky-400" /> Completion Progress
                  </span>
                  <span className="font-mono font-bold text-sky-400">{selectedProject.progress || 0}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-navy-950 overflow-hidden border border-navy-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${selectedProject.progress || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Dates & Timeline Card */}
            <div className="bg-navy-900 border border-navy-700/80 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Timeline & Milestones
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-navy-950 border border-navy-800">
                  <span className="text-slate-400 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-sky-400" /> Start Date
                  </span>
                  <span className="font-mono text-slate-200">
                    {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : 'Not Set'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-navy-950 border border-navy-800">
                  <span className="text-slate-400 block mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> Deadline
                  </span>
                  <span className="font-mono text-slate-200">
                    {selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : 'No Deadline'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-navy-950 border border-navy-800">
                  <span className="text-slate-400 block mb-1">Your Team Permission</span>
                  <span className="font-mono font-semibold text-sky-400">{callerTeamRole}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Members Section */}
          <div className="bg-navy-900 border border-navy-700/80 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-navy-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                Assigned Team Members ({selectedProject.assignedMembers?.length || 0})
              </h3>

              {canManageProject && (
                <form onSubmit={handleAssignMember} className="flex items-center gap-2">
                  <input
                    type="email"
                    required
                    value={assignUserEmail}
                    onChange={(e) => setAssignUserEmail(e.target.value)}
                    placeholder="member@devcollab.io"
                    className="bg-navy-950 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={assigningMember}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {assigningMember ? 'Assigning...' : 'Assign'}
                  </button>
                </form>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {selectedProject.assignedMembers?.map((member) => (
                <div
                  key={member._id}
                  className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                      {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">{member.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{member.email}</span>
                    </div>
                  </div>

                  {(canManageProject || member._id === currentUser._id) && (
                    <button
                      onClick={() => handleRemoveMember(member._id, member.name)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                      title={member._id === currentUser._id ? 'Unassign yourself' : 'Remove from project'}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* VIEW B: Projects Gallery / Dashboard */
        <div className="space-y-6">
          {/* Top Bar with Filter & Create */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy-800">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-sky-400" />
                Project Dashboard
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Track deliverables, statuses, deadlines, and assigned team members
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Team Selector Filter */}
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className="bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Teams ({teams.length})</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>

              <button
                onClick={fetchInitialData}
                disabled={loading}
                className="p-2 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-700 text-slate-300 text-xs flex items-center gap-1.5"
                title="Refresh projects"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New Project
              </button>
            </div>
          </div>

          {/* Projects Grid */}
          {loading && projects.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
              Loading projects...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-navy-900 border border-navy-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-navy-800 text-slate-400 flex items-center justify-center mx-auto">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No Projects Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {projects.length === 0
                  ? 'No projects created yet. Start a project inside one of your teams to begin collaborating.'
                  : 'No projects match the selected team or status filter.'}
              </p>
              {projects.length === 0 && (
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Create First Project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <div
                  key={project._id}
                  onClick={() => fetchProjectDetails(project._id)}
                  className="p-5 rounded-2xl bg-navy-900 border border-navy-700/80 hover:border-blue-500/50 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: Priority & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <PriorityBadge priority={project.priority} />
                      <StatusBadge status={project.status} />
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="font-semibold text-white text-sm group-hover:text-sky-300 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {project.description || 'No description provided'}
                      </p>
                    </div>

                    {/* Team tag */}
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-navy-950 px-2.5 py-1 rounded-md border border-navy-800">
                      <Layers className="w-3 h-3 text-sky-400" />
                      <span>{project.team?.name || 'Team Workspace'}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Progress</span>
                        <span className="text-sky-400 font-bold">{project.progress || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-navy-950 overflow-hidden border border-navy-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400"
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer with dates & members */}
                  <div className="mt-5 pt-3.5 border-t border-navy-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No deadline'}
                    </span>

                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {project.assignedMembers?.slice(0, 3).map((m, idx) => (
                          <div
                            key={m._id || idx}
                            className="inline-block h-5 w-5 rounded-full ring-2 ring-navy-900 bg-blue-600/40 text-[9px] font-bold text-center text-sky-300 leading-5"
                            title={m.name}
                          >
                            {m.name ? m.name.charAt(0).toUpperCase() : '?'}
                          </div>
                        ))}
                      </div>
                      {(project.assignedMembers?.length || 0) > 3 && (
                        <span className="text-[10px] text-slate-500">
                          +{project.assignedMembers.length - 3}
                        </span>
                      )}
                      <ChevronRight className="w-3 h-3 text-sky-400 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT PROJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-navy-900 border border-navy-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-navy-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">
              {isEditing ? 'Edit Project Details' : 'Create New Project'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Configure project scope, dates, and team member assignments.
            </p>

            <form onSubmit={handleSubmitProject} className="space-y-4">
              {/* Team selection (only on creation) */}
              {!isEditing && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assign to Team</label>
                  <select
                    value={formTeamId}
                    onChange={(e) => setFormTeamId(e.target.value)}
                    required
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.userRole})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Distributed Database Migration"
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  placeholder="Project deliverables, architectural scope, and objectives"
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Progress Slider */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span>Progress ({formProgress}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formProgress}
                  onChange={(e) => setFormProgress(e.target.value)}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-navy-800 text-slate-300 text-xs font-medium hover:bg-navy-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-sky-400 border border-blue-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
        Active
      </span>
    );
  }
  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Completed
      </span>
    );
  }
  if (status === 'On Hold') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <PauseCircle className="w-2.5 h-2.5" />
        On Hold
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30">
      <Clock className="w-2.5 h-2.5" />
      Planning
    </span>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    Critical: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    High: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Medium: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    Low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  };
  const style = map[priority] || map.Medium;
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${style}`}>
      {priority}
    </span>
  );
}
