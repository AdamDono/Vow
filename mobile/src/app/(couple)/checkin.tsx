import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useState, useCallback } from 'react'
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
  const [initialLoading, setInitialLoading] = useState(true)
  const [partnerName, setPartnerName] = useState('your partner')
  const [result, setResult] = useState<any>(null)

  const loadTodayState = useCallback(async () => {
    try {
      const dash = await api.couples.getDashboard()
      if (dash?.partner?.name) setPartnerName(dash.partner.name)
      const today = dash?.todayCheckin
      if (today?.userSubmitted && today?.userEntry) {
        setSelectedMood(today.userEntry.moodScore)
        setSelectedPrompt(today.userEntry.promptQuestion || PROMPTS[0])
        setAnswer(today.userEntry.promptAnswer || '')
        if (!today.isSealed && today.partnerEntry) {
          setResult({
            revealed: true,
            checkin: today.userEntry,
            partnerEntry: today.partnerEntry,
            message: `Both you and ${dash?.partner?.name || 'your partner'} checked in today!`,
          })
        }
      }
    } catch {
      // ignore initial check error
    } finally {
      setInitialLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadTodayState()
    }, [loadTodayState])
  )

  const handleSubmit = async () => {
    if (!selectedMood) return
    setLoading(true)
    try {
      const res = await api.couples.submitCheckin({
        moodScore: selectedMood,
        promptQuestion: selectedPrompt,
        promptAnswer: answer.trim(),
      })
      setResult(res)
    } catch (err: any) {
      Alert.alert('Check-In Failed', err.message || 'Could not save your daily check-in.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#C9A0F4" />
      </View>
    )
  }

  if (result) {
    const partnerMood = MOODS.find((m) => m.value === result.partnerEntry?.moodScore)
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={['#FFFBF9', '#F0E6FF']} style={StyleSheet.absoluteFill} />
        <Text style={styles.successEmoji}>{result.revealed ? '🔓' : '🔒'}</Text>
        <Text style={styles.successTitle}>
          {result.revealed ? 'Reflections Unlocked!' : 'Check-In Sealed!'}
        </Text>
        <Text style={styles.successSubtitle}>
          {result.message || 'Your daily reflection has been saved.'}
        </Text>

        {result.revealed && result.partnerEntry ? (
          <View style={styles.revealBox}>
            <Text style={styles.revealLabel}>
              {partnerMood?.emoji || '💛'} {partnerName} is feeling {partnerMood?.label?.toLowerCase() || 'connected'}
            </Text>
            <Text style={styles.revealQuote}>
              "{result.partnerEntry.promptAnswer || 'Checked in with love today'}"
            </Text>
          </View>
        ) : null}

        <Pressable
          style={styles.doneButton}
          onPress={() => {
            setResult(null)
            router.push('/(couple)/dashboard')
          }}
        >
          <Text style={styles.doneButtonText}>Back to Dashboard</Text>
        </Pressable>

        {!result.revealed && (
          <Pressable style={styles.editAgainBtn} onPress={() => setResult(null)}>
            <Text style={styles.editAgainText}>Edit Today's Reflection</Text>
          </Pressable>
        )}
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerDate}>
          Today, {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text style={styles.title}>Daily Check-In</Text>
        <Text style={styles.subtitle}>
          Private & double-blind. Neither you nor {partnerName} can see today's answers until both submit.
        </Text>
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
              <Text style={[styles.moodLabel, selectedMood === mood.value && styles.moodLabelSelected]}>
                {mood.label}
              </Text>
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

        <TextInput
          style={styles.textInput}
          placeholder="Write something honest & thoughtful for your partner..."
          placeholderTextColor="#A0A0B0"
          value={answer}
          onChangeText={setAnswer}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Submit Button */}
      <Pressable
        style={({ pressed }) => [
          styles.submitButton,
          !selectedMood && styles.submitButtonDisabled,
          Boolean(pressed && selectedMood) && { opacity: 0.9 },
        ]}
        onPress={handleSubmit}
        disabled={!selectedMood || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Seal & Submit Check-In 🔒</Text>
        )}
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, backgroundColor: '#FFFBF9', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 110 },
  header: { marginBottom: 28 },
  headerDate: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#A0A0B0', marginBottom: 6 },
  title: { fontSize: 28, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.3, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', lineHeight: 22 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', marginBottom: 14, lineHeight: 22 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodItem: { alignItems: 'center', gap: 6, padding: 10, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent', flex: 1, marginHorizontal: 3 },
  moodItemSelected: { backgroundColor: '#F0E6FF', borderColor: '#C9A0F4' },
  moodEmoji: { fontSize: 28 },
  moodLabel: { fontSize: 11, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#A0A0B0', textAlign: 'center' },
  moodLabelSelected: { color: '#7C3AED', fontFamily: 'DMSans_700Bold', fontWeight: '700' },
  promptsList: { gap: 8, marginBottom: 12 },
  promptCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#F0EDEF' },
  promptCardSelected: { borderColor: '#C9A0F4', backgroundColor: '#F0E6FF' },
  promptText: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', lineHeight: 20 },
  promptTextSelected: { color: '#1A1A2E', fontFamily: 'DMSans_600SemiBold', fontWeight: '600' },
  textInput: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#1A1A2E', borderWidth: 1.5, borderColor: '#F0EDEF', minHeight: 90, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#E8475E', paddingVertical: 18, alignItems: 'center', borderRadius: 18, shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6, marginTop: 8 },
  submitButtonDisabled: { backgroundColor: '#E0D8DA', shadowOpacity: 0, elevation: 0 },
  submitButtonText: { fontSize: 16, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, gap: 14 },
  successEmoji: { fontSize: 68 },
  successTitle: { fontSize: 28, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  successSubtitle: { fontSize: 15, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', textAlign: 'center', lineHeight: 24 },
  revealBox: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#DEC9FC', gap: 6, marginTop: 6 },
  revealLabel: { fontSize: 13, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#7C3AED' },
  revealQuote: { fontSize: 15, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#1A1A2E', fontStyle: 'italic', lineHeight: 22 },
  doneButton: { backgroundColor: '#E8475E', paddingVertical: 18, alignItems: 'center', borderRadius: 18, width: '100%', marginTop: 12, shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  doneButtonText: { fontSize: 16, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  editAgainBtn: { paddingVertical: 10 },
  editAgainText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#7C3AED' },
})
