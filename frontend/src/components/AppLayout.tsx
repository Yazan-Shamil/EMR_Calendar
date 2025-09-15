import { NavigationItem, MiniCalendar, Button, Icon } from '@/components/cal-ui'
import { useCalendarStore } from '@/lib/calendar/store'
import { useTeamsStore } from '@/lib/stores/teamsStore'
import { useState } from 'react'
import { ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { setSelectedDate } = useCalendarStore()
  const { teams, toggleTeamVisibility, toggleMemberVisibility } = useTeamsStore()
  const [expandedTeams, setExpandedTeams] = useState<number[]>([])

  const toggleTeamExpanded = (teamId: number) => {
    setExpandedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    )
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar - Full height, fixed left */}
      <aside className="bg-muted border-muted fixed left-0 hidden h-full w-14 flex-col overflow-y-auto overflow-x-hidden border-r md:sticky md:flex lg:w-72 lg:px-4">
        <div className="flex h-full flex-col justify-between py-3 lg:pt-4">
          <div>
            {/* User Profile Section - IN SIDEBAR */}
            <header className="items-center justify-between md:hidden lg:flex mb-6">
              <div className="w-full">
                <div className="flex items-center gap-2 px-2 py-2 hover:bg-subtle rounded-md cursor-pointer">
                  <div className="h-8 w-8 rounded-full bg-gray-300"></div>
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium text-emphasis">John Doe</p>
                    <p className="text-xs text-default">john@example.com</p>
                  </div>
                </div>
              </div>
            </header>

            {/* Create Button - Google Calendar Style */}
            <div className="hidden lg:block mb-6">
              <Button
                variant="default"
                className="w-full justify-start bg-default text-emphasis hover:bg-subtle border border-subtle rounded-full py-3 px-6 font-medium text-sm transition-all duration-200"
                size="lg"
              >
                <Icon name="plus" className="h-5 w-5 mr-3 text-emphasis" />
                Create
                <Icon name="chevron-down" className="h-4 w-4 ml-auto text-subtle" />
              </Button>
            </div>

            {/* Mini Calendar - Above Navigation */}
            <div className="hidden lg:block mb-6">
              <MiniCalendar
                onDateSelect={(date) => setSelectedDate(date)}
                className="mx-0"
              />
            </div>

            {/* Navigation Items */}
            <nav className="space-y-0.5">
              <NavigationItem
                item={{
                  name: "Bookings",
                  href: "/home",
                  icon: "calendar",
                }}
              />
              <NavigationItem
                item={{
                  name: "Availability",
                  href: "/availability",
                  icon: "clock",
                }}
              />

              {/* Teams Section */}
              <div className="space-y-0.5">
                <NavigationItem
                  item={{
                    name: "Teams",
                    href: "/teams",
                    icon: "users",
                  }}
                />

                {/* Team List with Members */}
                {teams.filter(team => team.isVisible).map((team) => (
                  <div key={team.id} className="ml-4 space-y-0.5">
                    {/* Team Header */}
                    <div className="flex items-center justify-between group hover:bg-subtle rounded-md px-2 py-1.5">
                      <div
                        className="flex items-center space-x-2 flex-1 cursor-pointer"
                        onClick={() => toggleTeamExpanded(team.id)}
                      >
                        {expandedTeams.includes(team.id) ? (
                          <ChevronDown className="h-3 w-3 text-default" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-default" />
                        )}
                        <div
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="text-sm text-emphasis font-medium truncate">
                          {team.name}
                        </span>
                      </div>

                      {/* Team Visibility Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleTeamVisibility(team.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded"
                        title={team.isVisible ? "Hide team from sidebar" : "Show team in sidebar"}
                      >
                        {team.isVisible ? (
                          <Eye className="h-3 w-3 text-default" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-default" />
                        )}
                      </button>
                    </div>

                    {/* Team Members */}
                    {expandedTeams.includes(team.id) && (
                      <div className="ml-4 space-y-0.5">
                        {team.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between group hover:bg-subtle rounded-md px-2 py-1"
                          >
                            <div className="flex items-center space-x-2 flex-1">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                              <span
                                className={`text-xs truncate ${
                                  member.isVisible
                                    ? 'text-emphasis font-medium'
                                    : 'text-muted'
                                }`}
                              >
                                {member.name}
                              </span>
                            </div>

                            {/* Member Visibility Toggle */}
                            <button
                              onClick={() => toggleMemberVisibility(team.id, member.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded"
                              title={member.isVisible ? "Hide from calendar" : "Show in calendar"}
                            >
                              {member.isVisible ? (
                                <Eye className="h-3 w-3 text-default" />
                              ) : (
                                <EyeOff className="h-3 w-3 text-default" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </nav>
          </div>

          {/* Bottom Navigation */}
          <nav className="space-y-0.5">
            <NavigationItem
              item={{
                name: "Settings",
                href: "/settings",
                icon: "settings",
              }}
            />
            <NavigationItem
              item={{
                name: "Help",
                href: "/help",
                icon: "circle-help",
              }}
            />
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex w-0 flex-1 flex-col h-screen">
        <main className="flex-1 flex flex-col bg-muted overflow-hidden w-full">
          <div className="flex-1 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}