import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'

const GENDERS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say']

export default function BasicsScreen() {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')

  const canContinue = name.trim().length > 0 && Number(age) >= 18 && gender

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <LinearGradient colors={['#E8475E', '#F4A0B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: '16%' }]} />
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
            placeholder="Your age"
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
        onPress={() => canContinue && router.push('/(auth)/onboarding/photos')}
        disabled={!canContinue}
      >
        <LinearGradient
          colors={canContinue ? ['#E8475E', '#C73350'] : ['#E0D8DA', '#CFC8CB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
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
  subtitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', marginBottom: 36 },
  form: { gap: 4, marginBottom: 40 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E', marginBottom: 10 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', borderWidth: 1.5, borderColor: '#F0EDEF' },
  ageError: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#E8475E', marginTop: 6 },
  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genderPill: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, borderWidth: 1.5, borderColor: '#F0EDEF', backgroundColor: '#FFFFFF' },
  genderPillSelected: { borderColor: '#E8475E', backgroundColor: '#FDDDE3' },
  genderPillText: { fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
  genderPillTextSelected: { color: '#E8475E', fontFamily: 'PlusJakartaSans_700Bold' },
  primaryButton: { borderRadius: 18, overflow: 'hidden', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  primaryButtonDisabled: { shadowOpacity: 0 },
  primaryButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  primaryButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
})
