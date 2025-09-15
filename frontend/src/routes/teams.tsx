import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@/components/AppLayout'

export const Route = createFileRoute('/teams')({
  component: TeamsLayout,
})

function TeamsLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}