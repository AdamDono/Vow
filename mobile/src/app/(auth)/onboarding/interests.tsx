import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'

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

  const toggle = (label: string) => {
    setSelected((prev) =>
      prev.includes(label)
        ? prev.filter((i) => i !== label)
        : prev.length < MAX_INTERESTS
        ? [...prev, label]
        : prev
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <LinearGradient colors={['#E8475E', '#F4A0B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '83%' }]} />
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
        <Pressable style={styles.skipButton} onPress={() => router.push('/(auth)/onboarding/location')}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, !selected.length && styles.primaryButtonDisabled, pressed && selected.length && { opacity: 0.9 }]}
          onPress={() => router.push('/(auth)/onboarding/location')}
        >
          <LinearGradient
            colors={selected.length ? ['#E8475E', '#C73350'] : ['#E0D8DA', '#CFC8CB']}
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
  title: { fontSize: 32, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.8, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', marginBottom: 28, lineHeight: 24 },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  interestPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 30, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#F0EDEF' },
  interestPillSelected: { backgroundColor: '#FDDDE3', borderColor: '#E8475E' },
  interestPillDisabled: { opacity: 0.4 },
  interestEmoji: { fontSize: 16 },
  interestLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
  interestLabelSelected: { color: '#E8475E', fontFamily: 'PlusJakartaSans_700Bold' },
  selectionCount: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#A0A0B0', textAlign: 'center', marginBottom: 28 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  skipButton: { flex: 1, paddingVertical: 18, alignItems: 'center', borderRadius: 18, borderWidth: 1.5, borderColor: '#F0EDEF', backgroundColor: '#FFFFFF' },
  skipButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#6B6B7B' },
  primaryButton: { flex: 1, borderRadius: 18, overflow: 'hidden', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  primaryButtonDisabled: { shadowOpacity: 0 },
  primaryButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  primaryButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
})
