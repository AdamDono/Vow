// Vow Mobile API Client for Backend Integration

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'

let authToken: string | null = null

export const setAuthToken = (token: string | null) => {
  authToken = token
}

export const getAuthToken = () => authToken

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`)
  }

  return data as T
}

export const api = {
  // Auth
  auth: {
    signup: (data: any) => apiRequest<any>('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (credentials: { email: string; password: string }) =>
      apiRequest<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    me: () => apiRequest<any>('/api/auth/me'),
  },

  // Singles Mode
  singles: {
    getFeed: () => apiRequest<{ feed: any[] }>('/api/singles/feed'),
    swipe: (targetId: string, direction: 'like' | 'pass' | 'super_like') =>
      apiRequest<{ success: boolean; isMatch: boolean; matchId: string | null }>('/api/singles/swipe', {
        method: 'POST',
        body: JSON.stringify({ targetId, direction }),
      }),
    getMatches: () => apiRequest<{ matches: any[] }>('/api/singles/matches'),
  },

  // Couples Mode
  couples: {
    getDashboard: () => apiRequest<any>('/api/couples/dashboard'),
    submitCheckin: (payload: { moodScore: number; promptQuestion?: string; promptAnswer?: string }) =>
      apiRequest<any>('/api/couples/checkin', { method: 'POST', body: JSON.stringify(payload) }),
    getGoals: () => apiRequest<{ goals: any[] }>('/api/couples/goals'),
    createGoal: (goal: { title: string; description?: string; targetDate?: string }) =>
      apiRequest<{ goal: any }>('/api/couples/goals', { method: 'POST', body: JSON.stringify(goal) }),
    getTimeline: () => apiRequest<{ milestones: any[] }>('/api/couples/timeline'),
  },

  // Proposals
  proposals: {
    send: (receiverId: string) =>
      apiRequest<any>('/api/proposals/send', { method: 'POST', body: JSON.stringify({ receiverId }) }),
    accept: (inviteId: string) =>
      apiRequest<any>('/api/proposals/accept', { method: 'POST', body: JSON.stringify({ inviteId }) }),
  },

  // Chat
  chat: {
    getConversations: () => apiRequest<{ conversations: any[] }>('/api/chat/conversations'),
    getMessages: (conversationId: string) => apiRequest<{ messages: any[] }>(`/api/chat/${conversationId}/messages`),
    sendMessage: (conversationId: string, text: string, mediaUrl?: string) =>
      apiRequest<{ message: any }>(`/api/chat/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text, mediaUrl }),
      }),
  },
}
