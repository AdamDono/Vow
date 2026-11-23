import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'
import { updateOnboardingData, getOnboardingData } from '../../../lib/onboardingStore'

const ALL_INTERESTS = [
  { emoji: '🏃', label: 'Running' }, { emoji: '🧘', label: 'Yoga' },
  { emoji: '🍳', label: 'Cooking' }, { emoji: '✈️', label: 'Travel' },
  { emoji: '📚', label: 'Reading' }, { emoji: '🎬', label: 'Movies' },
  { emoji: '🎵', label: 'Music' }, { emoji: '🎮', label: 'Gaming' },
  { emoji: '🎨', label: 'Art' }, { emoji: '🐾', label: 'Pets' },
  { emoji: '🌿', label: 'Nature' }, { emoji: '🍷', label: 'Wine' },
  { emoji: '☕', label: 'Coffee' }, { emoji: '🏋️', label: 'Fitness' },
  { emoji: '📸', label: 'Photography' }, { emoji: '🏄', label: 'Surfing' },
  { emoji: '🎭', label: 'Theatre' }, { emoji: '🧗', label: 'Climbing' },
  { emoji: '🚴', label: 'Cycling' }, { emoji: '🌙', label: 'Astrology' },
]

const MAX_INTERESTS = 5

export default function InterestsScreen() {
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    const existing = getOnboardingData()
    if (existing.interests && existing.interests.length > 0) {
      setSelected(existing.interests)
    }
  }, [])

  const toggle = (label: string) => {
    setSelected((prev) =>
      prev.includes(label)
        ? prev.filter((i) => i !== label)
        : prev.length < MAX_INTERESTS
        ? [...prev, label]
        : prev
    )
  }

  const handleContinue = () => {
    updateOnboardingData({ interests: selected })
    if (selected.length > 0) {
      api.auth.updateProfile({ interests: selected }).catch(() => {})
    }
    router.push('/(auth)/onboarding/location')
  }

  const handleSkip = () => {
    router.push('/(auth)/onboarding/location')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: '83%' }]} />
        </View>
        <Text style={styles.progressText}>5 of 6</Text>
      </View>

      <Text style={styles.title}>Your interests</Text>
      <Text style={styles.subtitle}>Pick up to {MAX_INTERESTS} things you love. They'll appear as tags on your profile.</Text>

      <View style={styles.interestsGrid}>
        {ALL_INTERESTS.map(({ emoji, label }) => {
          const isSelected = selected.includes(label)
          const isDisabled = !isSelected && selected.length >= MAX_INTERESTS
          return (
            <Pressable
              key={label}
              style={[styles.interestPill, isSelected && styles.interestPillSelected, isDisabled && styles.interestPillDisabled]}
              onPress={() => toggle(label)}
            >
              <Text style={styles.interestEmoji}>{emoji}</Text>
              <Text style={[styles.interestLabel, isSelected && styles.interestLabelSelected]}>{label}</Text>
            </Pressable>
          )
        })}
      </View>

      <Text style={styles.selectionCount}>{selected.length}/{MAX_INTERESTS} selected</Text>

      <View style={styles.buttonRow}>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
          onPress={handleContinue}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
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
  title: { fontSize: 32, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.4, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', marginBottom: 28, lineHeight: 24 },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  interestPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 30, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#F0EDEF' },
  interestPillSelected: { backgroundColor: '#FDDDE3', borderColor: '#E8475E' },
  interestPillDisabled: { opacity: 0.4 },
  interestEmoji: { fontSize: 16 },
  interestLabel: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#6B6B7B' },
  interestLabelSelected: { color: '#E8475E', fontFamily: 'DMSans_700Bold', fontWeight: '700' },
  selectionCount: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#A0A0B0', textAlign: 'center', marginBottom: 28 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  skipButton: { flex: 1, paddingVertical: 18, alignItems: 'center', borderRadius: 18, borderWidth: 1.5, borderColor: '#F0EDEF', backgroundColor: '#FFFFFF' },
  skipButtonText: { fontSize: 17, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B' },
  primaryButton: { flex: 1, backgroundColor: '#E8475E', paddingVertical: 18, alignItems: 'center', borderRadius: 18, shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  primaryButtonText: { fontSize: 17, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
})
