import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    // TODO: Supabase auth.signInWithPassword
    // On success: router.replace('/(single)/discover')
    // On couple: router.replace('/(couple)/dashboard')
    setLoading(false)
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

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#A0A0B0"
              value={email}
              onChangeText={setEmail}
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
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Pressable style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>

          {/* Sign In Button */}
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={['#E8475E', '#C73350']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social auth placeholder */}
          <Pressable style={styles.socialButton}>
            <Text style={styles.socialButtonText}>🍎  Continue with Apple</Text>
          </Pressable>
          <Pressable style={[styles.socialButton, { marginTop: 12 }]}>
            <Text style={styles.socialButtonText}>🔵  Continue with Google</Text>
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
  scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 70, paddingBottom: 40 },
  header: { marginBottom: 40 },
  backButton: { marginBottom: 24, width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 20, color: '#1A1A2E' },
  title: { fontSize: 34, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.8, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  form: { gap: 4 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', borderWidth: 1.5, borderColor: '#F0EDEF' },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotPasswordText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#E8475E' },
  primaryButton: { borderRadius: 18, overflow: 'hidden', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  primaryButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  primaryButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0EDEF' },
  dividerText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0' },
  socialButton: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#F0EDEF' },
  socialButtonText: { fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  footerLink: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
})
