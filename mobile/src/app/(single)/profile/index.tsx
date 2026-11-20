import { View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator, RefreshControl, Modal, Switch, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useState, useCallback, useMemo } from 'react'
import { api, setAuthToken } from '../../../lib/api'

const { width, height } = Dimensions.get('window')

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [trustModalVisible, setTrustModalVisible] = useState(false)
  const [galleryModalVisible, setGalleryModalVisible] = useState(false)
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const [discoveryActive, setDiscoveryActive] = useState(true)

  const fetchUserProfile = useCallback(async () => {
    try {
      let res = await api.auth.me().catch(() => null)
      if (!res?.user) {
        const syncRes = await api.auth.neonSync().catch(() => null)
        if (syncRes?.token) {
          setAuthToken(syncRes.token)
          res = await api.auth.me().catch(() => null)
        }
      }
      if (res?.user) {
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
  const photosList = useMemo(() => {
    if (!user?.photos || !Array.isArray(user.photos)) return []
    return user.photos.map((p: any) => (typeof p === 'string' ? p : p.url)).filter(Boolean)
  }, [user])

  const photoUrl = photosList[0] || profile.photoUrl || null
  const initials = (profile.firstName?.[0] || user?.email?.[0] || 'V').toUpperCase()
  const interestsList = user?.interests?.length
    ? user.interests.map((i: any) => (typeof i === 'string' ? i : i.interest))
    : ['🧘 Yoga', '☕ Coffee', '📚 Reading', '✈️ Travel', '🌿 Nature']

  // Profile Completeness Calculation
  const completeness = useMemo(() => {
    let score = 20 // account created
    if (photosList.length >= 1) score += 20
    if (photosList.length >= 2) score += 15
    if (profile.bio && profile.bio.length > 20) score += 15
    if (interestsList.length >= 3) score += 15
    if (profile.city) score += 10
    if (profile.lookingFor) score += 5
    return Math.min(score, 100)
  }, [photosList, profile, interestsList])

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8475E" />
        <Text style={styles.loadingText}>Loading your verified profile...</Text>
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
          <Text style={styles.headerSub}>Manage your verified identity & trust score</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.editHeaderBtn}
            onPress={() => router.push('/(single)/profile/edit')}
          >
            <Ionicons name="pencil" size={16} color="#E8475E" />
            <Text style={styles.editHeaderBtnText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.refreshIconBtn} onPress={onRefresh}>
            <Ionicons name="reload" size={18} color="#6B6B7B" />
          </Pressable>
        </View>
      </View>

      {/* Photo & Verified Card */}
      <Pressable
        style={styles.photoWrapper}
        onPress={() => {
          if (photosList.length > 0) {
            setActiveGalleryIndex(0)
            setGalleryModalVisible(true)
          } else {
            router.push('/(single)/profile/edit')
          }
        }}
      >
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#FF8A9E', '#E8475E', '#C73350']} style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{initials}</Text>
            <Text style={styles.avatarSubText}>{displayName}</Text>
          </LinearGradient>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.65)']}
          locations={[0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
          <Text style={styles.verifiedText}>Google Verified</Text>
        </View>

        {photosList.length > 1 && (
          <View style={styles.photoCountBadge}>
            <Ionicons name="images-outline" size={14} color="#FFFFFF" />
            <Text style={styles.photoCountText}>{photosList.length} Photos</Text>
          </View>
        )}
      </Pressable>

      {/* Real Name & Status */}
      <View style={styles.nameSection}>
        <Text style={styles.name}>
          {displayName}
          {age}
        </Text>
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

      {/* Profile Completeness Bar */}
      <View style={styles.section}>
        <View style={styles.completenessCard}>
          <View style={styles.completenessHeader}>
            <Text style={styles.completenessTitle}>Profile Strength</Text>
            <Text style={styles.completenessPercent}>{completeness}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${completeness}%` }]} />
          </View>
          <Text style={styles.completenessTip}>
            {completeness === 100
              ? '🎉 Outstanding! Your profile has maximum visibility.'
              : photosList.length < 2
              ? '📸 Add 1 more photo to boost your match rate by 3x.'
              : '✨ Complete your bio and passions to reach 100% strength.'}
          </Text>
        </View>
      </View>

      {/* Vow Trust & Reputation Card */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Vow Trust & Reputation</Text>
          <Pressable onPress={() => setTrustModalVisible(true)}>
            <Text style={styles.sectionTitleAction}>How it works ℹ️</Text>
          </Pressable>
        </View>
        <Pressable style={styles.historyCard} onPress={() => setTrustModalVisible(true)}>
          <View style={styles.historyItem}>
            <Text style={styles.historyValue}>★ 100</Text>
            <Text style={styles.historyLabel}>Trust Score</Text>
          </View>
          <View style={styles.historySep} />
          <View style={styles.historyItem}>
            <Text style={[styles.historyValue, { color: '#10B981' }]}>Verified</Text>
            <Text style={styles.historyLabel}>Google Identity</Text>
          </View>
          <View style={styles.historySep} />
          <View style={styles.historyItem}>
            <Text style={styles.historyValue}>0</Text>
            <Text style={styles.historyLabel}>Reports / Flags</Text>
          </View>
        </Pressable>
        <Text style={styles.historyNote}>
          Tap above to view how your Vow trust score protects the community from ghosting and bad actors.
        </Text>
      </View>

      {/* Discovery Mode Visibility Toggle */}
      <View style={styles.section}>
        <View style={styles.visibilityCard}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="radio-outline" size={18} color="#E8475E" />
              <Text style={styles.visibilityTitle}>Discovery Visibility</Text>
            </View>
            <Text style={styles.visibilitySub}>
              {discoveryActive ? 'Your card is visible to singles in your area.' : 'You are currently paused from discovery.'}
            </Text>
          </View>
          <Switch
            value={discoveryActive}
            onValueChange={setDiscoveryActive}
            trackColor={{ false: '#F0EDEF', true: '#E8475E' }}
            thumbColor="#FFFFFF"
          />
        </View>
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

      {/* Vow Trust Rating Breakdown Modal */}
      {trustModalVisible && (
        <Modal visible={trustModalVisible} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.trustModalCard}>
              <View style={styles.trustModalHeader}>
                <Text style={styles.trustModalTitle}>Vow Trust Score Breakdown</Text>
                <Pressable style={styles.modalCloseBtn} onPress={() => setTrustModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#1A1A2E" />
                </Pressable>
              </View>

              <ScrollView style={styles.trustModalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.trustScoreBanner}>
                  <Text style={styles.trustBannerScore}>★ 100 / 100</Text>
                  <Text style={styles.trustBannerStatus}>Top Tier Reputation</Text>
                  <Text style={styles.trustBannerDesc}>
                    Vow maintains strict trust & safety so intentional singles can connect with complete peace of mind.
                  </Text>
                </View>

                <View style={styles.pillarList}>
                  <View style={styles.pillarCard}>
                    <View style={styles.pillarIconWrap}>
                      <Text style={{ fontSize: 22 }}>🛡️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.pillarTitleRow}>
                        <Text style={styles.pillarTitle}>Google Identity Verification</Text>
                        <Text style={styles.pillarPts}>+40 pts</Text>
                      </View>
                      <Text style={styles.pillarDesc}>Real name & email authenticated via Google OAuth.</Text>
                    </View>
                  </View>

                  <View style={styles.pillarCard}>
                    <View style={styles.pillarIconWrap}>
                      <Text style={{ fontSize: 22 }}>💬</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.pillarTitleRow}>
                        <Text style={styles.pillarTitle}>Authentic Communication</Text>
                        <Text style={styles.pillarPts}>+30 pts</Text>
                      </View>
                      <Text style={styles.pillarDesc}>Positive conversation response rate and respectful interactions.</Text>
                    </View>
                  </View>

                  <View style={styles.pillarCard}>
                    <View style={styles.pillarIconWrap}>
                      <Text style={{ fontSize: 22 }}>⚖️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.pillarTitleRow}>
                        <Text style={styles.pillarTitle}>Zero Safety Reports</Text>
                        <Text style={styles.pillarPts}>+20 pts</Text>
                      </View>
                      <Text style={styles.pillarDesc}>Clean record with 0 harassment reports, blocks, or violations.</Text>
                    </View>
                  </View>

                  <View style={styles.pillarCard}>
                    <View style={styles.pillarIconWrap}>
                      <Text style={{ fontSize: 22 }}>💍</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.pillarTitleRow}>
                        <Text style={styles.pillarTitle}>Relationship Accountability</Text>
                        <Text style={styles.pillarPts}>+10 pts</Text>
                      </View>
                      <Text style={styles.pillarDesc}>Clearly defined dating resume and intentions on file.</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <Pressable style={styles.trustDoneBtn} onPress={() => setTrustModalVisible(false)}>
                <Text style={styles.trustDoneBtnText}>Understood</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* Fullscreen Photo Carousel Modal */}
      {galleryModalVisible && photosList.length > 0 && (
        <Modal visible={galleryModalVisible} transparent animationType="fade">
          <View style={styles.galleryBackdrop}>
            <View style={styles.galleryHeader}>
              <Text style={styles.galleryHeaderTitle}>
                Photo {activeGalleryIndex + 1} of {photosList.length}
              </Text>
              <Pressable style={styles.galleryCloseBtn} onPress={() => setGalleryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.galleryMainImageWrap}>
              <Image
                source={{ uri: photosList[activeGalleryIndex] }}
                style={styles.galleryMainImage}
                resizeMode="contain"
              />
            </View>

            {photosList.length > 1 && (
              <View style={styles.galleryThumbnailsRow}>
                {photosList.map((url: string, idx: number) => (
                  <Pressable
                    key={idx}
                    onPress={() => setActiveGalleryIndex(idx)}
                    style={[
                      styles.galleryThumb,
                      activeGalleryIndex === idx && styles.galleryThumbActive,
                    ]}
                  >
                    <Image source={{ uri: url }} style={styles.galleryThumbImg} resizeMode="cover" />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </Modal>
      )}
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
  photoCountBadge: { position: 'absolute', bottom: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  photoCountText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#FFFFFF' },
  nameSection: { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
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
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  sectionTitleAction: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#E8475E' },
  completenessCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#F0EDEF', gap: 8 },
  completenessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completenessTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  completenessPercent: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  progressBarTrack: { height: 8, backgroundColor: '#F0EDEF', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#E8475E', borderRadius: 4 },
  completenessTip: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B', marginTop: 2 },
  historyCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#F0EDEF' },
  historyItem: { flex: 1, alignItems: 'center', gap: 4 },
  historyValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  historyLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0' },
  historySep: { width: 1, backgroundColor: '#F0EDEF', marginVertical: 4 },
  historyNote: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', marginTop: 8, textAlign: 'center' },
  visibilityCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#F0EDEF' },
  visibilityTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  visibilitySub: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', marginTop: 2, paddingRight: 12 },
  cardBox: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#F0EDEF' },
  bioText: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#4A4A5A', lineHeight: 24 },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestTag: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: '#F0EDEF' },
  interestTagText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#1A1A2E' },
  accountCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#F0EDEF' },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  accountLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
  accountValue: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E' },
  authBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0F4FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  authBadgeText: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#2563EB' },
  accountDivider: { height: 1, backgroundColor: '#F4F2F3', marginVertical: 4 },
  actionSection: { paddingHorizontal: 20, marginTop: 4, marginBottom: 20 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 16, paddingVertical: 16, borderWidth: 1.5, borderColor: '#FECACA' },
  logoutButtonText: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#DC2626' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  trustModalCard: { backgroundColor: '#FFFBF9', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: height * 0.88, overflow: 'hidden' },
  trustModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0EDEF' },
  trustModalTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0EDEF', alignItems: 'center', justifyContent: 'center' },
  trustModalScroll: { padding: 20 },
  trustScoreBanner: { backgroundColor: '#FFEBF0', borderRadius: 20, padding: 20, alignItems: 'center', gap: 6, marginBottom: 20 },
  trustBannerScore: { fontSize: 32, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  trustBannerStatus: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  trustBannerDesc: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', textAlign: 'center', lineHeight: 18, marginTop: 4 },
  pillarList: { gap: 12 },
  pillarCard: { flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F0EDEF', alignItems: 'center' },
  pillarIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFBF9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F0EDEF' },
  pillarTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillarTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  pillarPts: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  pillarDesc: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', marginTop: 2 },
  trustDoneBtn: { margin: 20, height: 52, backgroundColor: '#E8475E', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  trustDoneBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold' },
  galleryBackdrop: { flex: 1, backgroundColor: '#000000', justifyContent: 'space-between', paddingVertical: 40 },
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  galleryHeaderTitle: { color: '#FFFFFF', fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' },
  galleryCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  galleryMainImageWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  galleryMainImage: { width: width, height: height * 0.65 },
  galleryThumbnailsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 10 },
  galleryThumb: { width: 60, height: 60, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  galleryThumbActive: { borderColor: '#E8475E' },
  galleryThumbImg: { width: '100%', height: '100%' },
})
