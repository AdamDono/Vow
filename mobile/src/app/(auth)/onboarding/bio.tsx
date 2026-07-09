import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'

const MAX_CHARS = 300

export default function BioScreen() {
  const [bio, setBio] = useState('')

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <LinearGradient colors={['#E8475E', '#F4A0B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '50%' }]} />
        </View>
        <Text style={styles.progressText}>3 of 6</Text>
      </View>

      <Text style={styles.title}>About you</Text>
      <Text style={styles.subtitle}>What makes you, you? Write something that shows your personality.</Text>

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
            onPress={() => setBio((prev) => prev ? `${prev}\n${prompt}` : prompt)}
          >
            <Text style={styles.promptPillText}>{prompt}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.skipButton} onPress={() => router.push('/(auth)/onboarding/goals')}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
          onPress={() => router.push('/(auth)/onboarding/goals')}
        >
          <LinearGradient colors={['#E8475E', '#C73350']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButtonGradient}>
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
  textAreaContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#F0EDEF', padding: 16, marginBottom: 24 },
  textArea: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', lineHeight: 26, minHeight: 130 },
  charCount: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', textAlign: 'right', marginTop: 8 },
  promptsContainer: { marginBottom: 40 },
  promptsTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#6B6B7B', marginBottom: 12 },
  promptPill: { backgroundColor: '#FFF0ED', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: '#FDDDE3' },
  promptPillText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#E8475E' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  skipButton: { flex: 1, paddingVertical: 18, alignItems: 'center', borderRadius: 18, borderWidth: 1.5, borderColor: '#F0EDEF', backgroundColor: '#FFFFFF' },
  skipButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#6B6B7B' },
  primaryButton: { flex: 1, borderRadius: 18, overflow: 'hidden', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  primaryButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  primaryButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
})
