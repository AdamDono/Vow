import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import * as WebBrowser from 'expo-web-browser'
import { api, setAuthToken } from '../../lib/api'

export default function SignupScreen() {
  const [name, setName] = useState('')
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

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in your name, email, and password.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await api.auth.signup({
        firstName: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        age: 25,
      })

      if (res.token) {
        setAuthToken(res.token)
        router.push('/(auth)/onboarding/basics')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Real Google OAuth via Neon Auth
  const handleGoogleSignUp = async () => {
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
        setErrorMessage(data.message || 'Could not initiate Google signup.')
      }
    } catch (err: any) {
      if (popup) popup.close()
      console.error('Google Sign-Up Error:', err)
      setErrorMessage(err.message || 'Google signup failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.title}>Create your{'\n'}account</Text>
          <Text style={styles.subtitle}>Start your journey to real love</Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your first name"
              placeholderTextColor="#A0A0B0"
              value={name}
              onChangeText={(t) => {
                setName(t)
                setErrorMessage(null)
              }}
              autoCapitalize="words"
            />
          </View>

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
              placeholder="At least 6 characters"
              placeholderTextColor="#A0A0B0"
              value={password}
              onChangeText={(t) => {
                setPassword(t)
                setErrorMessage(null)
              }}
              secureTextEntry
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
            onPress={handleSignup}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Real Google Sign-In Button */}
          <Pressable
            style={({ pressed }) => [styles.googleButton, pressed && { opacity: 0.85 }]}
            onPress={handleGoogleSignUp}
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

          <Pressable style={[styles.socialButton, { marginTop: 12 }]}>
            <View style={styles.socialInner}>
              <Ionicons name="logo-apple" size={20} color="#1A1A2E" />
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign in</Text>
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
  title: { fontSize: 34, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.4, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#F87171' },
  errorText: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#991B1B', textAlign: 'center' },
  form: { gap: 4 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#1A1A2E', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#1A1A2E', borderWidth: 1.5, borderColor: '#F0EDEF' },
  primaryButton: { backgroundColor: '#E8475E', paddingVertical: 18, alignItems: 'center', borderRadius: 18, shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  primaryButtonText: { fontSize: 17, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0EDEF' },
  dividerText: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#A0A0B0' },
  googleButton: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  socialInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  googleIconImage: { width: 22, height: 22 },
  googleButtonText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#1A1A2E' },
  socialButton: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#F0EDEF' },
  socialButtonText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#1A1A2E' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { fontSize: 15, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B' },
  footerLink: { fontSize: 15, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#E8475E' },
})
