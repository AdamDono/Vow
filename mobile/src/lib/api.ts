// Vow Mobile API Client for Backend Integration
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'
const STORAGE_KEY = 'vow_auth_token'

let authToken: string | null = null

// Initialize from storage on web synchronously
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    authToken = window.localStorage.getItem(STORAGE_KEY)
  } catch (_) {}
}

// Hydrate token from native SecureStore (iOS Keychain / Android Keystore) or web localStorage
export const hydrateAuthToken = async (): Promise<string | null> => {
  if (authToken) return authToken
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      authToken = window.localStorage.getItem(STORAGE_KEY)
    } catch (_) {}
    return authToken
  }
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY)
    if (stored) authToken = stored
  } catch (_) {}
  return authToken
}

export const setAuthToken = (token: string | null) => {
  authToken = token
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      if (token) {
        window.localStorage.setItem(STORAGE_KEY, token)
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch (_) {}
  } else {
    if (token) {
      SecureStore.setItemAsync(STORAGE_KEY, token).catch(() => {})
    } else {
      SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {})
    }
  }
}

export const getAuthToken = (): string | null => {
  if (!authToken && Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      authToken = window.localStorage.getItem(STORAGE_KEY)
    } catch (_) {}
  }
  return authToken
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken() || (await hydrateAuthToken())
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
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
    googleLogin: (payload: { email: string; name?: string; firstName?: string; lastName?: string; photoUrl?: string }) =>
      apiRequest<any>('/api/auth/google', { method: 'POST', body: JSON.stringify(payload) }),
    neonSync: (payload?: { sessionToken?: string; email?: string; name?: string; image?: string }) =>
      apiRequest<any>('/api/auth/neon-sync', { method: 'POST', body: JSON.stringify(payload || {}) }),
    updateProfile: (data: any) =>
      apiRequest<any>('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
    verifyLiveness: (payload: { selfieUrl?: string; challengesCompleted: string[] }) =>
      apiRequest<{ success: boolean; message: string; livenessVerified: boolean; verifiedAt: string; vouchRating: number }>(
        '/api/auth/verify-liveness',
        { method: 'POST', body: JSON.stringify(payload) }
      ),
    registerPushToken: (payload: { token: string; platform: string }) =>
      apiRequest<{ success: boolean }>('/api/auth/push-token', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    removePushToken: (token: string) =>
      apiRequest<{ success: boolean }>('/api/auth/push-token', {
        method: 'DELETE',
        body: JSON.stringify({ token }),
      }),
    me: () => apiRequest<any>('/api/auth/me'),
  },

  // Upload (UploadThing / Cloudinary CDN)
  upload: {
    photo: (base64OrDataUri: string) =>
      apiRequest<{ success: boolean; url: string; provider?: string }>('/api/upload', {
        method: 'POST',
        body: JSON.stringify({ image: base64OrDataUri }),
      }),
  },

  // Singles Mode
  singles: {
    getFeed: (filters?: {
      minAge?: number
      maxAge?: number
      city?: string
      lookingFor?: string
      verifiedOnly?: boolean
      includeSwiped?: boolean
    }) => {
      const params = new URLSearchParams()
      if (filters?.minAge) params.append('minAge', String(filters.minAge))
      if (filters?.maxAge) params.append('maxAge', String(filters.maxAge))
      if (filters?.city && filters.city !== 'All') params.append('city', filters.city)
      if (filters?.lookingFor && filters?.lookingFor !== 'All') params.append('lookingFor', filters.lookingFor)
      if (filters?.verifiedOnly) params.append('verifiedOnly', 'true')
      if (filters?.includeSwiped) params.append('includeSwiped', 'true')

      const queryString = params.toString() ? `?${params.toString()}` : ''
      return apiRequest<{ feed: any[] }>(`/api/singles/feed${queryString}`)
    },
    resetSwipes: () =>
      apiRequest<{ success: boolean; message: string }>('/api/singles/reset-swipes', {
        method: 'POST',
      }),
    swipe: (targetId: string, direction: 'like' | 'pass' | 'super_like') =>
      apiRequest<{ success: boolean; isMatch: boolean; matchId: string | null }>('/api/singles/swipe', {
        method: 'POST',
        body: JSON.stringify({ targetId, direction }),
      }),
    getMatches: () => apiRequest<{ matches: any[] }>('/api/singles/matches'),
    getLikes: () => apiRequest<{ likes: any[] }>('/api/singles/likes'),
    unmatch: (matchId: string) =>
      apiRequest<{ success: boolean }>('/api/singles/unmatch', {
        method: 'POST',
        body: JSON.stringify({ matchId }),
      }),
    blockAndReport: (payload: { targetUserId: string; matchId?: string; report?: boolean; reason?: string; details?: string }) =>
      apiRequest<{ success: boolean; message: string }>('/api/singles/block', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Couples Mode
  couples: {
    getDashboard: () => apiRequest<any>('/api/couples/dashboard'),
    submitCheckin: (payload: { moodScore: number; promptQuestion?: string; promptAnswer?: string }) =>
      apiRequest<any>('/api/couples/checkin', { method: 'POST', body: JSON.stringify(payload) }),
    getGoals: () => apiRequest<{ goals: any[] }>('/api/couples/goals'),
    createGoal: (goal: { title: string; description?: string; targetDate?: string }) =>
      apiRequest<{ goal: any }>('/api/couples/goals', { method: 'POST', body: JSON.stringify(goal) }),
    toggleGoal: (goalId: string, isCompleted?: boolean) =>
      apiRequest<{ goal: any }>(`/api/couples/goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isCompleted }),
      }),
    deleteGoal: (goalId: string) =>
      apiRequest<{ success: boolean }>(`/api/couples/goals/${goalId}`, { method: 'DELETE' }),
    getTimeline: () => apiRequest<{ milestones: any[] }>('/api/couples/timeline'),
    createMilestone: (payload: { title: string; description?: string; eventDate?: string; photoUrl?: string }) =>
      apiRequest<{ milestone: any }>('/api/couples/timeline', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    endRelationship: (payload?: { respectRating?: number }) =>
      apiRequest<{ success: boolean; message: string }>('/api/couples/end', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    getHistory: () => apiRequest<{ count: number; relationships: any[] }>('/api/couples/history'),
    getDateSpots: (params?: { city?: string; category?: string; lat?: number; lng?: number }) => {
      const qs = new URLSearchParams()
      if (params?.city) qs.append('city', params.city)
      if (params?.category && params.category !== 'all') qs.append('category', params.category)
      if (params?.lat) qs.append('lat', String(params.lat))
      if (params?.lng) qs.append('lng', String(params.lng))
      const suffix = qs.toString() ? `?${qs.toString()}` : ''
      return apiRequest<{ city: string; source: 'live_osm' | 'curated'; spots: any[] }>(
        `/api/couples/date-spots${suffix}`
      )
    },
    planDateNight: (payload: { spotName: string; address?: string; dateTimeLabel?: string; note?: string }) =>
      apiRequest<{ success: boolean; goal: any; message: any }>('/api/couples/date-spots/plan', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Proposals
  proposals: {
    list: () => apiRequest<{ incoming: any[]; outgoing: any[] }>('/api/proposals'),
    send: (receiverId: string) =>
      apiRequest<any>('/api/proposals/send', { method: 'POST', body: JSON.stringify({ receiverId }) }),
    accept: (inviteId: string) =>
      apiRequest<any>('/api/proposals/accept', { method: 'POST', body: JSON.stringify({ inviteId }) }),
    decline: (inviteId: string) =>
      apiRequest<any>('/api/proposals/decline', { method: 'POST', body: JSON.stringify({ inviteId }) }),
  },

  // Chat
  chat: {
    getConversations: () => apiRequest<{ conversations: any[] }>('/api/chat/conversations'),
    getMessages: (conversationId: string) => apiRequest<{ conversationId?: string; messages: any[] }>(`/api/chat/${conversationId}/messages`),
    sendMessage: (conversationId: string, text: string, mediaUrl?: string) =>
      apiRequest<{ message: any }>(`/api/chat/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text, mediaUrl }),
      }),
    respondDateProposal: (conversationId: string, messageId: string, status: 'accepted' | 'declined') =>
      apiRequest<{ success: boolean; message: any }>(
        `/api/chat/${conversationId}/date-proposal/${messageId}/respond`,
        {
          method: 'POST',
          body: JSON.stringify({ status }),
        }
      ),
  },
}
