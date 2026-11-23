import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, RefreshControl } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState, useCallback, useEffect } from 'react'
import { api } from '../../lib/api'
import { subscribeWs } from '../../lib/ws'

const MOOD_EMOJIS: Record<number, string> = {
  5: '😊',
  4: '🙂',
  3: '😐',
  2: '😟',
  1: '😔',
}

export default function DashboardScreen() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    try {
      setError(null)
      const res = await api.couples.getDashboard()
      setData(res)
    } catch (err: any) {
      // If relationship was ended by partner, route smoothly back to Single Mode
      if (err?.message?.toLowerCase().includes('no active relationship')) {
        router.replace('/(single)/discover')
        return
      }
      setError(err.message || 'Could not load your couple space.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadDashboard()
    }, [loadDashboard])
  )

  // Real-time WebSocket updates for double-blind check-in unlock & relationship end
  useEffect(() => {
    const unsubscribe = subscribeWs((event) => {
      if (event.type === 'couple:checkin') {
        loadDashboard()
      } else if (event.type === 'couple:ended') {
        router.replace('/(single)/discover')
      }
    })
    return unsubscribe
  }, [loadDashboard])

  const onRefresh = () => {
    setRefreshing(true)
    loadDashboard()
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8475E" />
        <Text style={styles.loadingText}>Opening your private Couples OS...</Text>
      </View>
    )
  }

  if (error || !data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 44 }}>💍</Text>
        <Text style={styles.errorTitle}>Could not load Couples Mode</Text>
        <Text style={styles.loadingText}>{error || 'Please check your connection and try again.'}</Text>
        <Pressable style={styles.retryBtn} onPress={loadDashboard}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    )
  }

  const harmony = data.harmonyScore ?? 100
  const days = data.daysTogether ?? 1
  const self = data.self || { name: 'You', photo: null }
  const partner = data.partner || { name: 'Partner', photo: null }
  const checkin = data.todayCheckin || {}
  const stats = data.stats || { goalsTotal: 0, goalsCompleted: 0, milestonesCount: 1 }

  const annivLabel = data.anniversaryDate
    ? new Date(data.anniversaryDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Today'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8475E" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.lockPill}>
            <Ionicons name="lock-closed" size={11} color="#7C3AED" />
            <Text style={styles.lockPillText}>VOW COMMITTED • SINCE {annivLabel.toUpperCase()}</Text>
          </View>
          <Text style={styles.headerTitle}>
            {self.name} & {partner.name}
          </Text>
        </View>
        <View style={styles.daysBadge}>
          <Text style={styles.daysNumber}>{days}</Text>
          <Text style={styles.daysLabel}>{days === 1 ? 'day' : 'days'}</Text>
        </View>
      </View>

      {/* Harmony Score Card */}
      <LinearGradient
        colors={['#E8475E', '#C9A0F4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.harmonyCard}
      >
        <Text style={styles.harmonyLabel}>RELATIONSHIP PULSE</Text>

        <View style={styles.ringWrapper}>
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Text style={styles.ringScore}>{harmony}%</Text>
              <Text style={styles.ringSubtext}>harmony</Text>
            </View>
          </View>
        </View>

        <Text style={styles.harmonyDesc}>
          {harmony >= 85
            ? 'Your connection is vibrant & deeply in sync. Keep tending it daily!'
            : harmony >= 65
            ? 'Steady warmth together. Check in honestly to stay closely aligned.'
            : 'Take a slow evening together — open reflections help reset harmony.'}
        </Text>

        <View style={styles.statsStrip}>
          <View style={styles.statChip}>
            <Text style={styles.statChipVal}>{stats.milestonesCount}</Text>
            <Text style={styles.statChipLbl}>Memories</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={styles.statChipVal}>
              {stats.goalsCompleted}/{stats.goalsTotal}
            </Text>
            <Text style={styles.statChipLbl}>Shared Vows</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Today's Double-Blind Check-in */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Today's Double-Blind Check-In</Text>
          <Pressable onPress={onRefresh}>
            <Text style={styles.refreshLink}>Refresh ⟳</Text>
          </Pressable>
        </View>

        <View style={styles.checkinRow}>
          <Pressable style={styles.checkinCard} onPress={() => router.push('/(couple)/checkin')}>
            <View style={styles.checkinAvatar}>
              {self.photo ? (
                <Image source={{ uri: self.photo }} style={styles.checkinPhoto} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{(self.name?.[0] || 'Y').toUpperCase()}</Text>
                </View>
              )}
            </View>
            <Text style={styles.checkinName}>{self.name}</Text>
            <View style={checkin.userSubmitted ? styles.checkinStatusDone : styles.checkinStatusPending}>
              <Text style={checkin.userSubmitted ? styles.checkinStatusText : styles.checkinStatusPendingText}>
                {checkin.userSubmitted ? 'Done ✓' : 'Tap to start'}
              </Text>
            </View>
          </Pressable>

          <View style={styles.checkinHeart}>
            <Text style={styles.checkinHeartText}>♥</Text>
          </View>

          <View style={styles.checkinCard}>
            <View style={styles.checkinAvatar}>
              {partner.photo ? (
                <Image source={{ uri: partner.photo }} style={styles.checkinPhoto} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: '#F0E6FF' }]}>
                  <Text style={[styles.avatarFallbackText, { color: '#7C3AED' }]}>
                    {(partner.name?.[0] || 'P').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.checkinName}>{partner.name}</Text>
            <View style={checkin.partnerSubmitted ? styles.checkinStatusDone : styles.checkinStatusPending}>
              <Text style={checkin.partnerSubmitted ? styles.checkinStatusText : styles.checkinStatusPendingText}>
                {checkin.partnerSubmitted ? 'Done ✓' : 'Waiting...'}
              </Text>
            </View>
          </View>
        </View>

        {!checkin.isSealed && checkin.partnerEntry ? (
          <View style={styles.revealedCard}>
            <Text style={styles.revealedTitle}>🔓 Today's Reflections Unlocked</Text>
            <View style={styles.reflectionRow}>
              <Text style={styles.reflectionEmoji}>{MOOD_EMOJIS[checkin.partnerEntry.moodScore] || '💛'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.revealedPartnerName}>{partner.name}</Text>
                <Text style={styles.revealedPartner}>
                  "{checkin.partnerEntry.promptAnswer || 'Checked in with love today'}"
                </Text>
              </View>
            </View>
            {checkin.userEntry && (
              <View style={[styles.reflectionRow, { borderTopWidth: 1, borderTopColor: '#E5D5FA', paddingTop: 10 }]}>
                <Text style={styles.reflectionEmoji}>{MOOD_EMOJIS[checkin.userEntry.moodScore] || '💛'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.revealedPartnerName}>{self.name}</Text>
                  <Text style={styles.revealedUser}>
                    "{checkin.userEntry.promptAnswer || 'Checked in with love today'}"
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.blindNote}>
            🔒 Double-blind sealed. Neither partner sees today's reflection until both submit.
          </Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Private Space</Text>
        <View style={styles.actionsGrid}>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(couple)/checkin')}>
            <View style={styles.actionIconWrap}>
              <Ionicons name="sunny-outline" size={24} color="#E8475E" />
            </View>
            <Text style={styles.actionLabel}>Daily Check-In</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(couple)/chat' as any)}>
            <View style={styles.actionIconWrap}>
              <Ionicons name="chatbubbles-outline" size={24} color="#E8475E" />
            </View>
            <Text style={styles.actionLabel}>Private Chat</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(couple)/timeline')}>
            <View style={styles.actionIconWrap}>
              <Ionicons name="calendar-outline" size={24} color="#E8475E" />
            </View>
            <Text style={styles.actionLabel}>Memory Vault</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(couple)/timeline')}>
            <View style={styles.actionIconWrap}>
              <Ionicons name="heart-outline" size={24} color="#E8475E" />
            </View>
            <Text style={styles.actionLabel}>Shared Vows</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBF9', gap: 12, padding: 32 },
  loadingText: { fontSize: 15, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#6B6B7B', textAlign: 'center' },
  errorTitle: { fontSize: 20, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  retryBtn: { marginTop: 8, backgroundColor: '#E8475E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  retryBtnText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontWeight: '700', fontSize: 14 },
  content: { paddingBottom: 110 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, gap: 12 },
  lockPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0E6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 6 },
  lockPillText: { fontSize: 10, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#7C3AED', letterSpacing: 0.6 },
  headerTitle: { fontSize: 25, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.25 },
  daysBadge: { backgroundColor: '#F0E6FF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 64 },
  daysNumber: { fontSize: 22, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#7C3AED' },
  daysLabel: { fontSize: 11, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#7C3AED' },
  harmonyCard: { marginHorizontal: 20, borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 28 },
  harmonyLabel: { fontSize: 12, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginBottom: 16, letterSpacing: 1 },
  ringWrapper: { marginBottom: 16 },
  ringOuter: { width: 132, height: 132, borderRadius: 66, borderWidth: 11, borderColor: 'rgba(255,255,255,0.32)', alignItems: 'center', justifyContent: 'center' },
  ringInner: { alignItems: 'center' },
  ringScore: { fontSize: 36, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  ringSubtext: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: 'rgba(255,255,255,0.88)' },
  harmonyDesc: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: 'rgba(255,255,255,0.95)', textAlign: 'center', lineHeight: 21 },
  statsStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 20, width: '100%' },
  statChip: { flex: 1, alignItems: 'center' },
  statChipVal: { fontSize: 18, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  statChipLbl: { fontSize: 11, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  statDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.3)' },
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  refreshLink: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#E8475E' },
  checkinRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkinCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#F0EDEF' },
  checkinAvatar: { width: 58, height: 58, borderRadius: 29, overflow: 'hidden' },
  checkinPhoto: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', backgroundColor: '#FDDDE3', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 22, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#E8475E' },
  checkinName: { fontSize: 15, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  checkinStatusDone: { backgroundColor: '#DCFCE7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  checkinStatusText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#16A34A' },
  checkinStatusPending: { backgroundColor: '#FFF0ED', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  checkinStatusPendingText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#E8475E' },
  checkinHeart: { alignItems: 'center', justifyContent: 'center' },
  checkinHeartText: { fontSize: 26, color: '#E8475E' },
  blindNote: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#8E8E9E', textAlign: 'center', marginTop: 14, lineHeight: 20 },
  revealedCard: { marginTop: 16, backgroundColor: '#F5EEFF', borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: '#DEC9FC' },
  revealedTitle: { fontSize: 13, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#6B3FA0', letterSpacing: 0.3 },
  reflectionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reflectionEmoji: { fontSize: 22, marginTop: 2 },
  revealedPartnerName: { fontSize: 12, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#6B3FA0', marginBottom: 2 },
  revealedPartner: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#1A1A2E', fontStyle: 'italic', lineHeight: 20 },
  revealedUser: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#4A4A5A', lineHeight: 20 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#F0EDEF' },
  actionIconWrap: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#1A1A2E', textAlign: 'center' },
})
