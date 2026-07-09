import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

const INTERESTS = ['🧘 Yoga', '☕ Coffee', '📚 Reading', '✈️ Travel', '🎬 Movies']

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <Pressable style={styles.editButton} onPress={() => router.push('/(single)/profile/edit')}>
          <Ionicons name="pencil" size={16} color="#E8475E" />
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
      </View>

      {/* Photo */}
      <View style={styles.photoWrapper}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80' }}
          style={styles.photo}
          resizeMode="cover"
        />
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>✓ Identity Verified</Text>
        </View>
      </View>

      {/* Name & Status */}
      <View style={styles.nameSection}>
        <Text style={styles.name}>Adam, 27</Text>
        <Text style={styles.location}>📍 Cape Town, SA</Text>
        <View style={styles.goalPill}>
          <Text style={styles.goalPillText}>💍 Long-term relationship</Text>
        </View>
      </View>

      {/* Vow History (if any) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vow Platform History</Text>
        <View style={styles.historyCard}>
          <View style={styles.historyItem}>
            <Text style={styles.historyValue}>—</Text>
            <Text style={styles.historyLabel}>Relationships</Text>
          </View>
          <View style={styles.historySep} />
          <View style={styles.historyItem}>
            <Text style={styles.historyValue}>New</Text>
            <Text style={styles.historyLabel}>Trust Score</Text>
          </View>
          <View style={styles.historySep} />
          <View style={styles.historyItem}>
            <Text style={styles.historyValue}>—</Text>
            <Text style={styles.historyLabel}>Avg. Length</Text>
          </View>
        </View>
        <Text style={styles.historyNote}>Your history builds as you connect with people on Vow.</Text>
      </View>

      {/* Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Me</Text>
        <Text style={styles.bioText}>UI/UX Designer & developer who loves building things that feel meaningful. I believe in showing up fully — in work and in love.</Text>
      </View>

      {/* Interests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        <View style={styles.interestGrid}>
          {INTERESTS.map((i) => (
            <View key={i} style={styles.interestTag}>
              <Text style={styles.interestTagText}>{i}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Settings */}
      <Pressable style={styles.settingsButton} onPress={() => router.push('/(single)/profile/settings')}>
        <Ionicons name="settings-outline" size={18} color="#6B6B7B" />
        <Text style={styles.settingsButtonText}>Settings</Text>
        <Ionicons name="chevron-forward" size={16} color="#A0A0B0" />
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  content: { paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.6 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FDDDE3', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  editButtonText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  photoWrapper: { marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', aspectRatio: 3 / 4, position: 'relative', marginBottom: 20 },
  photo: { width: '100%', height: '100%' },
  verifiedBadge: { position: 'absolute', bottom: 14, left: 14, backgroundColor: 'rgba(232,71,94,0.9)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  verifiedText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  nameSection: { paddingHorizontal: 20, gap: 8, marginBottom: 24 },
  name: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.5 },
  location: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  goalPill: { alignSelf: 'flex-start', backgroundColor: '#FDDDE3', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  goalPillText: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#E8475E' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', marginBottom: 12 },
  historyCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F0EDEF' },
  historyItem: { flex: 1, alignItems: 'center', gap: 4 },
  historyValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  historyLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0' },
  historySep: { width: 1, backgroundColor: '#F0EDEF', marginVertical: 4 },
  historyNote: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', marginTop: 10, textAlign: 'center' },
  bioText: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', lineHeight: 24 },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestTag: { backgroundColor: '#FDDDE3', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  interestTagText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#E8475E' },
  settingsButton: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#F0EDEF' },
  settingsButtonText: { flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
})
