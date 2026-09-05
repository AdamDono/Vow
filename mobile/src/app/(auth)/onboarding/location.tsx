import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import * as Location from 'expo-location'
import { api } from '../../../lib/api'
import { getOnboardingData, clearOnboardingData } from '../../../lib/onboardingStore'

export default function LocationScreen() {
  const [city, setCity] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const existing = getOnboardingData()
    if (existing.city) setCity(existing.city)
  }, [])

  const detectLocation = async () => {
    setDetecting(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setDetecting(false)
        return
      }
      const location = await Location.getCurrentPositionAsync({})
      const [geo] = await Location.reverseGeocodeAsync(location.coords)
      if (geo?.city) {
        setCity(geo.city)
      } else if (geo?.region) {
        setCity(geo.region)
      }
    } catch {
      // silently fail — user can type manually
    }
    setDetecting(false)
  }

  const handleFinish = async () => {
    if (!city.trim()) return

    setSaving(true)
    setErrorMessage(null)

    try {
      const allData = getOnboardingData()
      await api.auth.updateProfile({
        ...allData,
        city: city.trim(),
      })
      clearOnboardingData()
      router.replace('/(single)/discover')
    } catch (err: any) {
      console.error('Failed to save onboarding profile:', err)
      setErrorMessage(err.message || 'Could not save profile details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFFBF9', '#FFF0ED', '#FDDDE3']} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <LinearGradient colors={['#E8475E', '#F4A0B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>6 of 6</Text>
        </View>

        <Text style={styles.title}>Where are{'\n'}you based?</Text>
        <Text style={styles.subtitle}>We'll use this to find matches near you. Your exact location is never shared.</Text>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Auto detect */}
        <Pressable style={styles.detectButton} onPress={detectLocation} disabled={detecting || saving}>
          <Text style={styles.detectIcon}>📍</Text>
          <Text style={styles.detectText}>{detecting ? 'Detecting...' : 'Use my current location'}</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or enter manually</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Johannesburg, Cape Town, London"
            placeholderTextColor="#A0A0B0"
            value={city}
            onChangeText={(t) => {
              setCity(t)
              setErrorMessage(null)
            }}
            autoCapitalize="words"
          />
        </View>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            Your exact address is never visible to other users. Only your city is shown.
          </Text>
        </View>

        {/* Finish */}
        <Pressable
          style={({ pressed }) => [styles.primaryButton, (!city.trim() || saving) && styles.primaryButtonDisabled, pressed && city.trim() && { opacity: 0.9 }]}
          onPress={handleFinish}
          disabled={!city.trim() || saving}
        >
          <LinearGradient
            colors={city.trim() ? ['#E8475E', '#C73350'] : ['#E0D8DA', '#CFC8CB']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.primaryButtonGradient}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Start Discovering ♥</Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 70, paddingBottom: 48 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 40 },
  progressBg: { flex: 1, height: 4, backgroundColor: '#F0EDEF', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#A0A0B0' },
  title: { fontSize: 32, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.8, lineHeight: 40, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', marginBottom: 28, lineHeight: 24 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#F87171' },
  errorText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#991B1B', textAlign: 'center' },
  detectButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1.5, borderColor: '#FDDDE3', marginBottom: 20 },
  detectIcon: { fontSize: 20 },
  detectText: { fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#E8475E' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0EDEF' },
  dividerText: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', borderWidth: 1.5, borderColor: '#F0EDEF' },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#F0E6FF', borderRadius: 12, padding: 14, marginBottom: 28 },
  privacyIcon: { fontSize: 16 },
  privacyText: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', lineHeight: 20 },
  primaryButton: { borderRadius: 18, overflow: 'hidden', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  primaryButtonDisabled: { shadowOpacity: 0 },
  primaryButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  primaryButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
})
