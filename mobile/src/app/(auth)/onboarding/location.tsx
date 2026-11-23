import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import * as Location from 'expo-location'
import { api, getAuthToken, setAuthToken } from '../../../lib/api'
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

  const reverseGeocodeCoords = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      )
      if (!res.ok) return null
      const data = await res.json()
      const detectedCity = data.city || data.locality || data.principalSubdivision
      const countryCode = data.countryCode
      if (detectedCity) {
        return countryCode ? `${detectedCity}, ${countryCode}` : detectedCity
      }
    } catch (_) {}
    return null
  }

  const detectLocation = async () => {
    setDetecting(true)
    setErrorMessage(null)

    try {
      let resolvedCity: string | null = null

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 8000,
              maximumAge: 60000,
            })
          })
          resolvedCity = await reverseGeocodeCoords(pos.coords.latitude, pos.coords.longitude)
        } catch {
          // If browser geolocation is blocked/timed out, try IP-based city lookup
          const ipRes = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en').catch(() => null)
          if (ipRes?.ok) {
            const data = await ipRes.json()
            const c = data.city || data.locality || data.principalSubdivision
            if (c) resolvedCity = data.countryCode ? `${c}, ${data.countryCode}` : c
          }
        }
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          setErrorMessage('Location permission was denied. Please enter your city manually below.')
          setDetecting(false)
          return
        }
        const location = await Location.getCurrentPositionAsync({})
        const [geo] = await Location.reverseGeocodeAsync(location.coords).catch(() => [])
        if (geo?.city) {
          resolvedCity = geo.isoCountryCode ? `${geo.city}, ${geo.isoCountryCode}` : geo.city
        } else if (geo?.region) {
          resolvedCity = geo.region
        } else {
          resolvedCity = await reverseGeocodeCoords(location.coords.latitude, location.coords.longitude)
        }
      }

      if (resolvedCity) {
        setCity(resolvedCity)
      } else {
        setErrorMessage('Could not detect your city automatically. Please type your city below.')
      }
    } catch {
      setErrorMessage('Could not detect your location. Please enter your city manually below.')
    } finally {
      setDetecting(false)
    }
  }

  const handleFinish = async () => {
    if (!city.trim()) return

    setSaving(true)
    setErrorMessage(null)

    try {
      const allData = getOnboardingData()
      const token = getAuthToken()
      if (!token) {
        const syncRes = await api.auth.neonSync().catch(() => null)
        if (syncRes?.token) {
          setAuthToken(syncRes.token)
        }
      }

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
            <View style={[styles.progressFill, { width: '100%' }]} />
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
          style={({ pressed }) => [styles.primaryButton, (!city.trim() || saving) && styles.primaryButtonDisabled, Boolean(pressed && city.trim()) && { opacity: 0.9 }]}
          onPress={handleFinish}
          disabled={!city.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Start Discovering ♥</Text>
          )}
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
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#E8475E' },
  progressText: { fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#A0A0B0' },
  title: { fontSize: 32, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.4, lineHeight: 40, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', marginBottom: 28, lineHeight: 24 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#F87171' },
  errorText: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#991B1B', textAlign: 'center' },
  detectButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1.5, borderColor: '#FDDDE3', marginBottom: 20 },
  detectIcon: { fontSize: 20 },
  detectText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#E8475E' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0EDEF' },
  dividerText: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#A0A0B0' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#1A1A2E', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#1A1A2E', borderWidth: 1.5, borderColor: '#F0EDEF' },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#F0E6FF', borderRadius: 12, padding: 14, marginBottom: 28 },
  privacyIcon: { fontSize: 16 },
  privacyText: { flex: 1, fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', lineHeight: 20 },
  primaryButton: { backgroundColor: '#E8475E', paddingVertical: 18, alignItems: 'center', borderRadius: 18, shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  primaryButtonDisabled: { backgroundColor: '#E0D8DA', shadowOpacity: 0, elevation: 0 },
  primaryButtonText: { fontSize: 17, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
})
