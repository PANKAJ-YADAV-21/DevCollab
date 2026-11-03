import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Shield, 
  ShieldCheck, 
  UserCheck, 
  UserMinus, 
  UserPlus, 
  Trash2, 
  ArrowLeft, 
  Crown, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Lock,
  RefreshCw,
  Mail
} from 'lucide-react';
import axios from 'axios';

export default function TeamsView({ currentUser, onRequireAuth }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Create Team state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Add Member state
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Developer');
  const [addingMember, setAddingMember] = useState(false);

  // Auto-dismiss notification
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Fetch teams for current user
  const fetchTeams = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/teams');
      setTeams(response.data.data.teams || []);
      // Refresh selected team if currently open
      if (selectedTeam) {
        const updated = (response.data.data.teams || []).find(t => t._id === selectedTeam._id);
        if (updated) {
          fetchTeamDetails(updated._id);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamDetails = async (teamId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/teams/${teamId}`);
      setSelectedTeam(response.data.data.team);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve team details');
      setSelectedTeam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTeams();
    } else {
      setTeams([]);
      setSelectedTeam(null);
    }
  }, [currentUser]);

  // Handle Team Creation
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setCreatingTeam(true);
    setError(null);
    try {
      const response = await axios.post('/api/teams', {
        name: newTeamName.trim(),
        description: newTeamDesc.trim(),
      });
      setSuccessMsg('Team created successfully!');
      setNewTeamName('');
      setNewTeamDesc('');
      setShowCreateModal(false);
      await fetchTeams();
      setSelectedTeam(response.data.data.team);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team');
    } finally {
      setCreatingTeam(false);
    }
  };

  // Handle Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setAddingMember(true);
    setError(null);
    try {
      await axios.post(`/api/teams/${selectedTeam._id}/members`, {
        email: newMemberEmail.trim(),
        role: newMemberRole,
      });
      setSuccessMsg(`Member added successfully as ${newMemberRole}`);
      setNewMemberEmail('');
      setNewMemberRole('Developer');
      await fetchTeamDetails(selectedTeam._id);
      await fetchTeams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add team member');
    } finally {
      setAddingMember(false);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (userId, memberName) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this team?`)) return;

    setError(null);
    try {
      await axios.delete(`/api/teams/${selectedTeam._id}/members/${userId}`);
      setSuccessMsg('Team member removed');
      if (userId === currentUser._id) {
        // Current user left
        setSelectedTeam(null);
      } else {
        await fetchTeamDetails(selectedTeam._id);
      }
      await fetchTeams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  // Handle Update Role
  const handleRoleChange = async (userId, newRole) => {
    setError(null);
    try {
      await axios.put(`/api/teams/${selectedTeam._id}/members/${userId}/role`, {
        role: newRole,
      });
      setSuccessMsg(`Role updated to ${newRole}`);
      await fetchTeamDetails(selectedTeam._id);
      await fetchTeams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update member role');
    }
  };

  // Handle Delete Team
  const handleDeleteTeam = async () => {
    if (!confirm('Are you sure you want to permanently delete this team? This action cannot be undone.')) return;

    setError(null);
    try {
      await axios.delete(`/api/teams/${selectedTeam._id}`);
      setSuccessMsg('Team deleted');
      setSelectedTeam(null);
      await fetchTeams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete team');
    }
  };

  // If not logged in, prompt user
  if (!currentUser) {
    return (
      <div className="bg-navy-900 border border-navy-700/80 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-sky-400 flex items-center justify-center mx-auto">
          <Shield className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">Authentication Required</h3>
        <p className="text-xs sm:text-sm text-slate-300">
          Sign in to access DevCollab Team Management, create collaborative workspaces, and test role-based access control.
        </p>
        <button
          onClick={onRequireAuth}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
        >
          <Lock className="w-4 h-4" /> Sign In / Register
        </button>
      </div>
    );
  }

  // Current user's role in selected team
  const userTeamRole = selectedTeam
    ? selectedTeam.members?.find(m => (m.user?._id || m.user) === currentUser._id)?.role
    : null;

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
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

      {/* VIEW A: Single Team Detail & Member Management */}
      {selectedTeam ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Back navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedTeam(null)}
                className="p-2 rounded-lg bg-navy-900 hover:bg-navy-800 border border-navy-700 text-slate-300 transition-colors"
                title="Back to teams list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-white">{selectedTeam.name}</h2>
                  <RoleBadge role={userTeamRole} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedTeam.description || 'No description provided'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTeamDetails(selectedTeam._id)}
                disabled={loading}
                className="p-2 rounded-lg bg-navy-900 hover:bg-navy-800 border border-navy-700 text-slate-300 text-xs flex items-center gap-1.5"
                title="Refresh team"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {userTeamRole === 'Admin' && (
                <button
                  onClick={handleDeleteTeam}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Disband Team
                </button>
              )}
            </div>
          </div>

          {/* RBAC Info Banner */}
          <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
            userTeamRole === 'Admin'
              ? 'bg-blue-500/10 border-blue-500/20 text-sky-300'
              : userTeamRole === 'Team Leader'
              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}>
            <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold block mb-0.5">
                Active RBAC Level: {userTeamRole}
              </span>
              {userTeamRole === 'Admin' && (
                <p className="opacity-90">
                  Full permissions: Add members with any role (Admin, Team Leader, Developer), modify member roles, remove members, and manage team lifecycle.
                </p>
              )}
              {userTeamRole === 'Team Leader' && (
                <p className="opacity-90">
                  Leadership permissions: You can invite new Developers and remove existing Developers. Elevating roles or modifying Admins is restricted.
                </p>
              )}
              {userTeamRole === 'Developer' && (
                <p className="opacity-90">
                  Member permissions: You have read-only access to team details and active member directories. Adding or modifying members requires elevated role.
                </p>
              )}
            </div>
          </div>

          {/* Add Member Form (Admins & Team Leaders) */}
          {(userTeamRole === 'Admin' || userTeamRole === 'Team Leader') && (
            <div className="bg-navy-900 border border-navy-700/80 rounded-2xl p-5 shadow-lg space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-400" />
                Add Team Member
              </h3>
              <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7 relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="user@devcollab.io"
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    disabled={userTeamRole === 'Team Leader'}
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-60 cursor-pointer"
                  >
                    <option value="Developer">Developer</option>
                    {userTeamRole === 'Admin' && (
                      <>
                        <option value="Team Leader">Team Leader</option>
                        <option value="Admin">Admin</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={addingMember}
                    className="w-full h-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {addingMember ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </form>
              {userTeamRole === 'Team Leader' && (
                <p className="text-[11px] text-slate-400 italic">
                  * As Team Leader, you can invite collaborators with the Developer role.
                </p>
              )}
            </div>
          )}

          {/* Team Members List */}
          <div className="bg-navy-900 border border-navy-700/80 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-5 py-4 border-b border-navy-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                Team Members ({selectedTeam.members?.length || 0})
              </h3>
            </div>

            <div className="divide-y divide-navy-800/80">
              {selectedTeam.members?.map((member) => {
                const memberUser = member.user || {};
                const isCurrentUser = memberUser._id === currentUser._id;
                const canChangeRole = userTeamRole === 'Admin' && !isCurrentUser;
                const canRemove = 
                  isCurrentUser || // Leave team
                  userTeamRole === 'Admin' || // Admin can remove anyone
                  (userTeamRole === 'Team Leader' && member.role === 'Developer'); // Leader can remove Devs

                return (
                  <div key={member._id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-navy-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 p-0.5 flex-shrink-0">
                        <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center font-bold text-xs text-sky-400">
                          {memberUser.name ? memberUser.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">
                            {memberUser.name || 'Unnamed User'}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-sky-400">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          {memberUser.email || 'No email'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {/* Role Selector (Admin only) or Badge */}
                      {canChangeRole ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(memberUser._id, e.target.value)}
                          className="bg-navy-950 border border-navy-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Team Leader">Team Leader</option>
                          <option value="Developer">Developer</option>
                        </select>
                      ) : (
                        <RoleBadge role={member.role} />
                      )}

                      {/* Remove / Leave Action */}
                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(memberUser._id, memberUser.name)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                            isCurrentUser
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
                          }`}
                          title={isCurrentUser ? 'Leave Team' : 'Remove Member'}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* VIEW B: Teams List / Overview */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy-800">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                Team Workspaces
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage your teams, view active members, and configure role-based access
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchTeams}
                disabled={loading}
                className="p-2 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-700 text-slate-300 text-xs flex items-center gap-1.5"
                title="Refresh teams"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create Team
              </button>
            </div>
          </div>

          {loading && teams.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
              Loading your team workspaces...
            </div>
          ) : teams.length === 0 ? (
            <div className="bg-navy-900 border border-navy-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-navy-800 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No Teams Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You are not currently part of any team. Create your first team workspace to begin collaborating.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create New Team
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div
                  key={team._id}
                  onClick={() => fetchTeamDetails(team._id)}
                  className="p-5 rounded-2xl bg-navy-900 border border-navy-700/80 hover:border-blue-500/50 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Users className="w-5 h-5" />
                      </div>
                      <RoleBadge role={team.userRole} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-white text-sm group-hover:text-sky-300 transition-colors">
                        {team.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {team.description || 'No description provided'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {team.members?.length || 1} members
                    </span>
                    <span className="text-sky-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 text-[11px] font-medium">
                      Manage <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-navy-900 border border-navy-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1">Create New Team</h3>
            <p className="text-xs text-slate-400 mb-4">
              You will be assigned the <span className="text-sky-400 font-semibold">Admin</span> role for this team.
            </p>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Distributed Systems Core"
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  rows={3}
                  placeholder="What is this team working on?"
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-navy-800 text-slate-300 text-xs font-medium hover:bg-navy-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTeam}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {creatingTeam ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }) {
  if (role === 'Admin') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
        <Crown className="w-2.5 h-2.5" /> Admin
      </span>
    );
  }
  if (role === 'Team Leader') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
        <Sparkles className="w-2.5 h-2.5" /> Team Leader
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <ShieldCheck className="w-2.5 h-2.5" /> Developer
    </span>
  );
}
