import { Navigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'provider' | 'patient'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />
  }

  if (requiredRole && user?.user_metadata?.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}