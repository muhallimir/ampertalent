import { getImpersonationSession } from './admin-impersonation'

/**
 * Enhanced fetch function that automatically includes impersonation headers when needed
 */
export async function fetchWithImpersonation(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get current impersonation session
  const session = getImpersonationSession()
  
  // Prepare headers
  const headers = new Headers(options.headers)
  
  // Add impersonation headers if session exists
  if (session) {
    headers.set('x-impersonated-user-id', session.impersonatedUser.id)
    headers.set('x-admin-user-id', session.adminId)
    
    console.log('🎭 API CLIENT: Adding impersonation headers to request', {
      url,
      impersonatedUserId: session.impersonatedUser.id,
      adminId: session.adminId,
      impersonatedUserRole: session.impersonatedUser.role
    })
  }
  
  // Make the request with enhanced headers
  const response = await fetch(url, {
    ...options,
    headers
  })
  
  // Log response for debugging
  if (session) {
    console.log('🎭 API CLIENT: Response received', {
      url,
      status: response.status,
      statusText: response.statusText,
      impersonatedUserId: session.impersonatedUser.id
    })
  }
  
  return response
}

/**
 * Convenience function for GET requests with impersonation
 */
export async function getWithImpersonation(url: string): Promise<Response> {
  return fetchWithImpersonation(url, { method: 'GET' })
}

/**
 * Convenience function for POST requests with impersonation
 */
export async function postWithImpersonation(
  url: string,
  data?: any,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)
  
  if (data && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  
  return fetchWithImpersonation(url, {
    ...options,
    method: 'POST',
    headers,
    body: data ? JSON.stringify(data) : options.body
  })
}

/**
 * Convenience function for PUT requests with impersonation
 */
export async function putWithImpersonation(
  url: string,
  data?: any,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)
  
  if (data && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  
  return fetchWithImpersonation(url, {
    ...options,
    method: 'PUT',
    headers,
    body: data ? JSON.stringify(data) : options.body
  })
}

/**
 * Convenience function for DELETE requests with impersonation
 */
export async function deleteWithImpersonation(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetchWithImpersonation(url, {
    ...options,
    method: 'DELETE'
  })
}