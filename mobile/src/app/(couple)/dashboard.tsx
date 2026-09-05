import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

export default function DashboardScreen() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const res = await api.couples.getDashboard()
      setData(res)
    } catch (err) {
      console.warn('Using demo couple defaults:', err)
      // Fallback defaults
      setData({
        harmonyScore: 87,
        daysTogether: 143,
        partner: {
          name: 'Sarah',
          photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80',
        },
        todayCheckin: {
          userSubmitted: true,
          partnerSubmitted: true,
          isSealed: false,
          userEntry: { promptAnswer: 'Morning espresso before my pitch' },
          partnerEntry: { promptAnswer: 'Cooking dinner together without phones' },
        },
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8475E" />
        <Text style={styles.loadingText}>Loading your couple space...</Text>
      </View>
    )
  }

  const harmony = data?.harmonyScore ?? 87
  const days = data?.daysTogether ?? 143
  const partner = data?.partner || { name: 'Sarah', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80' }
  const checkin = data?.todayCheckin || {}

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Good day 🌸</Text>
          <Text style={styles.headerTitle}>Adam & {partner.name}</Text>
        </View>
        <View style={styles.daysBadge}>
          <Text style={styles.daysNumber}>{days}</Text>
          <Text style={styles.daysLabel}>days</Text>
        </View>
      </View>

      {/* Harmony Score Card */}
      <LinearGradient colors={['#E8475E', '#C9A0F4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.harmonyCard}>
        <Text style={styles.harmonyLabel}>Harmony Score</Text>

        {/* Ring representation */}
        <View style={styles.ringWrapper}>
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Text style={styles.ringScore}>{harmony}%</Text>
              <Text style={styles.ringSubtext}>harmony</Text>
            </View>
          </View>
        </View>

        <Text style={styles.harmonyDesc}>Your connection is vibrant & healthy. Keep checking in daily!</Text>
      </LinearGradient>

      {/* Today's Check-in */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Today's Check-In</Text>
          <Pressable onPress={loadDashboard}>
            <Text style={styles.refreshLink}>Refresh ⟳</Text>
          </Pressable>
        </View>

        <View style={styles.checkinRow}>
          <Pressable style={styles.checkinCard} onPress={() => router.push('/(couple)/checkin')}>
            <View style={styles.checkinAvatar}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80' }} style={styles.checkinPhoto} />
            </View>
            <Text style={styles.checkinName}>You</Text>
            <View style={checkin.userSubmitted ? styles.checkinStatusDone : styles.checkinStatusPending}>
              <Text style={checkin.userSubmitted ? styles.checkinStatusText : styles.checkinStatusPendingText}>
                {checkin.userSubmitted ? 'Done ✓' : 'Tap to start'}
              </Text>
            </View>
          </Pressable>

          <View style={styles.checkinHeart}><Text style={styles.checkinHeartText}>♥</Text></View>

          <Pressable style={styles.checkinCard}>
            <View style={styles.checkinAvatar}>
              <Image source={{ uri: partner.photo }} style={styles.checkinPhoto} />
            </View>
            <Text style={styles.checkinName}>{partner.name}</Text>
            <View style={checkin.partnerSubmitted ? styles.checkinStatusDone : styles.checkinStatusPending}>
              <Text style={checkin.partnerSubmitted ? styles.checkinStatusText : styles.checkinStatusPendingText}>
                {checkin.partnerSubmitted ? 'Done ✓' : 'Pending...'}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Revealed responses or sealed notice */}
        {!checkin.isSealed && checkin.partnerEntry ? (
          <View style={styles.revealedCard}>
            <Text style={styles.revealedTitle}>✨ Revealed Today's Reflection:</Text>
            <Text style={styles.revealedPartner}>{partner.name}: "{checkin.partnerEntry.promptAnswer}"</Text>
            {checkin.userEntry && (
              <Text style={styles.revealedUser}>You: "{checkin.userEntry.promptAnswer}"</Text>
            )}
          </View>
        ) : (
          <Text style={styles.blindNote}>🔒 Double-blind sealed. Responses reveal once both of you submit today.</Text>
        )}
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
          <Pressable style={[styles.actionCard, styles.actionCardFull]} onPress={() => router.push('/(couple)/timeline')}>
            <Text style={styles.actionEmoji}>💍</Text>
            <Text style={styles.actionLabel}>View Shared Vows & Goals</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBF9', gap: 12 },
  loadingText: { fontSize: 16, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
  content: { paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerGreeting: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', marginBottom: 2 },
  headerTitle: { fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.5 },
  daysBadge: { backgroundColor: '#F0E6FF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  daysNumber: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', color: '#C9A0F4' },
  daysLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', color: '#C9A0F4' },
  harmonyCard: { marginHorizontal: 20, borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 28 },
  harmonyLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: 'rgba(255,255,255,0.85)', marginBottom: 20, letterSpacing: 0.5 },
  ringWrapper: { marginBottom: 20 },
  ringOuter: { width: 130, height: 130, borderRadius: 65, borderWidth: 12, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  ringInner: { alignItems: 'center' },
  ringScore: { fontSize: 36, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  ringSubtext: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.85)' },
  harmonyDesc: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.95)', textAlign: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  refreshLink: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#E8475E' },
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
  revealedCard: { marginTop: 16, backgroundColor: '#F0E6FF', borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: '#C9A0F4' },
  revealedTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#6B3FA0' },
  revealedPartner: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#1A1A2E', fontStyle: 'italic' },
  revealedUser: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#F0EDEF', minWidth: '45%' },
  actionCardFull: { width: '100%', flex: 0, flexDirection: 'row', justifyContent: 'center', gap: 12 },
  actionEmoji: { fontSize: 26 },
  actionLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E', textAlign: 'center' },
})
