import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'

const HARMONY_SCORE = 87
const DAYS_TOGETHER = 143

export default function DashboardScreen() {
  const circumference = 2 * Math.PI * 54 // radius = 54
  const strokeDashoffset = circumference * (1 - HARMONY_SCORE / 100)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Good morning 🌸</Text>
          <Text style={styles.headerTitle}>Adam & Sarah</Text>
        </View>
        <View style={styles.daysBadge}>
          <Text style={styles.daysNumber}>{DAYS_TOGETHER}</Text>
          <Text style={styles.daysLabel}>days</Text>
        </View>
      </View>

      {/* Harmony Score Card */}
      <LinearGradient colors={['#E8475E', '#C9A0F4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.harmonyCard}>
        <Text style={styles.harmonyLabel}>Harmony Score</Text>

        {/* Simple ring representation */}
        <View style={styles.ringWrapper}>
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Text style={styles.ringScore}>{HARMONY_SCORE}%</Text>
              <Text style={styles.ringSubtext}>harmony</Text>
            </View>
          </View>
        </View>

        <Text style={styles.harmonyDesc}>Your connection is strong. Keep checking in daily!</Text>
      </LinearGradient>

      {/* Today's Check-in */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Check-In</Text>
        <View style={styles.checkinRow}>
          <Pressable style={styles.checkinCard} onPress={() => router.push('/(couple)/checkin')}>
            <View style={styles.checkinAvatar}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80' }} style={styles.checkinPhoto} />
            </View>
            <Text style={styles.checkinName}>You</Text>
            <View style={styles.checkinStatusDone}>
              <Text style={styles.checkinStatusText}>Done ✓</Text>
            </View>
          </Pressable>

          <View style={styles.checkinHeart}><Text style={styles.checkinHeartText}>♥</Text></View>

          <Pressable style={styles.checkinCard}>
            <View style={styles.checkinAvatar}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80' }} style={styles.checkinPhoto} />
            </View>
            <Text style={styles.checkinName}>Sarah</Text>
            <View style={styles.checkinStatusPending}>
              <Text style={styles.checkinStatusPendingText}>Pending...</Text>
            </View>
          </Pressable>
        </View>
        <Text style={styles.blindNote}>🔒 Check-ins are double-blind. Results reveal at midnight.</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(couple)/checkin')}>
            <Text style={styles.actionEmoji}>✨</Text>
            <Text style={styles.actionLabel}>Daily Check-In</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(couple)/timeline')}>
            <Text style={styles.actionEmoji}>📅</Text>
            <Text style={styles.actionLabel}>Our Timeline</Text>
          </Pressable>
          <Pressable style={[styles.actionCard, styles.actionCardFull]}>
            <Text style={styles.actionEmoji}>💌</Text>
            <Text style={styles.actionLabel}>Send a Love Note</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  content: { paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerGreeting: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', marginBottom: 2 },
  headerTitle: { fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.5 },
  daysBadge: { backgroundColor: '#F0E6FF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  daysNumber: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', color: '#C9A0F4' },
  daysLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', color: '#C9A0F4' },
  harmonyCard: { marginHorizontal: 20, borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 28 },
  harmonyLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: 'rgba(255,255,255,0.8)', marginBottom: 20, letterSpacing: 0.5 },
  ringWrapper: { marginBottom: 20 },
  ringOuter: { width: 130, height: 130, borderRadius: 65, borderWidth: 12, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  ringInner: { alignItems: 'center' },
  ringScore: { fontSize: 36, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  ringSubtext: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.8)' },
  harmonyDesc: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', marginBottom: 14 },
  checkinRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  checkinCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#F0EDEF' },
  checkinAvatar: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  checkinPhoto: { width: '100%', height: '100%' },
  checkinName: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  checkinStatusDone: { backgroundColor: '#DCFCE7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  checkinStatusText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#16A34A' },
  checkinStatusPending: { backgroundColor: '#FFF0ED', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  checkinStatusPendingText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#A0A0B0' },
  checkinHeart: { alignItems: 'center', justifyContent: 'center' },
  checkinHeartText: { fontSize: 28, color: '#E8475E' },
  blindNote: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', textAlign: 'center', marginTop: 14, lineHeight: 20 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#F0EDEF', minWidth: '45%' },
  actionCardFull: { width: '100%', flex: 0, flexDirection: 'row', justifyContent: 'center', gap: 12 },
  actionEmoji: { fontSize: 26 },
  actionLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E', textAlign: 'center' },
})
