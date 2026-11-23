import { API_BASE_URL, getAuthToken } from './api'

export interface WsEvent {
  type: string
  [key: string]: any
}

type WsListener = (event: WsEvent) => void

let socket: WebSocket | null = null
let activeToken: string | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = 1500
const listeners = new Set<WsListener>()

function buildWsUrl(token: string) {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws')
  return `${wsBase}/ws?token=${encodeURIComponent(token)}`
}

export function connectWs() {
  const token = getAuthToken()
  if (!token) return

  if (
    socket &&
    activeToken === token &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return
  }

  if (socket) {
    try {
      socket.close()
    } catch (_) {}
    socket = null
  }

  activeToken = token

  try {
    const ws = new WebSocket(buildWsUrl(token))
    socket = ws

    ws.onopen = () => {
      reconnectDelay = 1500
    }

    ws.onmessage = (event) => {
      try {
        const parsed: WsEvent = JSON.parse(String(event.data))
        for (const listener of listeners) {
          listener(parsed)
        }
      } catch (_) {}
    }

    ws.onclose = () => {
      if (socket === ws) {
        socket = null
      }
      if (listeners.size > 0 && getAuthToken()) {
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 1.5, 10000)
          connectWs()
        }, reconnectDelay)
      }
    }

    ws.onerror = () => {
      // onclose handles reconnect
    }
  } catch (_) {}
}

export function disconnectWs() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  activeToken = null
  if (socket) {
    try {
      socket.close()
    } catch (_) {}
    socket = null
  }
}

export function subscribeWs(listener: WsListener): () => void {
  listeners.add(listener)
  connectWs()
  return () => {
    listeners.delete(listener)
  }
}

export function sendTyping(conversationId: string, targetUserId: string, isTyping: boolean) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  try {
    socket.send(
      JSON.stringify({
        type: 'typing',
        conversationId,
        targetUserId,
        isTyping,
      })
    )
  } catch (_) {}
}
