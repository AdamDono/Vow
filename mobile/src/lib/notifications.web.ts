// Web & SSR safe no-op implementation — avoids loading native expo-notifications during static web rendering

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  return null
}

export async function unregisterPushTokenAsync(): Promise<void> {
  return
}

export function subscribeToNotificationTaps(): () => void {
  return () => {}
}

export async function scheduleDailyCheckinReminder(): Promise<void> {
  return
}
