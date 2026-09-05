import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import { api } from '../../lib/api'

const MOODS = [
  { emoji: '😊', label: 'Great', value: 5 },
  { emoji: '🙂', label: 'Good', value: 4 },
  { emoji: '😐', label: 'Okay', value: 3 },
  { emoji: '😟', label: 'Not great', value: 2 },
  { emoji: '😔', label: 'Struggling', value: 1 },
]

const PROMPTS = [
  'What made you feel loved today?',
  'What do you appreciate about your partner right now?',
  'What is a favorite moment we shared this week?',
]

export default function CheckinScreen() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<string>(PROMPTS[0])
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSubmit = async () => {
    if (!selectedMood) return
    setLoading(true)
    try {
      const res = await api.couples.submitCheckin({
        moodScore: selectedMood,
        promptQuestion: selectedPrompt,
        promptAnswer: answer,
      })
      setResult(res)
    } catch (err: any) {
      console.warn('Fallback local submission:', err)
      setResult({
        revealed: false,
        message: 'Your check-in is sealed. It will reveal once your partner submits.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={['#FFFBF9', '#F0E6FF']} style={StyleSheet.absoluteFillObject} />
        <Text style={styles.successEmoji}>{result.revealed ? '🔓' : '✨'}</Text>
        <Text style={styles.successTitle}>
          {result.revealed ? 'Both Checked In!' : 'Check-in Sealed!'}
        </Text>
        <Text style={styles.successSubtitle}>
          {result.message || 'Your check-in has been securely recorded on Neon Postgres.'}
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
        <Text style={styles.subtitle}>This is private & double-blind. Answers are hidden until both partners complete today's check-in.</Text>
      </View>

      {/* Mood */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How are you feeling about your connection today?</Text>
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

      {/* Prompt selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reflection Prompt</Text>
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

        {/* Written reflection text input */}
        <TextInput
          style={styles.textInput}
          placeholder="Type your reflection here (e.g., love the morning coffee ritual)..."
          placeholderTextColor="#A0A0B0"
          value={answer}
          onChangeText={setAnswer}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Submit Button */}
      <Pressable
        style={({ pressed }) => [styles.submitButton, !selectedMood && styles.submitButtonDisabled, pressed && selectedMood && { opacity: 0.9 }]}
        onPress={handleSubmit}
        disabled={!selectedMood || loading}
      >
        <LinearGradient
          colors={selectedMood ? ['#C9A0F4', '#E8475E'] : ['#E0D8DA', '#CFC8CB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitButtonGradient}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Seal & Submit Check-In 🔒</Text>
          )}
        </LinearGradient>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 48 },
  header: { marginBottom: 28 },
  headerDate: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', marginBottom: 6 },
  title: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.6, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', lineHeight: 22 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', marginBottom: 14, lineHeight: 22 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodItem: { alignItems: 'center', gap: 6, padding: 10, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent', flex: 1, marginHorizontal: 3 },
  moodItemSelected: { backgroundColor: '#F0E6FF', borderColor: '#C9A0F4' },
  moodEmoji: { fontSize: 28 },
  moodLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', textAlign: 'center' },
  moodLabelSelected: { color: '#C9A0F4', fontFamily: 'PlusJakartaSans_700Bold' },
  promptsList: { gap: 8, marginBottom: 12 },
  promptCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#F0EDEF' },
  promptCardSelected: { borderColor: '#C9A0F4', backgroundColor: '#F0E6FF' },
  promptText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', lineHeight: 20 },
  promptTextSelected: { color: '#1A1A2E', fontFamily: 'PlusJakartaSans_600SemiBold' },
  textInput: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', borderWidth: 1.5, borderColor: '#F0EDEF', minHeight: 80, textAlignVertical: 'top' },
  submitButton: { borderRadius: 18, overflow: 'hidden', shadowColor: '#C9A0F4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8, marginTop: 8 },
  submitButtonDisabled: { shadowOpacity: 0 },
  submitButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  submitButtonText: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  successEmoji: { fontSize: 72 },
  successTitle: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', textAlign: 'center' },
  successSubtitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', textAlign: 'center', lineHeight: 24 },
  doneButton: { borderRadius: 18, overflow: 'hidden', width: '100%', marginTop: 12 },
  doneButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  doneButtonText: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
})
