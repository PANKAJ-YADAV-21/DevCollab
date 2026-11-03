import React from 'react';
import { 
  Calendar, 
  MessageSquare, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  GripVertical,
  User
} from 'lucide-react';

export default function TaskCard({
  task,
  callerRole,
  currentUserId,
  onEdit,
  onDelete,
  onOpenDetails,
  onStatusChange,
}) {
  const isAssignedToMe = task.assignedDeveloper && 
    ((task.assignedDeveloper._id || task.assignedDeveloper) === currentUserId);
  const canManage = callerRole === 'Admin' || callerRole === 'Team Leader';
  const canChangeStatus = canManage || isAssignedToMe;

  // Drag handler
  const handleDragStart = (e) => {
    if (!canChangeStatus) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', task._id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Due date calculation
  const isOverdue = task.dueDate && 
    task.status !== 'Completed' && 
    new Date(task.dueDate) < new Date();

  const formattedDueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  }) : null;

  // Priority badge styling
  const priorityStyles = {
    Low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Medium: 'bg-blue-500/10 text-sky-400 border-blue-500/20',
    High: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Critical: 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-semibold animate-pulse',
  };

  const statusOptions = ['To Do', 'In Progress', 'In Review', 'Completed'];

  return (
    <div
      draggable={canChangeStatus}
      onDragStart={handleDragStart}
      className={`group relative bg-navy-900/90 border border-navy-700/80 rounded-xl p-4 transition-all duration-200 select-none ${
        canChangeStatus 
          ? 'cursor-grab active:cursor-grabbing hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10' 
          : 'cursor-default opacity-90'
      }`}
    >
      {/* Top row: Drag grip, Priority & Actions */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          {canChangeStatus && (
            <GripVertical className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          )}
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${priorityStyles[task.priority] || priorityStyles.Medium}`}>
            {task.priority}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {canManage && (
            <>
              <button
                onClick={() => onEdit(task)}
                className="p-1 text-slate-400 hover:text-sky-300 hover:bg-navy-800 rounded transition-colors"
                title="Edit Task"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(task._id)}
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-navy-800 rounded transition-colors"
                title="Delete Task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Task Title & Description */}
      <div 
        onClick={() => onOpenDetails(task)} 
        className="cursor-pointer space-y-1.5 mb-3.5"
      >
        <h4 className="text-sm font-semibold text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-2">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Card Footer: Assignee, Due Date, Comments, and Status Select */}
      <div className="pt-3 border-t border-navy-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Assignee pill */}
        <div className="flex items-center gap-2">
          {task.assignedDeveloper ? (
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-navy-800 border border-navy-700/80 text-slate-300"
              title={`Assigned to: ${task.assignedDeveloper.name} (${task.assignedDeveloper.email})`}
            >
              <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                {task.assignedDeveloper.name.charAt(0)}
              </div>
              <span className="text-[11px] truncate max-w-[90px]">
                {task.assignedDeveloper.name.split(' ')[0]}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 italic px-1.5 py-0.5 rounded bg-navy-950/60 border border-navy-800">
              Unassigned
            </span>
          )}

          {/* Comments count */}
          {task.comments && task.comments.length > 0 && (
            <div 
              onClick={() => onOpenDetails(task)}
              className="flex items-center gap-1 text-slate-400 hover:text-sky-300 cursor-pointer"
              title={`${task.comments.length} comments`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">{task.comments.length}</span>
            </div>
          )}
        </div>

        {/* Due Date or Mobile Quick Status */}
        <div className="flex items-center gap-2 ml-auto">
          {formattedDueDate && (
            <div 
              className={`flex items-center gap-1 text-[11px] font-medium ${
                isOverdue 
                  ? 'text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20' 
                  : 'text-slate-400'
              }`}
              title={isOverdue ? 'Overdue!' : `Due ${formattedDueDate}`}
            >
              <Calendar className="w-3 h-3" />
              <span>{formattedDueDate}</span>
            </div>
          )}

          {/* Quick status dropdown for mobile or non-drag workflows */}
          {canChangeStatus && (
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task._id, e.target.value)}
              className="bg-navy-950 border border-navy-700 rounded text-[10px] text-slate-300 px-1 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer"
              title="Move Task Status"
            >
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
