import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useState, useEffect } from 'react'
import { api, getAuthToken, setAuthToken } from '../../../lib/api'
import { updateOnboardingData, getOnboardingData } from '../../../lib/onboardingStore'

const MAX_PHOTOS = 6
const MIN_PHOTOS = 1

export default function PhotosScreen() {
  const [photos, setPhotos] = useState<string[]>([])
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const existing = getOnboardingData()
    if (existing.photos && existing.photos.length > 0) {
      setPhotos(existing.photos)
    } else {
      // Pre-fill with existing database user photo or Google photo
      api.auth.me().then((res) => {
        if (res?.user?.photos?.[0]?.url) {
          setPhotos([res.user.photos[0].url])
        }
      }).catch(() => {})
    }
  }, [])

  const pickAndUploadPhoto = async (targetIndex?: number) => {
    try {
      setErrorMessage(null)
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        setErrorMessage('Camera roll permission is required to upload photos.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      })

      if (result.canceled || !result.assets || !result.assets[0]) return

      const asset = result.assets[0]
      const indexToSet = typeof targetIndex === 'number' ? targetIndex : photos.length
      setUploadingIndex(indexToSet)

      // Upload via backend / UploadThing
      let uploadedUrl = asset.uri
      if (asset.base64) {
        const token = getAuthToken()
        if (!token) {
          const syncRes = await api.auth.neonSync().catch(() => null)
          if (syncRes?.token) {
            setAuthToken(syncRes.token)
          }
        }
        const mime = asset.mimeType || 'image/jpeg'
        const base64Data = `data:${mime};base64,${asset.base64}`
        const uploadRes = await api.upload.photo(base64Data)
        if (uploadRes?.url) {
          uploadedUrl = uploadRes.url
        }
      }

      setPhotos((prev) => {
        const next = [...prev]
        if (indexToSet < next.length) {
          next[indexToSet] = uploadedUrl
        } else {
          next.push(uploadedUrl)
        }
        const trimmed = next.slice(0, MAX_PHOTOS)
        updateOnboardingData({ photos: trimmed })
        api.auth.updateProfile({ photos: trimmed }).catch(() => {})
        return trimmed
      })
    } catch (err: any) {
      console.error('Photo upload failed:', err)
      setErrorMessage(err.message || 'Failed to upload photo. Please try again.')
    } finally {
      setUploadingIndex(null)
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index)
      updateOnboardingData({ photos: next })
      api.auth.updateProfile({ photos: next }).catch(() => {})
      return next
    })
  }

  const canContinue = photos.length >= MIN_PHOTOS

  const handleContinue = () => {
    if (!canContinue) return
    updateOnboardingData({ photos })
    api.auth.updateProfile({ photos }).catch(() => {})
    router.push('/(auth)/onboarding/bio')
  }

  const handleSkip = () => {
    router.push('/(auth)/onboarding/bio')
  }

  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] ?? null)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: '33%' }]} />
        </View>
        <Text style={styles.progressText}>2 of 6</Text>
      </View>

      <Text style={styles.title}>Add your{'\n'}photos</Text>
      <Text style={styles.subtitle}>Upload your real portrait & gallery photos. Your first photo is your main dating profile card.</Text>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Photo Grid */}
      <View style={styles.photoGrid}>
        {slots.map((uri, index) => {
          const isSlotUploading = uploadingIndex === index
          return (
            <Pressable
              key={index}
              style={[styles.photoSlot, index === 0 && styles.photoSlotMain]}
              onPress={() => !isSlotUploading && pickAndUploadPhoto(uri ? index : undefined)}
            >
              {isSlotUploading ? (
                <View style={styles.uploadingBox}>
                  <ActivityIndicator size="small" color="#E8475E" />
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              ) : uri ? (
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
                  <View style={styles.changeOverlay}>
                    <Text style={styles.changeText}>Tap to change</Text>
                  </View>
                </>
              ) : (
                <View style={styles.emptySlot}>
                  <Text style={styles.plusIcon}>+</Text>
                  {index === 0 && <Text style={styles.emptySlotHint}>Main portrait</Text>}
                </View>
              )}
            </Pressable>
          )
        })}
      </View>

      <Text style={styles.tip}>💡 Profiles with 3+ clear photos get 3x more authentic matches</Text>

      <View style={styles.buttonRow}>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, !canContinue && styles.primaryButtonDisabled, pressed && canContinue && { opacity: 0.9 }]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.primaryButtonText}>Continue ({photos.length}/{MIN_PHOTOS})</Text>
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
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#E8475E' },
  progressText: { fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#A0A0B0' },
  title: { fontSize: 32, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.4, lineHeight: 40, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', marginBottom: 28, lineHeight: 24 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#F87171' },
  errorText: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#991B1B', textAlign: 'center' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  photoSlot: { width: '31%', aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFF0ED', borderWidth: 1.5, borderColor: '#F0EDEF' },
  photoSlotMain: { width: '64.5%' },
  photoImage: { width: '100%', height: '100%' },
  emptySlot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  plusIcon: { fontSize: 28, color: '#E8475E', lineHeight: 32 },
  emptySlotHint: { fontSize: 11, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#A0A0B0' },
  uploadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF0ED' },
  uploadingText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#E8475E' },
  removeButton: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  removeButtonText: { fontSize: 13, color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontWeight: '700' },
  mainBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: '#E8475E', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, zIndex: 10 },
  mainBadgeText: { fontSize: 11, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  changeOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 4, alignItems: 'center' },
  changeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'DMSans_500Medium', fontWeight: '500' },
  tip: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#A0A0B0', textAlign: 'center', marginBottom: 32 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  skipButton: { flex: 1, paddingVertical: 18, alignItems: 'center', borderRadius: 18, borderWidth: 1.5, borderColor: '#F0EDEF', backgroundColor: '#FFFFFF' },
  skipButtonText: { fontSize: 17, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B' },
  primaryButton: { flex: 1, backgroundColor: '#E8475E', paddingVertical: 18, alignItems: 'center', borderRadius: 18, shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  primaryButtonDisabled: { backgroundColor: '#E0D8DA', shadowOpacity: 0, elevation: 0 },
  primaryButtonText: { fontSize: 17, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
})
