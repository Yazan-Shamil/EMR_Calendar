import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@/components/AppLayout'

export const Route = createFileRoute('/availability')({
  component: AvailabilityPage
})

function AvailabilityPage() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}