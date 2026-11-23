import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'
import { updateOnboardingData, getOnboardingData } from '../../../lib/onboardingStore'

const MAX_CHARS = 300

export default function BioScreen() {
  const [bio, setBio] = useState('')

  useEffect(() => {
    const existing = getOnboardingData()
    if (existing.bio) setBio(existing.bio)
  }, [])

  const handleContinue = () => {
    updateOnboardingData({ bio: bio.trim() })
    if (bio.trim()) {
      api.auth.updateProfile({ bio: bio.trim() }).catch(() => {})
    }
    router.push('/(auth)/onboarding/goals')
  }

  const handleSkip = () => {
    router.push('/(auth)/onboarding/goals')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
        <Text style={styles.progressText}>3 of 6</Text>
      </View>

      <Text style={styles.title}>About you</Text>
      <Text style={styles.subtitle}>What makes you, you? Write something that shows your real personality.</Text>

      <View style={styles.textAreaContainer}>
        <TextInput
          style={styles.textArea}
          placeholder="I'm someone who loves... My idea of a perfect evening is... A fun fact about me is..."
          placeholderTextColor="#A0A0B0"
          value={bio}
          onChangeText={(t) => setBio(t.slice(0, MAX_CHARS))}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{bio.length}/{MAX_CHARS}</Text>
      </View>

      <View style={styles.promptsContainer}>
        <Text style={styles.promptsTitle}>Need a spark?</Text>
        {[
          "My love language is...",
          "The way to my heart is...",
          "I'm looking for someone who...",
        ].map((prompt) => (
          <Pressable
            key={prompt}
            style={styles.promptPill}
            onPress={() => setBio((prev) => prev ? `${prev}\n${prompt} ` : `${prompt} `)}
          >
            <Text style={styles.promptPillText}>{prompt}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
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
  textAreaContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#F0EDEF', padding: 16, marginBottom: 24 },
  textArea: { fontSize: 16, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#1A1A2E', lineHeight: 26, minHeight: 130 },
  charCount: { fontSize: 12, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#A0A0B0', textAlign: 'right', marginTop: 8 },
  promptsContainer: { marginBottom: 40 },
  promptsTitle: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B', marginBottom: 12 },
  promptPill: { backgroundColor: '#FFF0ED', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: '#FDDDE3' },
  promptPillText: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#E8475E' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  skipButton: { flex: 1, paddingVertical: 18, alignItems: 'center', borderRadius: 18, borderWidth: 1.5, borderColor: '#F0EDEF', backgroundColor: '#FFFFFF' },
  skipButtonText: { fontSize: 17, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B' },
  primaryButton: { flex: 1, backgroundColor: '#E8475E', paddingVertical: 18, alignItems: 'center', borderRadius: 18, shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  primaryButtonText: { fontSize: 17, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
})
