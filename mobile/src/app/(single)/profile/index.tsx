import { View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useState, useCallback } from 'react'
import { api, setAuthToken } from '../../../lib/api'

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await api.auth.me()
      if (res.user) {
        setUser(res.user)
      }
    } catch (err) {
      console.warn('Could not fetch user profile:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile()
    }, [fetchUserProfile])
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchUserProfile()
  }

  const handleLogout = () => {
    setAuthToken(null)
    router.replace('/(auth)/login')
  }

  const profile = user?.profile || {}
  const displayName = profile.firstName
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : user?.email?.split('@')[0] || 'Vow Member'
  const age = profile.age ? `, ${profile.age}` : ''
  const photoUrl = user?.photos?.[0]?.url || profile.photoUrl || null
  const initials = (profile.firstName?.[0] || user?.email?.[0] || 'V').toUpperCase()
  const interestsList = user?.interests?.length
    ? user.interests.map((i: any) => typeof i === 'string' ? i : i.interest)
    : ['🧘 Yoga', '☕ Coffee', '📚 Reading', '✈️ Travel', '🎬 Movies', '🌿 Nature']

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8475E" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8475E" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.headerSub}>Manage your verified identity & account</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.editHeaderBtn}
            onPress={() => router.push('/(single)/profile/edit')}
          >
            <Ionicons name="pencil" size={16} color="#E8475E" />
            <Text style={styles.editHeaderBtnText}>Edit</Text>
          </Pressable>
          <Pressable
            style={styles.refreshIconBtn}
            onPress={onRefresh}
          >
            <Ionicons name="reload" size={18} color="#6B6B7B" />
          </Pressable>
        </View>
      </View>

      {/* Photo & Verified Card */}
      <View style={styles.photoWrapper}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#FF8A9E', '#E8475E', '#C73350']}
            style={styles.avatarPlaceholder}
          >
            <Text style={styles.avatarInitials}>{initials}</Text>
            <Text style={styles.avatarSubText}>{displayName}</Text>
          </LinearGradient>
        )}
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
          <Text style={styles.verifiedText}>Google Verified</Text>
        </View>
      </View>

      {/* Real Name & Status */}
      <View style={styles.nameSection}>
        <Text style={styles.name}>{displayName}{age}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.location}>📍 {profile.city || 'Johannesburg, SA'}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.emailText}>✉️ {user?.email || 'Authenticated'}</Text>
        </View>

        <View style={styles.pillRow}>
          <View style={styles.goalPill}>
            <Text style={styles.goalPillText}>💍 {profile.lookingFor || 'Long-term relationship'}</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>✨ Single Mode</Text>
          </View>
        </View>
      </View>

      {/* Vow Trust & Reputation Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vow Trust & Reputation</Text>
        <View style={styles.historyCard}>
          <View style={styles.historyItem}>
            <Text style={styles.historyValue}>100%</Text>
            <Text style={styles.historyLabel}>Trust Score</Text>
          </View>
          <View style={styles.historySep} />
          <View style={styles.historyItem}>
            <Text style={styles.historyValue}>Verified</Text>
            <Text style={styles.historyLabel}>Identity</Text>
          </View>
          <View style={styles.historySep} />
          <View style={styles.historyItem}>
            <Text style={styles.historyValue}>0</Text>
            <Text style={styles.historyLabel}>Past Vows</Text>
          </View>
        </View>
        <Text style={styles.historyNote}>Your Vow reputation builds automatically as you build authentic connections.</Text>
      </View>

      {/* Quick Edit Profile Banner */}
      <View style={styles.section}>
        <Pressable
          style={styles.quickEditCard}
          onPress={() => router.push('/(single)/profile/edit')}
        >
          <View style={styles.quickEditIconWrap}>
            <Ionicons name="create-outline" size={22} color="#E8475E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickEditTitle}>Edit Profile Details</Text>
            <Text style={styles.quickEditSub}>Update age, city, bio, and dating intent</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#A0A0B0" />
        </Pressable>
      </View>

      {/* About Me */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Me</Text>
        <View style={styles.cardBox}>
          <Text style={styles.bioText}>
            {profile.bio || 'Looking for something real, intentional, and lasting on Vow.'}
          </Text>
        </View>
      </View>

      {/* Interests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests & Lifestyle</Text>
        <View style={styles.interestGrid}>
          {interestsList.map((interest: string, idx: number) => (
            <View key={idx} style={styles.interestTag}>
              <Text style={styles.interestTagText}>{interest}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Account Info Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.accountCard}>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Authentication</Text>
            <View style={styles.authBadge}>
              <Ionicons name="logo-google" size={14} color="#4285F4" />
              <Text style={styles.authBadgeText}>Neon / Google OAuth</Text>
            </View>
          </View>
          <View style={styles.accountDivider} />
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Registered Email</Text>
            <Text style={styles.accountValue}>{user?.email || 'N/A'}</Text>
          </View>
          <View style={styles.accountDivider} />
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Database Status</Text>
            <Text style={[styles.accountValue, { color: '#10B981', fontWeight: '700' }]}>● Live & Synced</Text>
          </View>
        </View>
      </View>

      {/* Logout Action Button */}
      <View style={styles.actionSection}>
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.85 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Log Out of Account</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  content: { paddingBottom: 110 },
  loadingContainer: { flex: 1, backgroundColor: '#FFFBF9', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 30, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.6 },
  headerSub: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#8E8E9E', marginTop: 2 },
  editHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF0ED', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#FDDDE3' },
  editHeaderBtnText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  refreshIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4F2F3', alignItems: 'center', justifyContent: 'center' },
  photoWrapper: { marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', height: 320, position: 'relative', marginBottom: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDEF' },
  photo: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 8 },
  avatarInitials: { fontSize: 64, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  avatarSubText: { fontSize: 18, fontFamily: 'PlusJakartaSans_600SemiBold', color: 'rgba(255,255,255,0.9)' },
  verifiedBadge: { position: 'absolute', bottom: 16, left: 16, backgroundColor: '#10B981', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  verifiedText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  nameSection: { paddingHorizontal: 20, gap: 8, marginBottom: 24 },
  name: { fontSize: 26, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  location: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
  metaDot: { color: '#C0C0D0' },
  emailText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  goalPill: { backgroundColor: '#FDDDE3', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  goalPillText: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#E8475E' },
  statusPill: { backgroundColor: '#F0E6FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  statusPillText: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#7C3AED' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', marginBottom: 12 },
  quickEditCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#FDDDE3', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  quickEditIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center' },
  quickEditTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  quickEditSub: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', marginTop: 2 },
  cardBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#F0EDEF' },
  historyCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F0EDEF' },
  historyItem: { flex: 1, alignItems: 'center', gap: 4 },
  historyValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  historyLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0' },
  historySep: { width: 1, backgroundColor: '#F0EDEF', marginVertical: 4 },
  historyNote: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', marginTop: 10, textAlign: 'center' },
  bioText: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#4A4A5A', lineHeight: 24 },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestTag: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: '#F0EDEF' },
  interestTagText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#1A1A2E' },
  accountCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F0EDEF' },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  accountLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
  accountValue: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E' },
  authBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0F4FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  authBadgeText: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#2563EB' },
  accountDivider: { height: 1, backgroundColor: '#F4F2F3', marginVertical: 4 },
  actionSection: { paddingHorizontal: 20, marginTop: 4, marginBottom: 20 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 16, paddingVertical: 16, borderWidth: 1.5, borderColor: '#FECACA' },
  logoutButtonText: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#DC2626' },
})
