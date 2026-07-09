import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'

const MOODS = [
  { emoji: '😊', label: 'Great', value: 5 },
  { emoji: '🙂', label: 'Good', value: 4 },
  { emoji: '😐', label: 'Okay', value: 3 },
  { emoji: '😟', label: 'Not great', value: 2 },
  { emoji: '😔', label: 'Struggling', value: 1 },
]

const PROMPTS = [
  "What made you feel loved today?",
  "Is there anything on your mind?",
  "What do you appreciate about your partner right now?",
]

export default function CheckinScreen() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    // TODO: submit to Supabase — double blind, hidden from partner until both submit
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={['#FFFBF9', '#F0E6FF']} style={StyleSheet.absoluteFillObject} />
        <Text style={styles.successEmoji}>✨</Text>
        <Text style={styles.successTitle}>Check-in submitted!</Text>
        <Text style={styles.successSubtitle}>
          Your check-in is sealed for today. Results will reveal when Sarah checks in too. 🔒
        </Text>
        <Pressable style={styles.doneButton} onPress={() => router.back()}>
          <LinearGradient colors={['#C9A0F4', '#E8475E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.doneButtonGradient}>
            <Text style={styles.doneButtonText}>Back to Dashboard</Text>
          </LinearGradient>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerDate}>Today, {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        <Text style={styles.title}>Daily Check-In</Text>
        <Text style={styles.subtitle}>This is private. Sarah won't see your answers until she checks in too.</Text>
      </View>

      {/* Mood */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How are you feeling about your relationship today?</Text>
        <View style={styles.moodRow}>
          {MOODS.map((mood) => (
            <Pressable
              key={mood.value}
              style={[styles.moodItem, selectedMood === mood.value && styles.moodItemSelected]}
              onPress={() => setSelectedMood(mood.value)}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={[styles.moodLabel, selectedMood === mood.value && styles.moodLabelSelected]}>{mood.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Prompt */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pick a reflection prompt</Text>
        <View style={styles.promptsList}>
          {PROMPTS.map((prompt) => (
            <Pressable
              key={prompt}
              style={[styles.promptCard, selectedPrompt === prompt && styles.promptCardSelected]}
              onPress={() => setSelectedPrompt(prompt)}
            >
              <Text style={[styles.promptText, selectedPrompt === prompt && styles.promptTextSelected]}>
                {prompt}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Submit */}
      <Pressable
        style={({ pressed }) => [styles.submitButton, !selectedMood && styles.submitButtonDisabled, pressed && selectedMood && { opacity: 0.9 }]}
        onPress={handleSubmit}
        disabled={!selectedMood}
      >
        <LinearGradient
          colors={selectedMood ? ['#C9A0F4', '#E8475E'] : ['#E0D8DA', '#CFC8CB']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.submitButtonGradient}
        >
          <Text style={styles.submitButtonText}>Submit Check-In 🔒</Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 48 },
  header: { marginBottom: 32 },
  headerDate: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', marginBottom: 6 },
  title: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.6, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', lineHeight: 24 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', marginBottom: 16, lineHeight: 24 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodItem: { alignItems: 'center', gap: 6, padding: 10, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent', flex: 1, marginHorizontal: 3 },
  moodItemSelected: { backgroundColor: '#F0E6FF', borderColor: '#C9A0F4' },
  moodEmoji: { fontSize: 28 },
  moodLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', textAlign: 'center' },
  moodLabelSelected: { color: '#C9A0F4', fontFamily: 'PlusJakartaSans_700Bold' },
  promptsList: { gap: 10 },
  promptCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#F0EDEF' },
  promptCardSelected: { borderColor: '#C9A0F4', backgroundColor: '#F0E6FF' },
  promptText: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', lineHeight: 22 },
  promptTextSelected: { color: '#1A1A2E', fontFamily: 'PlusJakartaSans_600SemiBold' },
  submitButton: { borderRadius: 18, overflow: 'hidden', shadowColor: '#C9A0F4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  submitButtonDisabled: { shadowOpacity: 0 },
  submitButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  submitButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  successEmoji: { fontSize: 72 },
  successTitle: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', textAlign: 'center' },
  successSubtitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', textAlign: 'center', lineHeight: 26 },
  doneButton: { borderRadius: 18, overflow: 'hidden', width: '100%', marginTop: 12 },
  doneButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  doneButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
})
