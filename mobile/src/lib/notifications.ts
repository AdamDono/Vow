import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { api } from './api'

// Show alert & sound even when app is in foreground on native devices
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

let cachedPushToken: string | null = null

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return null
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('vow-default', {
        name: 'Vow Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E8475E',
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      return null
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )
    const token = tokenData.data
    cachedPushToken = token

    await api.auth
      .registerPushToken({
        token,
        platform: Platform.OS,
      })
      .catch(() => {})

    return token
  } catch (err) {
    console.warn('Push token registration skipped:', err)
    return null
  }
}

export async function unregisterPushTokenAsync() {
  if (!cachedPushToken) return
  const tokenToRemove = cachedPushToken
  cachedPushToken = null
  await api.auth.removePushToken(tokenToRemove).catch(() => {})
}

export function subscribeToNotificationTaps(): () => void {
  if (Platform.OS === 'web') return () => {}

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = response?.notification?.request?.content?.data?.route
    if (typeof route === 'string' && route.startsWith('/')) {
      try {
        router.push(route as any)
      } catch (_) {}
    }
  })

  return () => sub.remove()
}

export async function scheduleDailyCheckinReminder() {
  if (Platform.OS === 'web') return
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔒 Daily Check-In Reminder',
        body: 'Take 30 seconds to share your double-blind reflection with your partner.',
        data: { route: '/(couple)/checkin' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    })
  } catch (_) {}
}
