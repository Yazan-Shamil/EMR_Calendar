import { createFileRoute, Link } from '@tanstack/react-router'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { useState } from 'react'
import { Users, MoreHorizontal, Eye, EyeOff, Copy, Trash2, Plus, Edit } from 'lucide-react'
import { useTeamsStore, type Team } from '@/lib/stores/teamsStore'

export const Route = createFileRoute('/teams/')({
  component: TeamsContent
})

function TeamsContent() {
  const { teams, addTeam, deleteTeam, error } = useTeamsStore()
  const [showNewTeamDialog, setShowNewTeamDialog] = useState(false)
  const [newTeamData, setNewTeamData] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  })
  const [animationParentRef] = useAutoAnimate<HTMLUListElement>()

  const handleCreateTeam = () => {
    if (!newTeamData.name.trim()) return

    addTeam({
      ...newTeamData,
      members: [],
      isVisible: true
    })
    setShowNewTeamDialog(false)
    setNewTeamData({ name: '', description: '', color: '#3b82f6' })
  }

  if (teams.length === 0) {
    return (
      <div className="flex-1 overflow-hidden w-full">
        <div className="w-full px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between md:mb-6 md:mt-0 lg:mb-8">
            <header className="flex w-full max-w-full items-center truncate">
              <div className="hidden w-full truncate ltr:mr-4 rtl:ml-4 md:block">
                <h3 className="font-cal text-emphasis max-w-28 sm:max-w-72 md:max-w-80 inline truncate text-lg font-semibold tracking-wide sm:text-xl md:block xl:max-w-full text-xl">
                  Teams
                </h3>
                <p className="text-default hidden text-sm md:block" data-testid="subtitle">
                  Manage your teams and control calendar visibility.
                </p>
              </div>
              <div className="flex-shrink-0 [-webkit-app-region:no-drag] md:relative md:bottom-auto md:right-auto">
                <button
                  onClick={() => setShowNewTeamDialog(true)}
                  className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Team
                </button>
              </div>
            </header>
          </div>

          {/* Empty State */}
          <div className="flex justify-center">
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-12 text-center bg-white">
              <Users className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Create your first team
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Teams help you organize users and manage calendar visibility across your organization.
              </p>
              <button
                onClick={() => setShowNewTeamDialog(true)}
                className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Team
              </button>
            </div>
          </div>
        </div>

        {/* New Team Dialog */}
        <NewTeamDialog
          show={showNewTeamDialog}
          onClose={() => {
            setShowNewTeamDialog(false)
            setNewTeamData({ name: '', description: '', color: '#3b82f6' })
          }}
          teamData={newTeamData}
          onTeamDataChange={setNewTeamData}
          onSubmit={handleCreateTeam}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden w-full">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between md:mb-6 md:mt-0 lg:mb-8">
          <header className="flex w-full max-w-full items-center truncate">
            <div className="hidden w-full truncate ltr:mr-4 rtl:ml-4 md:block">
              <h3 className="font-cal text-emphasis max-w-28 sm:max-w-72 md:max-w-80 inline truncate text-lg font-semibold tracking-wide sm:text-xl md:block xl:max-w-full text-xl">
                Teams
              </h3>
              <p className="text-default hidden text-sm md:block" data-testid="subtitle">
                Manage your teams and control calendar visibility.
              </p>
            </div>
            <div className="flex-shrink-0 [-webkit-app-region:no-drag] md:relative md:bottom-auto md:right-auto">
              <button
                onClick={() => setShowNewTeamDialog(true)}
                className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Team
              </button>
            </div>
          </header>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Teams List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200" data-testid="teams" ref={animationParentRef}>
            {teams.map((team) => (
              <TeamListItem
                key={team.id}
                team={team}
                onDelete={() => deleteTeam(team.id)}
              />
            ))}
          </ul>
        </div>

      </div>

      {/* New Team Dialog */}
      <NewTeamDialog
        show={showNewTeamDialog}
        onClose={() => {
          setShowNewTeamDialog(false)
          setNewTeamData({ name: '', description: '', color: '#3b82f6' })
        }}
        teamData={newTeamData}
        onTeamDataChange={setNewTeamData}
        onSubmit={handleCreateTeam}
      />
    </div>
  )
}

function TeamListItem({
  team,
  onDelete,
}: {
  team: Team
  onDelete: () => void
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const { toggleTeamVisibility } = useTeamsStore()

  return (
    <li key={team.id}>
      <div className="hover:bg-muted flex items-center justify-between px-3 py-5 transition sm:px-4 hover:bg-gray-50">
        <div className="group flex w-full items-center justify-between">
          <Link
            to={`/teams/${team.id}`}
            className="flex-grow truncate text-sm"
            title={team.name}
          >
            <div className="flex items-center space-x-3">
              {/* Team Color Indicator */}
              <div
                className="w-4 h-4 rounded-full border border-gray-200"
                style={{ backgroundColor: team.color }}
              />
              <div>
                <div className="space-x-2 rtl:space-x-reverse">
                  <span className="text-emphasis truncate font-medium text-gray-900">{team.name}</span>
                  {!team.isVisible && (
                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-subtle mt-1 text-gray-500">
                  {team.description && (
                    <span className="block">{team.description}</span>
                  )}
                  <span className="block mt-1">
                    {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                    {team.members.some(m => m.isVisible) && (
                      <span className="ml-2 text-xs">
                        • {team.members.filter(m => m.isVisible).length} visible in calendar
                      </span>
                    )}
                  </span>
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Visibility Toggle */}
        <button
          onClick={() => toggleTeamVisibility(team.id)}
          className="mr-2 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          title={team.isVisible ? "Hide team from sidebar" : "Show team in sidebar"}
        >
          {team.isVisible ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>

        {/* Dropdown Menu */}
        <div className="relative">
          <button
            data-testid="team-more"
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {showDropdown && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />

              {/* Dropdown */}
              <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <Link
                  to={`/teams/${team.id}`}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowDropdown(false)}
                >
                  <Edit className="h-4 w-4 mr-3" />
                  Edit team
                </Link>
                <button
                  onClick={() => {
                    onDelete()
                    setShowDropdown(false)
                  }}
                  className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-gray-100"
                  data-testid="delete-team"
                >
                  <Trash2 className="h-4 w-4 mr-3" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </li>
  )
}

function NewTeamDialog({
  show,
  onClose,
  teamData,
  onTeamDataChange,
  onSubmit
}: {
  show: boolean
  onClose: () => void
  teamData: { name: string; description: string; color: string }
  onTeamDataChange: (data: { name: string; description: string; color: string }) => void
  onSubmit: () => void
}) {
  if (!show) return null

  const predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Create new team</h2>

        <div className="space-y-4">
          {/* Team Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Team name
            </label>
            <input
              type="text"
              id="name"
              value={teamData.name}
              onChange={(e) => onTeamDataChange({ ...teamData, name: e.target.value })}
              placeholder="e.g., Cardiology, Emergency Medicine"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={teamData.description}
              onChange={(e) => onTeamDataChange({ ...teamData, description: e.target.value })}
              placeholder="Brief description of the team"
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team color
            </label>
            <div className="flex space-x-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onTeamDataChange({ ...teamData, color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    teamData.color === color ? 'border-gray-900' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!teamData.name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Team
          </button>
        </div>
      </div>
    </div>
  )
}