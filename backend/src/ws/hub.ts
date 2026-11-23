import { WebSocketServer, WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import type { Server } from 'http'

const JWT_SECRET = process.env.JWT_SECRET || 'vow_super_secret_jwt_key_development_2026'

// Map userId -> active WebSocket connections (supports multi-tab / multi-device)
const userSockets = new Map<string, Set<WebSocket>>()

export interface WsEventPayload {
  type: string
  [key: string]: any
}

export function emitToUser(userId: string, payload: WsEventPayload) {
  const sockets = userSockets.get(userId)
  if (!sockets || sockets.size === 0) return

  const serialized = JSON.stringify(payload)
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(serialized)
      } catch (_) {}
    }
  }
}

export function emitToUsers(userIds: string[], payload: WsEventPayload) {
  const unique = new Set(userIds.filter(Boolean))
  for (const uid of unique) {
    emitToUser(uid, payload)
  }
}

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url || '/ws', 'http://localhost')
      const token = url.searchParams.get('token')

      if (!token) {
        ws.close(4001, 'Missing auth token')
        return
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email?: string }
      if (!decoded?.userId) {
        ws.close(4002, 'Invalid auth token')
        return
      }

      const userId = decoded.userId
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set())
      }
      userSockets.get(userId)!.add(ws)

      ws.send(JSON.stringify({ type: 'ws:connected', userId }))

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString())
          if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }))
            return
          }
          // Relay ephemeral typing indicators to the conversation partner
          if (msg.type === 'typing' && msg.targetUserId && msg.conversationId) {
            emitToUser(String(msg.targetUserId), {
              type: 'chat:typing',
              conversationId: String(msg.conversationId),
              senderId: userId,
              isTyping: Boolean(msg.isTyping),
            })
          }
        } catch (_) {}
      })

      ws.on('close', () => {
        const set = userSockets.get(userId)
        if (set) {
          set.delete(ws)
          if (set.size === 0) {
            userSockets.delete(userId)
          }
        }
      })
    } catch {
      ws.close(4003, 'Unauthorized')
    }
  })

  console.log('⚡ Vow Real-Time WebSocket Hub attached at /ws')
  return wss
}
