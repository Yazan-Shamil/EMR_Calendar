import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import {
  ArrowLeft, Plus, MoreHorizontal, Trash2, Edit,
  Eye, EyeOff, Mail, Shield, User, Users
} from 'lucide-react'
import { useTeamsStore, type TeamMember } from '@/lib/stores/teamsStore'

export const Route = createFileRoute('/teams/$teamId')({
  component: TeamDetailComponent
})

function TeamDetailComponent() {
  const { teamId } = useParams({ from: '/teams/$teamId' })
  const {
    teams,
    updateTeam,
    addMemberToTeam,
    updateTeamMember,
    removeMemberFromTeam,
    toggleMemberVisibility
  } = useTeamsStore()

  const team = teams.find(t => t.id === parseInt(teamId))
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [editingTeam, setEditingTeam] = useState(false)
  const [teamData, setTeamData] = useState({
    name: team?.name || '',
    description: team?.description || '',
    color: team?.color || '#3b82f6'
  })
  const [newMemberData, setNewMemberData] = useState({
    name: '',
    email: '',
    role: 'member' as 'admin' | 'member'
  })
  const [animationParentRef] = useAutoAnimate<HTMLUListElement>()

  if (!team) {
    return (
      <div className="flex-1 overflow-hidden w-full">
        <div className="w-full px-4 py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Team not found</h3>
            <p className="text-gray-500 mb-4">The team you're looking for doesn't exist.</p>
            <Link
              to="/teams"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teams
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleUpdateTeam = () => {
    updateTeam(team.id, teamData)
    setEditingTeam(false)
  }

  const handleAddMember = () => {
    if (!newMemberData.name.trim() || !newMemberData.email.trim()) return

    addMemberToTeam(team.id, {
      ...newMemberData,
      isVisible: true
    })
    setShowAddMemberDialog(false)
    setNewMemberData({ name: '', email: '', role: 'member' })
  }

  const predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'
  ]

  return (
    <div className="flex-1 overflow-hidden w-full">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between md:mb-6 md:mt-0 lg:mb-8">
          <header className="flex w-full max-w-full items-center truncate">
            <Link
              to="/teams"
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="hidden w-full truncate ltr:mr-4 rtl:ml-4 md:block">
              {editingTeam ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={teamData.name}
                    onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
                    className="text-xl font-semibold bg-transparent border-b border-gray-300 focus:border-gray-900 outline-none"
                  />
                  <textarea
                    value={teamData.description}
                    onChange={(e) => setTeamData({ ...teamData, description: e.target.value })}
                    placeholder="Team description"
                    rows={1}
                    className="text-sm text-gray-500 bg-transparent border-b border-gray-200 focus:border-gray-900 outline-none w-full resize-none"
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <div
                    className="w-6 h-6 rounded-full border border-gray-200"
                    style={{ backgroundColor: team.color }}
                  />
                  <div>
                    <h3 className="font-cal text-emphasis text-xl font-semibold">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="text-default text-sm">{team.description}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              {editingTeam ? (
                <>
                  <button
                    onClick={() => {
                      setEditingTeam(false)
                      setTeamData({
                        name: team.name,
                        description: team.description || '',
                        color: team.color
                      })
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateTeam}
                    className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingTeam(true)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowAddMemberDialog(true)}
                    className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </button>
                </>
              )}
            </div>
          </header>
        </div>

        {/* Color Selection for Editing */}
        {editingTeam && (
          <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team color
            </label>
            <div className="flex space-x-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTeamData({ ...teamData, color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    teamData.color === color ? 'border-gray-900' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Team Members ({team.members.length})
              </h4>
              <div className="text-xs text-gray-500">
                {team.members.filter(m => m.isVisible).length} visible in calendar
              </div>
            </div>
          </div>

          {team.members.length === 0 ? (
            <div className="p-8 text-center">
              <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-4">No team members yet</p>
              <button
                onClick={() => setShowAddMemberDialog(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add first member
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200" ref={animationParentRef}>
              {team.members.map((member) => (
                <TeamMemberItem
                  key={member.id}
                  member={member}
                  teamId={team.id}
                  onToggleVisibility={() => toggleMemberVisibility(team.id, member.id)}
                  onUpdateMember={(updates) => updateTeamMember(team.id, member.id, updates)}
                  onRemoveMember={() => removeMemberFromTeam(team.id, member.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add Member Dialog */}
      <AddMemberDialog
        show={showAddMemberDialog}
        onClose={() => {
          setShowAddMemberDialog(false)
          setNewMemberData({ name: '', email: '', role: 'member' })
        }}
        memberData={newMemberData}
        onMemberDataChange={setNewMemberData}
        onSubmit={handleAddMember}
      />
    </div>
  )
}

function TeamMemberItem({
  member,
  teamId,
  onToggleVisibility,
  onUpdateMember,
  onRemoveMember
}: {
  member: TeamMember
  teamId: number
  onToggleVisibility: () => void
  onUpdateMember: (updates: Partial<TeamMember>) => void
  onRemoveMember: () => void
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: member.name,
    email: member.email,
    role: member.role
  })

  const handleSave = () => {
    onUpdateMember(editData)
    setEditing(false)
  }

  const handleCancel = () => {
    setEditData({
      name: member.name,
      email: member.email,
      role: member.role
    })
    setEditing(false)
  }

  return (
    <li>
      <div className="px-4 py-4 hover:bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>

            {/* Member Info */}
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="block w-full text-sm border border-gray-300 rounded px-2 py-1"
                    placeholder="Member name"
                  />
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="block w-full text-sm border border-gray-300 rounded px-2 py-1"
                    placeholder="Member email"
                  />
                  <select
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value as 'admin' | 'member' })}
                    className="block text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    {member.role === 'admin' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </span>
                    )}
                    {!member.isVisible && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Mail className="h-3 w-3 mr-1" />
                    {member.email}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="text-xs px-2 py-1 bg-gray-900 text-white rounded hover:bg-gray-800"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                {/* Visibility Toggle */}
                <button
                  onClick={onToggleVisibility}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                  title={member.isVisible ? "Hide from calendar" : "Show in calendar"}
                >
                  {member.isVisible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>

                {/* More Actions */}
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {showDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowDropdown(false)}
                      />
                      <div className="absolute right-0 z-20 mt-2 w-40 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                        <button
                          onClick={() => {
                            setEditing(true)
                            setShowDropdown(false)
                          }}
                          className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            onRemoveMember()
                            setShowDropdown(false)
                          }}
                          className="flex w-full items-center px-3 py-2 text-sm text-red-700 hover:bg-gray-100"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

function AddMemberDialog({
  show,
  onClose,
  memberData,
  onMemberDataChange,
  onSubmit
}: {
  show: boolean
  onClose: () => void
  memberData: { name: string; email: string; role: 'admin' | 'member' }
  onMemberDataChange: (data: { name: string; email: string; role: 'admin' | 'member' }) => void
  onSubmit: () => void
}) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Add team member</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="member-name" className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              id="member-name"
              value={memberData.name}
              onChange={(e) => onMemberDataChange({ ...memberData, name: e.target.value })}
              placeholder="Dr. John Smith"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="member-email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="member-email"
              value={memberData.email}
              onChange={(e) => onMemberDataChange({ ...memberData, email: e.target.value })}
              placeholder="john.smith@hospital.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <div>
            <label htmlFor="member-role" className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              id="member-role"
              value={memberData.role}
              onChange={(e) => onMemberDataChange({ ...memberData, role: e.target.value as 'admin' | 'member' })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!memberData.name.trim() || !memberData.email.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Member
          </button>
        </div>
      </div>
    </div>
  )
}