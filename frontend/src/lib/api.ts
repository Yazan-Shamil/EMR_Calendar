import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5555'

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ data?: T; error?: string }> {
  try {
    const { skipAuth = false, ...fetchOptions } = options

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    }

    // Add auth token if available and not skipped
    if (!skipAuth) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || `Request failed with status ${response.status}` }
    }

    return { data }
  } catch (error) {
    console.error('API request failed:', error)
    return { error: error instanceof Error ? error.message : 'Request failed' }
  }
}

// Health check
export const checkHealth = () => apiRequest('/health', { skipAuth: true })

// User endpoints
export const getCurrentUser = () => apiRequest('/api/v1/users/me')
export const createUserProfile = (profile: { name: string; email: string }) =>
  apiRequest('/api/v1/users/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  })

// Provider endpoints
export const getProviderDashboard = () => apiRequest('/api/v1/provider/dashboard')

// Patient endpoints
export const getPatientDashboard = () => apiRequest('/api/v1/patient/dashboard')