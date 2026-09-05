import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'
import { updateOnboardingData, getOnboardingData } from '../../../lib/onboardingStore'

const MAX_PHOTOS = 6
const MIN_PHOTOS = 1

export default function PhotosScreen() {
  const [photos, setPhotos] = useState<string[]>([])

  useEffect(() => {
    const existing = getOnboardingData()
    if (existing.photos && existing.photos.length > 0) {
      setPhotos(existing.photos)
    } else {
      // Default placeholder photo if new user
      api.auth.me().then((res) => {
        if (res?.user?.photos?.[0]?.url) {
          setPhotos([res.user.photos[0].url])
        }
      }).catch(() => {})
    }
  }, [])

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    })

    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, MAX_PHOTOS))
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const canContinue = photos.length >= MIN_PHOTOS

  const handleContinue = () => {
    if (!canContinue) return
    updateOnboardingData({ photos })
    api.auth.updateProfile({ photos }).catch(() => {})
    router.push('/(auth)/onboarding/bio')
  }

  const handleSkip = () => {
    // If no photos picked, continue with defaults
    router.push('/(auth)/onboarding/bio')
  }

  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] ?? null)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <LinearGradient colors={['#E8475E', '#F4A0B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '33%' }]} />
        </View>
        <Text style={styles.progressText}>2 of 6</Text>
      </View>

      <Text style={styles.title}>Add your{'\n'}photos</Text>
      <Text style={styles.subtitle}>Add your profile photos. Your first photo is your main portrait.</Text>

      {/* Photo Grid */}
      <View style={styles.photoGrid}>
        {slots.map((uri, index) => (
          <Pressable
            key={index}
            style={[styles.photoSlot, index === 0 && styles.photoSlotMain]}
            onPress={uri ? undefined : pickPhoto}
          >
            {uri ? (
              <>
                <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
                <Pressable style={styles.removeButton} onPress={() => removePhoto(index)}>
                  <Text style={styles.removeButtonText}>✕</Text>
                </Pressable>
                {index === 0 && (
                  <View style={styles.mainBadge}>
                    <Text style={styles.mainBadgeText}>Main</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptySlot}>
                <Text style={styles.plusIcon}>+</Text>
                {index === 0 && <Text style={styles.emptySlotHint}>Main photo</Text>}
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <Text style={styles.tip}>💡 Profiles with clear photos get 3x more authentic connections</Text>

      <View style={styles.buttonRow}>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, !canContinue && styles.primaryButtonDisabled, pressed && canContinue && { opacity: 0.9 }]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <LinearGradient
            colors={canContinue ? ['#E8475E', '#C73350'] : ['#E0D8DA', '#CFC8CB']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.primaryButtonGradient}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  content: { paddingHorizontal: 28, paddingTop: 70, paddingBottom: 48 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 40 },
  progressBg: { flex: 1, height: 4, backgroundColor: '#F0EDEF', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#A0A0B0' },
  title: { fontSize: 32, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.8, lineHeight: 40, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', marginBottom: 32, lineHeight: 24 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  photoSlot: { width: '31%', aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFF0ED', borderWidth: 1.5, borderColor: '#F0EDEF' },
  photoSlotMain: { width: '64.5%' },
  photoImage: { width: '100%', height: '100%' },
  emptySlot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  plusIcon: { fontSize: 28, color: '#E8475E', lineHeight: 32 },
  emptySlotHint: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: '#A0A0B0' },
  removeButton: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  removeButtonText: { fontSize: 12, color: '#FFFFFF', fontFamily: 'PlusJakartaSans_700Bold' },
  mainBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: '#E8475E', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  mainBadgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  tip: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', textAlign: 'center', marginBottom: 32 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  skipButton: { flex: 1, paddingVertical: 18, alignItems: 'center', borderRadius: 18, borderWidth: 1.5, borderColor: '#F0EDEF', backgroundColor: '#FFFFFF' },
  skipButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#6B6B7B' },
  primaryButton: { flex: 1, borderRadius: 18, overflow: 'hidden', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  primaryButtonDisabled: { shadowOpacity: 0 },
  primaryButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  primaryButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
})
