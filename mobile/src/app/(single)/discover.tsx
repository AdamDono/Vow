import { View, Text, StyleSheet, Pressable, Dimensions, Image, ActivityIndicator, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { api } from '../../lib/api'

const { width, height } = Dimensions.get('window')
const CARD_WIDTH = width - 32
const CARD_HEIGHT = height * 0.62

interface Candidate {
  id: string
  name: string
  age: number
  city: string
  bio: string
  lookingFor: string
  vouchRating: number
  isVerified: boolean
  photos: string[]
  interests: string[]
}

export default function DiscoverScreen() {
  const [feed, setFeed] = useState<Candidate[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [matchModal, setMatchModal] = useState<{ visible: boolean; partnerName: string; partnerPhoto: string } | null>(null)

  const loadFeed = async () => {
    setLoading(true)
    try {
      const res = await api.singles.getFeed()
      if (res.feed && res.feed.length > 0) {
        setFeed(res.feed)
      }
    } catch (err) {
      console.warn('Could not fetch feed from live API, fallback active:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeed()
  }, [])

  const current = feed[currentIndex]

  const handlePass = async () => {
    if (!current) return
    const targetId = current.id
    if (currentIndex < feed.length) {
      setCurrentIndex((i) => i + 1)
    }
    try {
      await api.singles.swipe(targetId, 'pass')
    } catch (err) {
      console.error('Swipe error:', err)
    }
  }

  const handleLike = async () => {
    if (!current) return
    const target = current
    if (currentIndex < feed.length) {
      setCurrentIndex((i) => i + 1)
    }
    try {
      const res = await api.singles.swipe(target.id, 'like')
      if (res.isMatch) {
        setMatchModal({
          visible: true,
          partnerName: target.name,
          partnerPhoto: target.photos[0] || '',
        })
      }
    } catch (err) {
      console.error('Swipe error:', err)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8475E" />
        <Text style={styles.loadingText}>Finding matches near you...</Text>
      </View>
    )
  }

  if (!current || currentIndex >= feed.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>💫</Text>
        <Text style={styles.emptyTitle}>You're all caught up!</Text>
        <Text style={styles.emptySubtitle}>Check back soon or refresh for new profiles in your area.</Text>
        <Pressable style={styles.refreshButton} onPress={loadFeed}>
          <Text style={styles.refreshButtonText}>Refresh Feed</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoHeart}>♥</Text>
          </View>
          <Text style={styles.logoText}>vow</Text>
        </View>
        <Pressable style={styles.filterButton} onPress={loadFeed}>
          <Ionicons name="reload-outline" size={20} color="#1A1A2E" />
        </Pressable>
      </View>

      {/* Card */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Image
            source={{ uri: current.photos[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80' }}
            style={styles.cardPhoto}
            resizeMode="cover"
          />

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            locations={[0.4, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Vouch Rating badge */}
          <View style={styles.vowBadge}>
            <Text style={styles.vowBadgeText}>★ {current.vouchRating} Vouch Score</Text>
          </View>

          {/* Profile info */}
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.cardName}>
                {current.name}, {current.age}
              </Text>
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.locationText}>{current.city}</Text>
            </View>
            <View style={styles.goalPill}>
              <Text style={styles.goalPillText}>💍 {current.lookingFor}</Text>
            </View>
            {current.bio ? (
              <Text style={styles.bioText} numberOfLines={2}>
                {current.bio}
              </Text>
            ) : null}
            <View style={styles.interestRow}>
              {current.interests.map((i) => (
                <View key={i} style={styles.interestTag}>
                  <Text style={styles.interestTagText}>{i}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable style={styles.passButton} onPress={handlePass}>
            <Ionicons name="close" size={28} color="#6B6B7B" />
          </Pressable>

          <Pressable style={styles.superLikeButton} onPress={handleLike}>
            <Ionicons name="star" size={22} color="#C9A0F4" />
          </Pressable>

          <Pressable style={styles.likeButton} onPress={handleLike}>
            <LinearGradient colors={['#E8475E', '#C73350']} style={styles.likeButtonGradient}>
              <Ionicons name="heart" size={28} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* Match Celebratory Modal */}
      {matchModal && (
        <Modal visible={matchModal.visible} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalEmoji}>🎉</Text>
              <Text style={styles.modalTitle}>It's a Vow Match!</Text>
              <Text style={styles.modalSubtitle}>
                You and {matchModal.partnerName} both liked each other.
              </Text>
              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  setMatchModal(null)
                  router.push('/(single)/chat')
                }}
              >
                <Text style={styles.modalButtonText}>Send a Message</Text>
              </Pressable>
              <Pressable
                style={styles.modalClose}
                onPress={() => setMatchModal(null)}
              >
                <Text style={styles.modalCloseText}>Keep Browsing</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBF9', gap: 16 },
  loadingText: { fontSize: 16, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#E8475E', alignItems: 'center', justifyContent: 'center' },
  logoHeart: { fontSize: 16, color: '#FFFFFF' },
  logoText: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.5 },
  filterButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardContainer: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
  card: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 28, overflow: 'hidden', backgroundColor: '#F0EDEF' },
  cardPhoto: { width: '100%', height: '100%' },
  vowBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(232,71,94,0.95)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  vowBadgeText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF', letterSpacing: -0.5 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.85)' },
  goalPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  goalPillText: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#FFFFFF' },
  bioText: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  interestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  interestTag: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  interestTagText: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#FFFFFF' },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingTop: 16 },
  passButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  superLikeButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0E6FF', alignItems: 'center', justifyContent: 'center' },
  likeButton: { width: 68, height: 68, borderRadius: 34, overflow: 'hidden', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  likeButtonGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', textAlign: 'center' },
  emptySubtitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', textAlign: 'center', lineHeight: 24 },
  refreshButton: { marginTop: 16, backgroundColor: '#E8475E', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14 },
  refreshButtonText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, alignItems: 'center', gap: 12 },
  modalEmoji: { fontSize: 48 },
  modalTitle: { fontSize: 26, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  modalSubtitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', textAlign: 'center', lineHeight: 22 },
  modalButton: { backgroundColor: '#E8475E', borderRadius: 16, paddingVertical: 16, width: '100%', alignItems: 'center', marginTop: 12 },
  modalButtonText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  modalClose: { paddingVertical: 10 },
  modalCloseText: { color: '#A0A0B0', fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14 },
})
