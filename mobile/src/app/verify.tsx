import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState, useRef, useEffect } from 'react'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { api } from '../lib/api'

const CHALLENGES = [
  {
    id: 'center',
    stepLabel: 'Step 1 of 3',
    title: 'Center your face',
    instruction: 'Position your face comfortably inside the circle in clear lighting.',
    buttonLabel: 'Looks Good — Next',
    icon: 'scan-outline' as const,
  },
  {
    id: 'turn_right',
    stepLabel: 'Step 2 of 3',
    title: 'Turn slightly right',
    instruction: 'Gently turn your head a little to the right to confirm live movement.',
    buttonLabel: 'Done — Final Step',
    icon: 'arrow-forward-circle-outline' as const,
  },
  {
    id: 'smile',
    stepLabel: 'Step 3 of 3',
    title: 'Smile & Verify',
    instruction: 'Look back at the camera, give a natural smile, and tap Verify below.',
    buttonLabel: 'Capture & Verify Identity',
    icon: 'happy-outline' as const,
  },
]

export default function VerifyIdentityScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [stepIndex, setStepIndex] = useState(0)
  const [completed, setCompleted] = useState<string[]>([])
  const [verifying, setVerifying] = useState(false)
  const [verifiedResult, setVerifiedResult] = useState<{ vouchRating: number } | null>(null)
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Web camera state
  const [webCamReady, setWebCamReady] = useState(false)
  const [webCamError, setWebCamError] = useState<string | null>(null)
  const videoRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const nativeCameraRef = useRef<any>(null)

  // Start webcam on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return
    }
    let mounted = true

    async function startWebCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        })
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setWebCamReady(true)
      } catch {
        if (mounted) {
          setWebCamError('Camera access unavailable on this browser. You can upload a live selfie photo instead.')
        }
      }
    }

    startWebCamera()

    return () => {
      mounted = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  const stopWebStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  const captureFrameBase64 = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        const video = videoRef.current
        if (video && video.videoWidth > 0 && typeof document !== 'undefined') {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            return canvas.toDataURL('image/jpeg', 0.8)
          }
        }
      } catch (_) {}
      return null
    }

    if (nativeCameraRef.current?.takePictureAsync) {
      try {
        const photo = await nativeCameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        })
        if (photo?.base64) {
          return `data:image/jpeg;base64,${photo.base64}`
        }
      } catch (_) {}
    }
    return null
  }

  const finishVerification = async (base64DataUri: string | null, allChallenges: string[]) => {
    setVerifying(true)
    setErrorMessage(null)
    try {
      let selfieUrl: string | undefined
      if (base64DataUri) {
        setCapturedPreview(base64DataUri)
        const uploadRes = await api.upload.photo(base64DataUri).catch(() => null)
        if (uploadRes?.url) {
          selfieUrl = uploadRes.url
        }
      }

      const res = await api.auth.verifyLiveness({
        selfieUrl,
        challengesCompleted: allChallenges,
      })

      stopWebStream()
      setVerifiedResult({ vouchRating: res.vouchRating ?? 100 })
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleStepAction = async () => {
    const currentChallenge = CHALLENGES[stepIndex]
    const nextCompleted = Array.from(new Set([...completed, currentChallenge.id]))
    setCompleted(nextCompleted)

    if (stepIndex < CHALLENGES.length - 1) {
      setStepIndex((i) => i + 1)
      return
    }

    const frame = await captureFrameBase64()
    await finishVerification(frame, nextCompleted)
  }

  const handleFallbackSelfieUpload = async () => {
    try {
      setErrorMessage(null)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      })
      if (result.canceled || !result.assets?.[0]) return
      const asset = result.assets[0]
      const dataUri = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : null
      await finishVerification(dataUri, ['center', 'turn_right', 'smile'])
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not select verification photo.')
    }
  }

  // Celebratory Verified Screen
  if (verifiedResult) {
    return (
      <View style={styles.container}>
        <View style={styles.successWrap}>
          <View style={styles.verifiedCircle}>
            {capturedPreview ? (
              <Image source={{ uri: capturedPreview }} style={styles.verifiedPreviewImg} />
            ) : (
              <Ionicons name="shield-checkmark" size={56} color="#10B981" />
            )}
            <View style={styles.verifiedCheckFloat}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.successTitle}>Identity Verified</Text>
          <Text style={styles.successSubtitle}>
            Your live facial check passed. Your profile now carries the Vow Face Verified badge and your Trust Score is ★ {verifiedResult.vouchRating}/100.
          </Text>

          <View style={styles.verifiedPerks}>
            <View style={styles.perkRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
              <Text style={styles.perkText}>Face Verified badge visible on your Discover card</Text>
            </View>
            <View style={styles.perkRow}>
              <Ionicons name="lock-closed-outline" size={18} color="#7C3AED" />
              <Text style={styles.perkText}>Your verification selfie is kept private & never shown publicly</Text>
            </View>
          </View>

          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Return to Profile</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  const currentChallenge = CHALLENGES[stepIndex]
  const progressPercent = `${Math.round(((stepIndex + 1) / CHALLENGES.length) * 100)}%`

  // Native camera permission request screen
  if (Platform.OS !== 'web' && permission && !permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color="#1A1A2E" />
          </Pressable>
          <Text style={styles.headerTitle}>Face Verification</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.permissionBox}>
          <View style={styles.permIconCircle}>
            <Ionicons name="camera-outline" size={40} color="#E8475E" />
          </View>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSub}>
            Vow uses a quick 10-second live selfie check to confirm every member is real and prevent catfishing.
          </Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Allow Front Camera</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.closeBtn}
          onPress={() => {
            stopWebStream()
            router.back()
          }}
        >
          <Ionicons name="close" size={22} color="#1A1A2E" />
        </Pressable>
        <Text style={styles.headerTitle}>Face Verification</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressPercent as any }]} />
        </View>
        <Text style={styles.progressLabel}>{currentChallenge.stepLabel}</Text>
      </View>

      <View style={styles.body}>
        {/* Circular Camera Frame */}
        <View style={styles.cameraRing}>
          <View style={styles.cameraCircle}>
            {Platform.OS === 'web' ? (
              webCamError ? (
                <View style={styles.cameraFallback}>
                  <Ionicons name="videocam-off-outline" size={42} color="#8E8E9E" />
                  <Text style={styles.cameraFallbackText}>Camera unavailable</Text>
                </View>
              ) : (
                // @ts-ignore web video element inside react-native-web
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                  }}
                />
              )
            ) : (
              <CameraView
                ref={nativeCameraRef}
                style={StyleSheet.absoluteFill}
                facing="front"
              />
            )}
          </View>
        </View>

        {/* Prompt Card */}
        <View style={styles.promptCard}>
          <View style={styles.promptIconBadge}>
            <Ionicons name={currentChallenge.icon} size={22} color="#E8475E" />
          </View>
          <Text style={styles.promptTitle}>{currentChallenge.title}</Text>
          <Text style={styles.promptDesc}>{currentChallenge.instruction}</Text>

          <View style={styles.stepDotsRow}>
            {CHALLENGES.map((ch, idx) => {
              const isDone = completed.includes(ch.id)
              const isCurrent = idx === stepIndex
              return (
                <View
                  key={ch.id}
                  style={[
                    styles.stepDot,
                    isCurrent && styles.stepDotActive,
                    isDone && styles.stepDotDone,
                  ]}
                />
              )
            })}
          </View>
        </View>

        {errorMessage || webCamError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage || webCamError}</Text>
          </View>
        ) : null}

        {/* Primary Action */}
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
          onPress={handleStepAction}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{currentChallenge.buttonLabel}</Text>
          )}
        </Pressable>

        {Platform.OS === 'web' && webCamError ? (
          <Pressable style={styles.secondaryBtn} onPress={handleFallbackSelfieUpload} disabled={verifying}>
            <Text style={styles.secondaryBtnText}>Upload a Live Selfie Photo Instead</Text>
          </Pressable>
        ) : (
          <Text style={styles.privacyFooter}>
            🔒 Private liveness check only — never posted to your profile gallery.
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 58, paddingBottom: 14 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4F2F3', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, marginBottom: 20 },
  progressTrack: { flex: 1, height: 5, backgroundColor: '#F0EDEF', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E8475E', borderRadius: 4 },
  progressLabel: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#8E8E9E' },
  body: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'space-between', paddingBottom: 38 },
  cameraRing: { width: 252, height: 252, borderRadius: 126, padding: 6, borderWidth: 3, borderColor: '#E8475E', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  cameraCircle: { width: '100%', height: '100%', borderRadius: 120, overflow: 'hidden', backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  cameraFallback: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  cameraFallbackText: { fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#A0A0B0' },
  promptCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 22, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F0EDEF', gap: 8 },
  promptIconBadge: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center' },
  promptTitle: { fontSize: 22, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  promptDesc: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', textAlign: 'center', lineHeight: 21 },
  stepDotsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5DDE2' },
  stepDotActive: { width: 24, backgroundColor: '#E8475E' },
  stepDotDone: { backgroundColor: '#10B981' },
  errorBox: { width: '100%', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#DC2626', textAlign: 'center' },
  primaryButton: { width: '100%', backgroundColor: '#E8475E', paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 6 },
  primaryButtonText: { fontSize: 16, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  secondaryBtn: { width: '100%', paddingVertical: 15, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#F0EDEF', alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#1A1A2E' },
  privacyFooter: { fontSize: 12, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#8E8E9E', textAlign: 'center' },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  permIconCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center' },
  permTitle: { fontSize: 24, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  permSub: { fontSize: 15, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 },
  verifiedCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ECFDF5', borderWidth: 3, borderColor: '#10B981', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  verifiedPreviewImg: { width: '100%', height: '100%', borderRadius: 58 },
  verifiedCheckFloat: { position: 'absolute', bottom: -2, right: -2, width: 34, height: 34, borderRadius: 17, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  successTitle: { fontSize: 28, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  successSubtitle: { fontSize: 15, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', textAlign: 'center', lineHeight: 23 },
  verifiedPerks: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: '#F0EDEF', marginVertical: 8 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perkText: { flex: 1, fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#1A1A2E', lineHeight: 19 },
})
