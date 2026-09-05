import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import * as WebBrowser from 'expo-web-browser'
import { api, setAuthToken } from '../../lib/api'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    // Listen for OAuth popup completion message on web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data.token) {
          setAuthToken(event.data.token)
          setGoogleLoading(false)
          if (event.data.isNewUser) {
            router.replace('/(auth)/onboarding/basics')
          } else if (event.data.user?.relationshipStatus === 'coupled') {
            router.replace('/(couple)/dashboard')
          } else {
            router.replace('/(single)/discover')
          }
        }
      }

      window.addEventListener('message', handleMessage)
      return () => {
        window.removeEventListener('message', handleMessage)
      }
    }
  }, [])

  const handleLogin = async (overrideEmail?: string, overridePassword?: string) => {
    const loginEmail = overrideEmail || email
    const loginPass = overridePassword || password

    if (!loginEmail || !loginPass) {
      setErrorMessage('Please enter your email and password')
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await api.auth.login({
        email: loginEmail.trim().toLowerCase(),
        password: loginPass,
      })

      if (res.token) {
        setAuthToken(res.token)
        if (res.user?.relationshipStatus === 'coupled') {
          router.replace('/(couple)/dashboard')
        } else {
          router.replace('/(single)/discover')
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('password123')
    handleLogin(demoEmail, 'password123')
  }

  // Real Google OAuth via Neon Auth
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setErrorMessage(null)

    // Pre-open popup synchronously on user click to prevent browser popup blocking
    let popup: Window | null = null
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const width = 520
      const height = 650
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      popup = window.open(
        'about:blank',
        'GoogleSignIn',
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,status=no`
      )
      if (popup) {
        try {
          popup.document.write('<html><head><title>Connecting to Google...</title></head><body style="background:#FFFBF9;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui,-apple-system,sans-serif;color:#1A1A2E;"><div style="font-size:18px;font-weight:600;margin-bottom:8px;">Connecting to Google...</div><div style="font-size:14px;color:#6B6B7B;">Please wait while we redirect you.</div></body></html>')
        } catch (_) {}
      }
    }

    try {
      const origin = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:8081'
      const callbackURL = `${origin}/(auth)/callback`

      const authUrl = process.env.EXPO_PUBLIC_NEON_AUTH_URL || 'https://ep-still-truth-a5iuhm2p.neonauth.us-east-2.aws.neon.tech/neondb/auth'

      const res = await fetch(`${authUrl}/sign-in/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': origin,
        },
        body: JSON.stringify({
          provider: 'google',
          callbackURL,
        }),
      })

      const data = await res.json()

      if (data.url) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          if (popup && !popup.closed) {
            popup.location.href = data.url
            const checkClosed = setInterval(() => {
              if (popup?.closed) {
                clearInterval(checkClosed)
                setGoogleLoading(false)
              }
            }, 1000)
          } else {
            // Fallback: simulated click on target=_blank
            const link = document.createElement('a')
            link.href = data.url
            link.target = '_blank'
            link.rel = 'noopener noreferrer'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
        } else {
          const authResult = await WebBrowser.openAuthSessionAsync(data.url, callbackURL)
          if (authResult.type === 'success') {
            router.replace('/(auth)/callback')
          }
          setGoogleLoading(false)
        }
      } else {
        if (popup) popup.close()
        setGoogleLoading(false)
        setErrorMessage(data.message || 'Could not initiate Google authentication.')
      }
    } catch (err: any) {
      if (popup) popup.close()
      console.error('Google Sign-In Error:', err)
      setErrorMessage(err.message || 'Google sign in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>
        </View>

        {/* Demo Fast Login Pills */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>⚡ Quick Demo Sign-In (Neon DB):</Text>
          <View style={styles.demoPillRow}>
            <Pressable
              style={styles.demoPill}
              onPress={() => quickLogin('adam@vow.app')}
            >
              <Text style={styles.demoPillText}>💍 Adam (Couples Mode)</Text>
            </Pressable>
            <Pressable
              style={styles.demoPill}
              onPress={() => quickLogin('elena@vow.app')}
            >
              <Text style={styles.demoPillText}>💘 Elena (Single Mode)</Text>
            </Pressable>
          </View>
        </View>

        {/* Error banner */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#A0A0B0"
              value={email}
              onChangeText={(t) => {
                setEmail(t)
                setErrorMessage(null)
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor="#A0A0B0"
              value={password}
              onChangeText={(t) => {
                setPassword(t)
                setErrorMessage(null)
              }}
              secureTextEntry
            />
          </View>

          <Pressable style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>

          {/* Sign In Button */}
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
            onPress={() => handleLogin()}
            disabled={loading || googleLoading}
          >
            <LinearGradient
              colors={['#E8475E', '#C73350']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Real Google OAuth Button */}
          <Pressable
            style={({ pressed }) => [styles.googleButton, pressed && { opacity: 0.85 }]}
            onPress={handleGoogleSignIn}
            disabled={loading || googleLoading}
          >
            <View style={styles.socialInner}>
              {googleLoading ? (
                <ActivityIndicator size="small" color="#4285F4" />
              ) : (
                <Image
                  source={{ uri: 'https://developers.google.com/static/identity/images/g-logo.png' }}
                  style={styles.googleIconImage}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.googleButtonText}>
                {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
              </Text>
            </View>
          </Pressable>

          {/* Apple sign-in */}
          <Pressable style={[styles.socialButton, { marginTop: 12 }]}>
            <View style={styles.socialInner}>
              <Ionicons name="logo-apple" size={20} color="#1A1A2E" />
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </View>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.footerLink}>Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 24 },
  backButton: { marginBottom: 20, width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 20, color: '#1A1A2E' },
  title: { fontSize: 34, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.8, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  demoSection: { backgroundColor: '#F0E6FF', borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#E8D0D5' },
  demoTitle: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: '#6B3FA0', marginBottom: 8 },
  demoPillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  demoPill: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#C9A0F4' },
  demoPillText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#F87171' },
  errorText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#991B1B', textAlign: 'center' },
  form: { gap: 4 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', borderWidth: 1.5, borderColor: '#F0EDEF' },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotPasswordText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#E8475E' },
  primaryButton: { borderRadius: 18, overflow: 'hidden', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  primaryButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  primaryButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0EDEF' },
  dividerText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0' },
  googleButton: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  socialInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  googleIconImage: { width: 22, height: 22 },
  googleButtonText: { fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E' },
  socialButton: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#F0EDEF' },
  socialButtonText: { fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  footerLink: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
})
