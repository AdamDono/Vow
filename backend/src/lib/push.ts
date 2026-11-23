import { db } from '../db/client.js'
import { pushTokens } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'

export interface PushNotificationPayload {
  title: string
  body: string
  data?: Record<string, any>
}

// Dispatch native iOS/Android push notifications via Expo Push Service (100% free)
export async function sendPushToUser(userId: string, payload: PushNotificationPayload) {
  try {
    const tokens = await db.query.pushTokens.findMany({
      where: eq(pushTokens.userId, userId),
    })

    const expoTokens = tokens.filter((t) =>
      t.token.startsWith('ExponentPushToken[') || t.token.startsWith('ExpoPushToken[')
    )
    if (expoTokens.length === 0) return

    const messages = expoTokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    }))

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    if (!res.ok) return
    const result: any = await res.json().catch(() => null)
    const receipts: any[] = Array.isArray(result?.data) ? result.data : []

    // Clean up any stale/uninstalled device tokens automatically
    for (let i = 0; i < receipts.length; i++) {
      if (receipts[i]?.details?.error === 'DeviceNotRegistered') {
        const staleToken = expoTokens[i]?.token
        if (staleToken) {
          await db.delete(pushTokens).where(eq(pushTokens.token, staleToken)).catch(() => {})
        }
      }
    }
  } catch (err) {
    console.warn('Expo push delivery skipped:', err)
  }
}
