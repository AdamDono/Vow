import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'
import { updateOnboardingData, getOnboardingData } from '../../../lib/onboardingStore'

const GOALS = [
  { id: 'long_term', label: 'Long-term relationship', emoji: '💍' },
  { id: 'marriage', label: 'Marriage someday', emoji: '💒' },
  { id: 'dating', label: 'Dating & seeing where it goes', emoji: '🌱' },
  { id: 'casual', label: 'Something casual', emoji: '✌️' },
  { id: 'unsure', label: 'Not sure yet', emoji: '🤷' },
]

export default function GoalsScreen() {
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const existing = getOnboardingData()
    if (existing.lookingFor) {
      const match = GOALS.find((g) => g.label === existing.lookingFor || g.id === existing.lookingFor)
      if (match) setSelected(match.id)
    }
  }, [])

  const handleContinue = () => {
    if (!selected) return
    const goalItem = GOALS.find((g) => g.id === selected)
    const lookingFor = goalItem?.label || selected
    updateOnboardingData({ lookingFor })
    api.auth.updateProfile({ lookingFor }).catch(() => {})
    router.push('/(auth)/onboarding/interests')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <LinearGradient colors={['#E8475E', '#F4A0B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '66%' }]} />
        </View>
        <Text style={styles.progressText}>4 of 6</Text>
      </View>

      <Text style={styles.title}>What are you{'\n'}looking for?</Text>
      <Text style={styles.subtitle}>This will be shown on your profile so others know your intentions.</Text>

      <View style={styles.goalsList}>
        {GOALS.map((goal) => (
          <Pressable
            key={goal.id}
            style={[styles.goalCard, selected === goal.id && styles.goalCardSelected]}
            onPress={() => setSelected(goal.id)}
          >
            <Text style={styles.goalEmoji}>{goal.emoji}</Text>
            <Text style={[styles.goalLabel, selected === goal.id && styles.goalLabelSelected]}>
              {goal.label}
            </Text>
            <View style={[styles.goalRadio, selected === goal.id && styles.goalRadioSelected]}>
              {selected === goal.id && <View style={styles.goalRadioDot} />}
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, !selected && styles.primaryButtonDisabled, pressed && selected && { opacity: 0.9 }]}
        onPress={handleContinue}
        disabled={!selected}
      >
        <LinearGradient
          colors={selected ? ['#E8475E', '#C73350'] : ['#E0D8DA', '#CFC8CB']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.primaryButtonGradient}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </LinearGradient>
      </Pressable>
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
  goalsList: { gap: 12, marginBottom: 40 },
  goalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1.5, borderColor: '#F0EDEF', gap: 14 },
  goalCardSelected: { borderColor: '#E8475E', backgroundColor: '#FFF8F9' },
  goalEmoji: { fontSize: 24 },
  goalLabel: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans_500Medium', color: '#1A1A2E' },
  goalLabelSelected: { fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  goalRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D0CDD0', alignItems: 'center', justifyContent: 'center' },
  goalRadioSelected: { borderColor: '#E8475E' },
  goalRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E8475E' },
  primaryButton: { borderRadius: 18, overflow: 'hidden', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  primaryButtonDisabled: { shadowOpacity: 0 },
  primaryButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  primaryButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
})
