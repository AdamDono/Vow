import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import { api, setAuthToken } from '../../lib/api'

export default function SignupScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
            disabled={loading}
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
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.socialButton}>
            <Text style={styles.socialButtonText}>🍎  Continue with Apple</Text>
          </Pressable>
          <Pressable style={[styles.socialButton, { marginTop: 12 }]}>
            <Text style={styles.socialButtonText}>🔵  Continue with Google</Text>
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
  header: { marginBottom: 28 },
  backButton: { marginBottom: 20, width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 20, color: '#1A1A2E' },
  title: { fontSize: 34, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.8, marginBottom: 8, lineHeight: 42 },
  subtitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#F87171' },
  errorText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#991B1B', textAlign: 'center' },
  form: { gap: 4 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', borderWidth: 1.5, borderColor: '#F0EDEF' },
  primaryButton: { borderRadius: 18, overflow: 'hidden', marginTop: 8, shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  primaryButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  primaryButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0EDEF' },
  dividerText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0' },
  socialButton: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#F0EDEF' },
  socialButtonText: { fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  footerLink: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
})
