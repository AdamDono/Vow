import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'
import { updateOnboardingData, getOnboardingData } from '../../../lib/onboardingStore'

const GENDERS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say']

export default function BasicsScreen() {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')

  useEffect(() => {
    // Pre-populate with existing state or Google profile if available
    const existing = getOnboardingData()
    if (existing.firstName) setName(existing.firstName)
    if (existing.age) setAge(String(existing.age))
    if (existing.gender) setGender(existing.gender)

    if (!existing.firstName) {
      api.auth.me().then((res) => {
        if (res?.user?.profile?.firstName) {
          setName(res.user.profile.firstName)
        }
      }).catch(() => {})
    }
  }, [])

  const canContinue = name.trim().length > 0 && Number(age) >= 18 && Boolean(gender)

  const handleContinue = () => {
    if (!canContinue) return
    const numericAge = Number(age)
    updateOnboardingData({
      firstName: name.trim(),
      age: numericAge,
      gender,
    })
    // Background sync to backend
    api.auth.updateProfile({
      firstName: name.trim(),
      age: numericAge,
      gender,
    }).catch(() => {})

    router.push('/(auth)/onboarding/photos')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: '16%' }]} />
        </View>
        <Text style={styles.progressText}>1 of 6</Text>
      </View>

      <Text style={styles.title}>Tell us about{'\n'}yourself</Text>
      <Text style={styles.subtitle}>This is how you'll appear to potential matches</Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your first name"
            placeholderTextColor="#A0A0B0"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="Your age (e.g. 28)"
            placeholderTextColor="#A0A0B0"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={2}
          />
          {Number(age) > 0 && Number(age) < 18 && (
            <Text style={styles.ageError}>You must be 18 or older to use Vow</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>I identify as</Text>
          <View style={styles.genderGrid}>
            {GENDERS.map((g) => (
              <Pressable
                key={g}
                style={[styles.genderPill, gender === g && styles.genderPillSelected]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderPillText, gender === g && styles.genderPillTextSelected]}>{g}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, !canContinue && styles.primaryButtonDisabled, pressed && canContinue && { opacity: 0.9 }]}
        onPress={handleContinue}
        disabled={!canContinue}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </Pressable>
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
  subtitle: { fontSize: 16, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', marginBottom: 36 },
  form: { gap: 4, marginBottom: 40 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#1A1A2E', marginBottom: 10 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#1A1A2E', borderWidth: 1.5, borderColor: '#F0EDEF' },
  ageError: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#E8475E', marginTop: 6 },
  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genderPill: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, borderWidth: 1.5, borderColor: '#F0EDEF', backgroundColor: '#FFFFFF' },
  genderPillSelected: { borderColor: '#E8475E', backgroundColor: '#FDDDE3' },
  genderPillText: { fontSize: 15, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#6B6B7B' },
  genderPillTextSelected: { color: '#E8475E', fontFamily: 'DMSans_700Bold', fontWeight: '700' },
  primaryButton: { backgroundColor: '#E8475E', paddingVertical: 18, alignItems: 'center', borderRadius: 18, shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  primaryButtonDisabled: { backgroundColor: '#E0D8DA', shadowOpacity: 0, elevation: 0 },
  primaryButtonText: { fontSize: 17, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
})
