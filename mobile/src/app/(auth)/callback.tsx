import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { api, setAuthToken } from '../../lib/api'
import { LinearGradient } from 'expo-linear-gradient'

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState('Completing Google Sign-In...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function handleAuth() {
      try {
        setStatus('Authenticating your Google account...')

        // Sync with backend using real Neon Auth / Google user
        const res = await api.auth.neonSync()

        if (!isMounted) return

        if (res.token) {
          setAuthToken(res.token)
          setStatus('Welcome to Vow! Loading your profile...')

          // If opened in a popup window from the simulator or web app, communicate back to parent window
          if (typeof window !== 'undefined' && window.opener) {
            window.opener.postMessage(
              {
                type: 'GOOGLE_AUTH_SUCCESS',
                token: res.token,
                isNewUser: res.isNewUser,
                user: res.user,
              },
              '*'
            )
            setTimeout(() => {
              window.close()
            }, 400)
            return
          }

          setTimeout(() => {
            if (res.isNewUser) {
              router.replace('/(auth)/onboarding/basics')
            } else if (res.user?.relationshipStatus === 'coupled') {
              router.replace('/(couple)/dashboard')
            } else {
              router.replace('/(single)/discover')
            }
          }, 600)
        } else {
          setError('Could not complete Google sign-in. Please try again.')
        }
      } catch (err: any) {
        if (!isMounted) return
        console.error('Google Callback Auth Error:', err)
        setError(err.message || 'Failed to authenticate with Google. Please try again.')
      }
    }

    handleAuth()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFBF9', '#FFF0ED', '#FFE5E0']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.card}>
        <Text style={styles.brandTitle}>VOW</Text>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Text
              style={styles.retryText}
              onPress={() => router.replace('/(auth)/login')}
            >
              ← Back to Sign In
            </Text>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E8475E" />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    shadowColor: '#E8475E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0EDEF',
  },
  brandTitle: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#E8475E',
    letterSpacing: 2,
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  statusText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#6B6B7B',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#DC2626',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#E8475E',
    marginTop: 8,
  },
})
