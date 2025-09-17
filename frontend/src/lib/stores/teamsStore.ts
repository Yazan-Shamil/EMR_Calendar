import { create } from 'zustand'

export interface TeamMember {
  id: number
  name: string
  email: string
  role: 'admin' | 'member'
  isVisible: boolean // Controls if their calendar appears in home view
}

export interface Team {
  id: number
  name: string
  description?: string
  color: string
  members: TeamMember[]
  isVisible: boolean // Controls if team appears in sidebar
}

interface TeamsState {
  teams: Team[]
  loading: boolean
  error: string | null
}

interface TeamsActions {
  addTeam: (team: Omit<Team, 'id'>) => void
  updateTeam: (id: number, updates: Partial<Team>) => void
  deleteTeam: (id: number) => void
  addMemberToTeam: (teamId: number, member: Omit<TeamMember, 'id'>) => void
  updateTeamMember: (teamId: number, memberId: number, updates: Partial<TeamMember>) => void
  removeMemberFromTeam: (teamId: number, memberId: number) => void
  toggleTeamVisibility: (teamId: number) => void
  toggleMemberVisibility: (teamId: number, memberId: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

// Provider colors mapping
export const providerColors: Record<string, string> = {
  'Dr. Ashley Martinez': '#ef4444', // red
  'Dr. David Wilson': '#3b82f6', // blue
  'Dr. Emily Davis': '#10b981', // green
  'Dr. Jessica Moore': '#f59e0b', // amber
  'Dr. John Smith': '#8b5cf6', // purple
}

// Default color for unknown providers
export const defaultProviderColor = '#6b7280' // gray

// Utility function to get provider color
export const getProviderColor = (providerName: string): string => {
  return providerColors[providerName] || defaultProviderColor
}

// Utility function to get visible providers
export const getVisibleProviders = (teams: Team[]): string[] => {
  return teams
    .filter(team => team.isVisible)
    .flatMap(team =>
      team.members
        .filter(member => member.isVisible)
        .map(member => member.name)
    )
}

// Hardcoded provider data for demo
const providers: Team[] = [
  {
    id: 1,
    name: 'Providers',
    description: 'Available medical providers',
    color: '#6366f1',
    isVisible: true,
    members: [
      { id: 1, name: 'Dr. Ashley Martinez', email: 'ashley.martinez@hospital.com', role: 'member', isVisible: true },
      { id: 2, name: 'Dr. David Wilson', email: 'david.wilson@hospital.com', role: 'member', isVisible: true },
      { id: 3, name: 'Dr. Emily Davis', email: 'emily.davis@hospital.com', role: 'member', isVisible: true },
      { id: 4, name: 'Dr. Jessica Moore', email: 'jessica.moore@hospital.com', role: 'member', isVisible: true },
      { id: 5, name: 'Dr. John Smith', email: 'john.smith@hospital.com', role: 'member', isVisible: true }
    ]
  }
]

export const useTeamsStore = create<TeamsState & TeamsActions>((set, get) => ({
  teams: providers,
  loading: false,
  error: null,

  addTeam: (teamData) => {
    const newTeam: Team = {
      ...teamData,
      id: Math.max(...get().teams.map(t => t.id), 0) + 1,
    }
    set(state => ({
      teams: [...state.teams, newTeam],
      error: null
    }))
  },

  updateTeam: (id, updates) => {
    set(state => ({
      teams: state.teams.map(team =>
        team.id === id ? { ...team, ...updates } : team
      ),
      error: null
    }))
  },

  deleteTeam: (id) => {
    set(state => ({
      teams: state.teams.filter(team => team.id !== id),
      error: null
    }))
  },

  addMemberToTeam: (teamId, memberData) => {
    const team = get().teams.find(t => t.id === teamId)
    if (!team) return

    const newMember: TeamMember = {
      ...memberData,
      id: Math.max(...team.members.map(m => m.id), 0) + 1,
    }

    set(state => ({
      teams: state.teams.map(team =>
        team.id === teamId
          ? { ...team, members: [...team.members, newMember] }
          : team
      ),
      error: null
    }))
  },

  updateTeamMember: (teamId, memberId, updates) => {
    set(state => ({
      teams: state.teams.map(team =>
        team.id === teamId
          ? {
              ...team,
              members: team.members.map(member =>
                member.id === memberId ? { ...member, ...updates } : member
              )
            }
          : team
      ),
      error: null
    }))
  },

  removeMemberFromTeam: (teamId, memberId) => {
    set(state => ({
      teams: state.teams.map(team =>
        team.id === teamId
          ? { ...team, members: team.members.filter(member => member.id !== memberId) }
          : team
      ),
      error: null
    }))
  },

  toggleTeamVisibility: (teamId) => {
    set(state => ({
      teams: state.teams.map(team =>
        team.id === teamId ? { ...team, isVisible: !team.isVisible } : team
      )
    }))
  },

  toggleMemberVisibility: (teamId, memberId) => {
    set(state => ({
      teams: state.teams.map(team =>
        team.id === teamId
          ? {
              ...team,
              members: team.members.map(member =>
                member.id === memberId ? { ...member, isVisible: !member.isVisible } : member
              )
            }
          : team
      )
    }))
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}))