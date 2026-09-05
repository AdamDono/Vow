import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import * as Location from 'expo-location'
import { api } from '../../../lib/api'

const GENDERS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say']

const GOALS = [
  { id: 'long_term', label: 'Long-term relationship', emoji: '💍' },
  { id: 'marriage', label: 'Marriage someday', emoji: '💒' },
  { id: 'dating', label: 'Dating & seeing where it goes', emoji: '🌱' },
  { id: 'casual', label: 'Something casual', emoji: '✌️' },
  { id: 'unsure', label: 'Not sure yet', emoji: '🤷' },
]

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
const MAX_BIO_CHARS = 300

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Profile Form States
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [city, setCity] = useState('')
  const [lookingFor, setLookingFor] = useState('Long-term relationship')
  const [bio, setBio] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.auth.me()
        if (res?.user) {
          setEmail(res.user.email || '')
          const p = res.user.profile || {}
          if (p.firstName) setFirstName(p.firstName)
          if (p.lastName) setLastName(p.lastName)
          if (p.age) setAge(String(p.age))
          if (p.gender) setGender(p.gender)
          if (p.city) setCity(p.city)
          if (p.lookingFor) setLookingFor(p.lookingFor)
          if (p.bio) setBio(p.bio)

          if (Array.isArray(res.user.interests) && res.user.interests.length > 0) {
            setSelectedInterests(
              res.user.interests.map((i: any) => typeof i === 'string' ? i : i.interest)
            )
          }
        }
      } catch (err: any) {
        console.warn('Failed to load profile for editing:', err)
        setErrorMessage('Could not load profile details.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const detectLocation = async () => {
    setDetectingLocation(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({})
        const [geo] = await Location.reverseGeocodeAsync(location.coords)
        if (geo?.city) {
          setCity(geo.city)
        } else if (geo?.region) {
          setCity(geo.region)
        }
      }
    } catch {
      // User can type manually
    }
    setDetectingLocation(false)
  }

  const toggleInterest = (label: string) => {
    setSelectedInterests((prev) =>
      prev.includes(label)
        ? prev.filter((i) => i !== label)
        : prev.length < MAX_INTERESTS
        ? [...prev, label]
        : prev
    )
  }

  const handleSave = async () => {
    if (!firstName.trim()) {
      setErrorMessage('First name is required.')
      return
    }
    if (!age || Number(age) < 18) {
      setErrorMessage('Please enter a valid age (18+).')
      return
    }

    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: Number(age),
        gender,
        city: city.trim() || 'Johannesburg',
        lookingFor,
        bio: bio.trim(),
        interests: selectedInterests,
      }

      const res = await api.auth.updateProfile(payload)
      if (res.success || res.user) {
        setSuccessMessage('Profile saved successfully! 🎉')
        setTimeout(() => {
          router.back()
        }, 800)
      } else {
        setErrorMessage('Failed to save profile. Please try again.')
      }
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setErrorMessage(err.message || 'Could not update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8475E" />
        <Text style={styles.loadingText}>Loading profile editor...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#1A1A2E" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>Update your bio, intent & preferences</Text>
          </View>
        </View>

        {/* Status Banners */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {/* Section 1: Basic Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeader}>👤 Basic Information</Text>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={(t) => { setFirstName(t); setErrorMessage(null) }}
                placeholder="First name"
                placeholderTextColor="#A0A0B0"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={(t) => { setLastName(t); setErrorMessage(null) }}
                placeholder="Last name"
                placeholderTextColor="#A0A0B0"
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { width: 100 }]}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={(t) => { setAge(t); setErrorMessage(null) }}
                placeholder="Age"
                placeholderTextColor="#A0A0B0"
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Account Email</Text>
              <View style={styles.disabledInput}>
                <Ionicons name="lock-closed" size={14} color="#A0A0B0" />
                <Text style={styles.disabledText}>{email || 'Google Account'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>I Identify As</Text>
            <View style={styles.pillGrid}>
              {GENDERS.map((g) => (
                <Pressable
                  key={g}
                  style={[styles.choicePill, gender === g && styles.choicePillSelected]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.choicePillText, gender === g && styles.choicePillTextSelected]}>{g}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Section 2: Location & Dating Intent */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeader}>📍 Location & Dating Goal</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City / Location</Text>
            <View style={styles.locationInputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={city}
                onChangeText={(t) => { setCity(t); setErrorMessage(null) }}
                placeholder="e.g. Johannesburg, Cape Town"
                placeholderTextColor="#A0A0B0"
              />
              <Pressable
                style={styles.locationDetectBtn}
                onPress={detectLocation}
                disabled={detectingLocation}
              >
                {detectingLocation ? (
                  <ActivityIndicator size="small" color="#E8475E" />
                ) : (
                  <Ionicons name="navigate" size={18} color="#E8475E" />
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What are you looking for?</Text>
            <View style={styles.goalsList}>
              {GOALS.map((goal) => (
                <Pressable
                  key={goal.id}
                  style={[styles.goalPillItem, lookingFor === goal.label && styles.goalPillItemSelected]}
                  onPress={() => setLookingFor(goal.label)}
                >
                  <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                  <Text style={[styles.goalPillItemText, lookingFor === goal.label && styles.goalPillItemTextSelected]}>
                    {goal.label}
                  </Text>
                  {lookingFor === goal.label && (
                    <Ionicons name="checkmark-circle" size={18} color="#E8475E" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Section 3: About Me */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeader}>✍️ About Me</Text>
          <Text style={styles.cardSub}>Write something authentic that describes your vibe and passions.</Text>

          <View style={styles.textAreaBox}>
            <TextInput
              style={styles.textArea}
              value={bio}
              onChangeText={(t) => setBio(t.slice(0, MAX_BIO_CHARS))}
              placeholder="Tell others about who you are, what you love, and what you're hoping to build..."
              placeholderTextColor="#A0A0B0"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/{MAX_BIO_CHARS}</Text>
          </View>

          <View style={styles.sparkRow}>
            <Text style={styles.sparkTitle}>Quick prompts:</Text>
            {['My love language is...', 'A fun fact about me is...', "I'm happiest when..."].map((prompt) => (
              <Pressable
                key={prompt}
                style={styles.sparkPill}
                onPress={() => setBio((prev) => prev ? `${prev}\n${prompt} ` : `${prompt} `)}
              >
                <Text style={styles.sparkPillText}>+ {prompt}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Section 4: Interests & Lifestyle */}
        <View style={styles.sectionCard}>
          <View style={styles.interestHeaderRow}>
            <Text style={styles.cardHeader}>🌟 Interests & Lifestyle</Text>
            <Text style={styles.counterText}>{selectedInterests.length}/{MAX_INTERESTS}</Text>
          </View>
          <Text style={styles.cardSub}>Select up to {MAX_INTERESTS} interests that show on your profile.</Text>

          <View style={styles.interestGrid}>
            {ALL_INTERESTS.map(({ emoji, label }) => {
              const isSelected = selectedInterests.includes(label)
              const isDisabled = !isSelected && selectedInterests.length >= MAX_INTERESTS
              return (
                <Pressable
                  key={label}
                  style={[
                    styles.interestPill,
                    isSelected && styles.interestPillSelected,
                    isDisabled && styles.interestPillDisabled,
                  ]}
                  onPress={() => toggleInterest(label)}
                >
                  <Text style={styles.interestEmoji}>{emoji}</Text>
                  <Text style={[styles.interestLabel, isSelected && styles.interestLabelSelected]}>{label}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <Pressable
            style={({ pressed }) => [styles.saveButton, saving && { opacity: 0.8 }, pressed && { opacity: 0.9 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <LinearGradient
              colors={['#E8475E', '#C73350']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradient}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.saveInner}>
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </View>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 60 },
  loadingContainer: { flex: 1, backgroundColor: '#FFFBF9', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FDDDE3' },
  title: { fontSize: 26, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#8E8E9E', marginTop: 2 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#DC2626' },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFDF5', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#A7F3D0' },
  successText: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#059669' },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: '#F0EDEF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  cardHeader: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', marginBottom: 4 },
  cardSub: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#8E8E9E', marginBottom: 14 },
  rowInputs: { flexDirection: 'row', gap: 12 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', borderWidth: 1, borderColor: '#E2E8F0' },
  disabledInput: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  disabledText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#64748B' },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choicePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  choicePillSelected: { backgroundColor: '#FDDDE3', borderColor: '#E8475E' },
  choicePillText: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#64748B' },
  choicePillTextSelected: { color: '#E8475E', fontFamily: 'PlusJakartaSans_700Bold' },
  locationInputRow: { flexDirection: 'row', gap: 8 },
  locationDetectBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FDDDE3' },
  goalsList: { gap: 8 },
  goalPillItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  goalPillItemSelected: { backgroundColor: '#FFF8F9', borderColor: '#E8475E' },
  goalEmoji: { fontSize: 18 },
  goalPillItemText: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#1A1A2E' },
  goalPillItemTextSelected: { fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  textAreaBox: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  textArea: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', minHeight: 90, lineHeight: 22 },
  charCount: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', color: '#94A3B8', textAlign: 'right', marginTop: 4 },
  sparkRow: { marginTop: 10, gap: 6 },
  sparkTitle: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#64748B' },
  sparkPill: { alignSelf: 'flex-start', backgroundColor: '#FFF0ED', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#FDDDE3' },
  sparkPillText: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: '#E8475E' },
  interestHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counterText: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#E8475E' },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  interestPillSelected: { backgroundColor: '#FDDDE3', borderColor: '#E8475E' },
  interestPillDisabled: { opacity: 0.4 },
  interestEmoji: { fontSize: 14 },
  interestLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#64748B' },
  interestLabelSelected: { color: '#E8475E', fontFamily: 'PlusJakartaSans_700Bold' },
  saveSection: { marginTop: 8, marginBottom: 20 },
  saveButton: { borderRadius: 18, overflow: 'hidden', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  saveGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  saveInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveButtonText: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
})
