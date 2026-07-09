import { View, Text, StyleSheet, Pressable, Dimensions, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'

const { width, height } = Dimensions.get('window')
const CARD_WIDTH = width - 32
const CARD_HEIGHT = height * 0.62

// Mock data — will be replaced with Supabase query
const MOCK_PROFILES = [
  {
    id: '1',
    name: 'Sarah',
    age: 24,
    city: 'Brooklyn, NY',
    distance: '2 km away',
    goal: 'Long-term relationship',
    interests: ['🧘 Yoga', '☕ Coffee', '📚 Reading'],
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
    vowHistory: null, // null = new user, no history yet
  },
  {
    id: '2',
    name: 'Amara',
    age: 26,
    city: 'Manhattan, NY',
    distance: '5 km away',
    goal: 'Dating & seeing where it goes',
    interests: ['✈️ Travel', '🎬 Movies', '🍷 Wine'],
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80',
    vowHistory: { relationshipLength: '11 months', respectRating: 94 },
  },
]

export default function DiscoverScreen() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  const current = MOCK_PROFILES[currentIndex]

  const handlePass = () => {
    if (currentIndex < MOCK_PROFILES.length - 1) setCurrentIndex(i => i + 1)
  }

  const handleLike = () => {
    if (currentIndex < MOCK_PROFILES.length - 1) setCurrentIndex(i => i + 1)
    // TODO: record like in Supabase, check for mutual match
  }

  if (!current) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>💫</Text>
        <Text style={styles.emptyTitle}>You're all caught up!</Text>
        <Text style={styles.emptySubtitle}>Check back later for new profiles near you.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}><Text style={styles.logoHeart}>♥</Text></View>
          <Text style={styles.logoText}>vow</Text>
        </View>
        <Pressable style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Ionicons name="options-outline" size={20} color="#1A1A2E" />
        </Pressable>
      </View>

      {/* Card */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Image source={{ uri: current.photo }} style={styles.cardPhoto} resizeMode="cover" />

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            locations={[0.45, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Vow History badge */}
          {current.vowHistory && (
            <View style={styles.vowBadge}>
              <Text style={styles.vowBadgeText}>✓ Vow Platform History</Text>
            </View>
          )}

          {/* Profile info */}
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.cardName}>{current.name}, {current.age}</Text>
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.locationText}>{current.distance}</Text>
            </View>
            <View style={styles.goalPill}>
              <Text style={styles.goalPillText}>{current.goal}</Text>
            </View>
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

          <Pressable style={styles.superLikeButton}>
            <Ionicons name="star" size={22} color="#C9A0F4" />
          </Pressable>

          <Pressable style={styles.likeButton} onPress={handleLike}>
            <LinearGradient colors={['#E8475E', '#C73350']} style={styles.likeButtonGradient}>
              <Ionicons name="heart" size={28} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#E8475E', alignItems: 'center', justifyContent: 'center' },
  logoHeart: { fontSize: 16, color: '#FFFFFF' },
  logoText: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.5 },
  filterButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardContainer: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
  card: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 28, overflow: 'hidden', backgroundColor: '#F0EDEF' },
  cardPhoto: { width: '100%', height: '100%' },
  vowBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(232,71,94,0.9)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  vowBadgeText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF', letterSpacing: -0.5 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.85)' },
  goalPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  goalPillText: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#FFFFFF' },
  interestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  interestTag: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  interestTagText: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#FFFFFF' },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingTop: 20 },
  passButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  superLikeButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0E6FF', alignItems: 'center', justifyContent: 'center' },
  likeButton: { width: 68, height: 68, borderRadius: 34, overflow: 'hidden', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  likeButtonGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', textAlign: 'center' },
  emptySubtitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', textAlign: 'center', lineHeight: 24 },
})
