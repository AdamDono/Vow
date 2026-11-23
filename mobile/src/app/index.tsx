import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { api, hydrateAuthToken, setAuthToken } from '../lib/api'

// Entry point: hydrate SecureStore/localStorage token & route straight into Single or Couples Mode
export default function Index() {
  useEffect(() => {
    let active = true

    async function resolveInitialRoute() {
      const token = await hydrateAuthToken()
      if (!token) {
        if (active) router.replace('/(auth)/welcome')
        return
      }

      try {
        const meRes = await api.auth.me()
        if (!active) return

        if (meRes?.user?.relationshipStatus === 'coupled') {
          router.replace('/(couple)/dashboard')
        } else if (meRes?.user) {
          router.replace('/(single)/discover')
        } else {
          router.replace('/(auth)/welcome')
        }
      } catch {
        setAuthToken(null)
        if (active) router.replace('/(auth)/welcome')
      }
    }

    resolveInitialRoute()
    return () => {
      active = false
    }
  }, [])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#E8475E" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
