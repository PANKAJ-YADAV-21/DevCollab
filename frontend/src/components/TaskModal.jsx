import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  AlertCircle, 
  Send, 
  Trash2, 
  MessageSquare, 
  Tag, 
  Shield, 
  Edit3, 
  CheckCircle2,
  FolderGit2
} from 'lucide-react';
import axios from 'axios';

export default function TaskModal({
  isOpen,
  onClose,
  task,
  isEditMode,
  teamMembers = [],
  activeProjectId,
  callerRole,
  currentUserId,
  onTaskSaved,
  onTaskUpdated,
}) {
  if (!isOpen) return null;

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('To Do');
  const [dueDate, setDueDate] = useState('');
  const [assignedDeveloper, setAssignedDeveloper] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [localTask, setLocalTask] = useState(task);

  useEffect(() => {
    setLocalTask(task);
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'Medium');
      setStatus(task.status || 'To Do');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      const devId = task.assignedDeveloper?._id || task.assignedDeveloper || '';
      setAssignedDeveloper(devId);
    } else {
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setStatus('To Do');
      setDueDate('');
      setAssignedDeveloper('');
    }
    setError(null);
  }, [task, isOpen]);

  const canManage = callerRole === 'Admin' || callerRole === 'Team Leader';
  const isAssignedToMe = localTask?.assignedDeveloper && 
    ((localTask.assignedDeveloper._id || localTask.assignedDeveloper) === currentUserId);
  const canUpdateStatus = canManage || isAssignedToMe;

  // Save Task (Create or Edit)
  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      if (task?._id) {
        // Edit Task
        const res = await axios.put(`/api/tasks/${task._id}`, {
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          dueDate: dueDate || null,
          assignedDeveloper: assignedDeveloper || null,
        });
        onTaskSaved(res.data.data.task);
      } else {
        // Create Task
        const res = await axios.post('/api/tasks', {
          projectId: activeProjectId,
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          dueDate: dueDate || null,
          assignedDeveloper: assignedDeveloper || null,
        });
        onTaskSaved(res.data.data.task);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick status change inside detail view
  const handleDetailStatusChange = async (newStatus) => {
    if (!localTask) return;
    setError(null);
    try {
      const res = await axios.patch(`/api/tasks/${localTask._id}/status`, { status: newStatus });
      setLocalTask(res.data.data.task);
      setStatus(newStatus);
      if (onTaskUpdated) onTaskUpdated(res.data.data.task);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !localTask) return;

    setPostingComment(true);
    setError(null);
    try {
      const res = await axios.post(`/api/tasks/${localTask._id}/comments`, {
        text: commentText.trim(),
      });
      setLocalTask(res.data.data.task);
      setCommentText('');
      if (onTaskUpdated) onTaskUpdated(res.data.data.task);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await axios.delete(`/api/tasks/${localTask._id}/comments/${commentId}`);
      const updatedComments = localTask.comments.filter((c) => c._id !== commentId);
      const updated = { ...localTask, comments: updatedComments };
      setLocalTask(updated);
      if (onTaskUpdated) onTaskUpdated(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-navy-800 flex items-center justify-between bg-navy-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sky-400 flex items-center justify-center">
              {isEditMode ? <Edit3 className="w-4 h-4" /> : <FolderGit2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditMode 
                  ? (task ? 'Edit Task' : 'Create New Task') 
                  : (localTask?.title || 'Task Details')}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditMode 
                  ? 'Configure task fields, deadlines, and developer assignment' 
                  : `Created by ${localTask?.creator?.name || 'Team Member'}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {isEditMode ? (
            /* CREATE / EDIT FORM */
            <form id="task-form" onSubmit={handleSubmitTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Task Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Implement Redis token blacklist caching"
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide technical requirements, criteria, and scope..."
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Assign Developer
                  </label>
                  <select
                    value={assignedDeveloper}
                    onChange={(e) => setAssignedDeveloper(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Unassigned --</option>
                    {teamMembers.map((m) => {
                      const u = m.user || m;
                      return (
                        <option key={u._id} value={u._id}>
                          {u.name} ({m.role || 'Member'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </form>
          ) : (
            /* DETAIL & COMMENTS VIEW */
            <div className="space-y-6">
              {/* Status & Priority tags row */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-navy-950/60 border border-navy-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Status:</span>
                  {canUpdateStatus ? (
                    <select
                      value={localTask?.status}
                      onChange={(e) => handleDetailStatusChange(e.target.value)}
                      className="bg-navy-900 border border-navy-700 rounded-lg text-xs font-semibold text-sky-400 px-2.5 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="In Review">In Review</option>
                      <option value="Completed">Completed</option>
                    </select>
                  ) : (
                    <span className="text-xs font-semibold text-sky-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                      {localTask?.status}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Priority:</span>
                  <span className="text-xs font-semibold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    {localTask?.priority}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Assignee:</span>
                  <span className="text-xs text-slate-200 font-semibold">
                    {localTask?.assignedDeveloper?.name || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Description
                </h4>
                <div className="p-4 rounded-xl bg-navy-950/40 border border-navy-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {localTask?.description || <span className="text-slate-500 italic">No description provided.</span>}
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                  <span>Discussion & Comments ({localTask?.comments?.length || 0})</span>
                </div>

                {/* Comments List */}
                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                  {localTask?.comments && localTask.comments.length > 0 ? (
                    localTask.comments.map((c) => {
                      const isAuthor = (c.user?._id || c.user) === currentUserId;
                      const canDelete = isAuthor || callerRole === 'Admin';

                      return (
                        <div 
                          key={c._id} 
                          className="p-3 rounded-xl bg-navy-950/70 border border-navy-800 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white uppercase flex-shrink-0 mt-0.5">
                              {c.user?.name ? c.user.name.charAt(0) : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-200">{c.user?.name || 'User'}</span>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                            </div>
                          </div>

                          {canDelete && (
                            <button
                              onClick={() => handleDeleteComment(c._id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500 italic p-3 text-center bg-navy-950/30 rounded-xl border border-navy-800/60">
                      No comments yet. Start the conversation below.
                    </p>
                  )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment or status note..."
                    className="flex-1 bg-navy-950 border border-navy-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={postingComment || !commentText.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/30"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-navy-800 bg-navy-950/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>

          {isEditMode && (
            <button
              type="submit"
              form="task-form"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              {submitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
