import { View, Text, StyleSheet, Pressable, Dimensions, Image, ActivityIndicator, Modal, ScrollView, Switch } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated'
import { api, getAuthToken, setAuthToken } from '../../lib/api'

const { width, height } = Dimensions.get('window')
const CARD_WIDTH = width - 32
const CARD_HEIGHT = height * 0.62
const SWIPE_THRESHOLD = width * 0.28

interface Candidate {
  id: string
  name: string
  age: number
  city: string
  bio: string
  lookingFor: string
  vouchRating: number
  isVerified: boolean
  livenessVerified?: boolean
  platformHistory?: {
    completedRelationships: number
    longestCommitmentDays: number
    totalCommittedDays: number
    avgHarmonyScore: number | null
    badgeLabel: string
  } | null
  photos: string[]
  interests: string[]
}

const AGE_PRESETS = [
  { id: 'all', label: 'All Ages', min: 18, max: 99 },
  { id: '18-25', label: '18 – 25', min: 18, max: 25 },
  { id: '24-32', label: '24 – 32', min: 24, max: 32 },
  { id: '30-45', label: '30 – 45', min: 30, max: 45 },
]

const CITIES = ['All', 'Johannesburg', 'Cape Town', 'Durban']

const INTENTIONS = [
  { id: 'All', label: 'All Intentions' },
  { id: 'Long-term relationship', label: '💍 Long-term relationship' },
  { id: 'Marriage someday', label: '💒 Marriage someday' },
  { id: 'Dating & seeing where it goes', label: '🌱 Dating & seeing where it goes' },
]

export default function DiscoverScreen() {
  const [feed, setFeed] = useState<Candidate[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resettingDeck, setResettingDeck] = useState(false)
  const [matchModal, setMatchModal] = useState<{ visible: boolean; partnerName: string; partnerPhoto: string } | null>(null)
  const [inspectModal, setInspectModal] = useState<Candidate | null>(null)
  const [photoViewIndex, setPhotoViewIndex] = useState(0)
  const [filterModalVisible, setFilterModalVisible] = useState(false)

  // Filter States
  const [selectedAgePreset, setSelectedAgePreset] = useState<string>('all')
  const [selectedCity, setSelectedCity] = useState<string>('All')
  const [selectedIntention, setSelectedIntention] = useState<string>('All')
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false)

  // Applied Filter States (actual ones query is built with)
  const [appliedFilters, setAppliedFilters] = useState({
    agePreset: 'all',
    city: 'All',
    intention: 'All',
    verifiedOnly: false,
  })

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (appliedFilters.agePreset !== 'all') count++
    if (appliedFilters.city !== 'All') count++
    if (appliedFilters.intention !== 'All') count++
    if (appliedFilters.verifiedOnly) count++
    return count
  }, [appliedFilters])

  const loadFeed = useCallback(async (filtersToUse = appliedFilters) => {
    setLoading(true)
    try {
      const token = getAuthToken()
      if (!token) {
        const syncRes = await api.auth.neonSync().catch(() => null)
        if (syncRes?.token) {
          setAuthToken(syncRes.token)
        }
      }

      const preset = AGE_PRESETS.find((p) => p.id === filtersToUse.agePreset)
      const res = await api.singles.getFeed({
        minAge: preset && preset.id !== 'all' ? preset.min : undefined,
        maxAge: preset && preset.id !== 'all' ? preset.max : undefined,
        city: filtersToUse.city !== 'All' ? filtersToUse.city : undefined,
        lookingFor: filtersToUse.intention !== 'All' ? filtersToUse.intention : undefined,
        verifiedOnly: filtersToUse.verifiedOnly || undefined,
      })

      if (res?.feed) {
        setFeed(res.feed)
        setCurrentIndex(0)
      }
    } catch (err) {
      console.warn('Could not fetch feed from live API:', err)
    } finally {
      setLoading(false)
    }
  }, [appliedFilters])

  useFocusEffect(
    useCallback(() => {
      loadFeed(appliedFilters)
    }, [loadFeed, appliedFilters])
  )

  const handleApplyFilters = () => {
    const nextFilters = {
      agePreset: selectedAgePreset,
      city: selectedCity,
      intention: selectedIntention,
      verifiedOnly,
    }
    setAppliedFilters(nextFilters)
    setFilterModalVisible(false)
    loadFeed(nextFilters)
  }

  const handleResetFilters = () => {
    setSelectedAgePreset('all')
    setSelectedCity('All')
    setSelectedIntention('All')
    setVerifiedOnly(false)
    const defaultFilters = {
      agePreset: 'all',
      city: 'All',
      intention: 'All',
      verifiedOnly: false,
    }
    setAppliedFilters(defaultFilters)
    setFilterModalVisible(false)
    loadFeed(defaultFilters)
  }

  const handleResetDeck = async () => {
    setResettingDeck(true)
    try {
      await api.singles.resetSwipes()
      await loadFeed(appliedFilters)
    } catch (err) {
      console.error('Failed to reset deck:', err)
    } finally {
      setResettingDeck(false)
    }
  }

  const current = feed[currentIndex]
  const nextCard = feed[currentIndex + 1]

  // Reanimated shared values for 60fps card swipe physics
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)

  useEffect(() => {
    translateX.value = 0
    translateY.value = 0
  }, [currentIndex, feed.length])

  const commitPass = useCallback(async () => {
    const target = feed[currentIndex]
    if (!target) return
    setCurrentIndex((i) => i + 1)
    try {
      await api.singles.swipe(target.id, 'pass')
    } catch (err) {
      console.error('Swipe error:', err)
    }
  }, [feed, currentIndex])

  const commitLike = useCallback(
    async (isSuperLike = false) => {
      const target = feed[currentIndex]
      if (!target) return
      setCurrentIndex((i) => i + 1)
      try {
        const res = await api.singles.swipe(target.id, isSuperLike ? 'super_like' : 'like')
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
    },
    [feed, currentIndex]
  )

  const handlePass = () => {
    if (!current) return
    translateX.value = withTiming(-width * 1.25, { duration: 240 }, (finished) => {
      if (finished) runOnJS(commitPass)()
    })
  }

  const handleLike = (isSuperLike = false) => {
    if (!current) return
    if (isSuperLike) {
      translateY.value = withTiming(-height * 0.8, { duration: 260 }, (finished) => {
        if (finished) runOnJS(commitLike)(true)
      })
    } else {
      translateX.value = withTiming(width * 1.25, { duration: 240 }, (finished) => {
        if (finished) runOnJS(commitLike)(false)
      })
    }
  }

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((e) => {
          translateX.value = e.translationX
          translateY.value = e.translationY * 0.35
        })
        .onEnd((e) => {
          const shouldLike = e.translationX > SWIPE_THRESHOLD || e.velocityX > 700
          const shouldPass = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -700

          if (shouldLike) {
            translateX.value = withTiming(width * 1.35, { duration: 220 }, (finished) => {
              if (finished) runOnJS(commitLike)(false)
            })
          } else if (shouldPass) {
            translateX.value = withTiming(-width * 1.35, { duration: 220 }, (finished) => {
              if (finished) runOnJS(commitPass)()
            })
          } else {
            translateX.value = withSpring(0, { damping: 16, stiffness: 180 })
            translateY.value = withSpring(0, { damping: 16, stiffness: 180 })
          }
        }),
    [commitLike, commitPass]
  )

  const topCardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-width * 0.7, 0, width * 0.7],
      [-14, 0, 14],
      Extrapolation.CLAMP
    )
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    }
  })

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
    transform: [
      { rotate: '-14deg' },
      { scale: interpolate(translateX.value, [20, SWIPE_THRESHOLD], [0.85, 1.05], Extrapolation.CLAMP) },
    ],
  }))

  const passStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -20], [1, 0], Extrapolation.CLAMP),
    transform: [
      { rotate: '14deg' },
      { scale: interpolate(translateX.value, [-SWIPE_THRESHOLD, -20], [1.05, 0.85], Extrapolation.CLAMP) },
    ],
  }))

  const nextCardAnimatedStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.abs(translateX.value) / SWIPE_THRESHOLD, 1)
    const scale = interpolate(progress, [0, 1], [0.94, 1], Extrapolation.CLAMP)
    const opacity = interpolate(progress, [0, 1], [0.65, 1], Extrapolation.CLAMP)
    return {
      transform: [{ scale }],
      opacity,
    }
  })

  if (loading && !resettingDeck) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8475E" />
        <Text style={styles.loadingText}>Finding intentional matches near you...</Text>
      </View>
    )
  }

  if (!current || currentIndex >= feed.length) {
    return (
      <View style={styles.emptyContainer}>
        {/* Header with filter action */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoHeart}>♥</Text>
            </View>
            <Text style={styles.logoText}>vow</Text>
          </View>
          <Pressable
            style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? '#E8475E' : '#1A1A2E'} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.emptyInner}>
          <Text style={styles.emptyEmoji}>💫</Text>
          <Text style={styles.emptyTitle}>You're all caught up!</Text>
          <Text style={styles.emptySubtitle}>
            {activeFilterCount > 0
              ? 'No more profiles matching your active filters. Try loosening your filters or resetting the deck.'
              : 'You have viewed all active single profiles in your area.'}
          </Text>

          <View style={styles.emptyActionsRow}>
            {activeFilterCount > 0 && (
              <Pressable style={styles.resetFiltersBtn} onPress={handleResetFilters}>
                <Ionicons name="funnel-outline" size={18} color="#E8475E" />
                <Text style={styles.resetFiltersBtnText}>Clear Filters</Text>
              </Pressable>
            )}
            <Pressable style={styles.refreshButton} onPress={handleResetDeck} disabled={resettingDeck}>
              {resettingDeck ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="refresh" size={18} color="#FFFFFF" />
                  <Text style={styles.refreshButtonText}>Reset Deck & Review</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Filter Modal */}
        {renderFilterModal()}
      </View>
    )
  }

  function renderFilterModal() {
    return (
      <Modal visible={filterModalVisible} transparent animationType="slide">
        <View style={styles.filterBackdrop}>
          <View style={styles.filterCard}>
            {/* Header */}
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Discovery Preferences</Text>
              <Pressable style={styles.filterCloseBtn} onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={22} color="#1A1A2E" />
              </Pressable>
            </View>

            <ScrollView style={styles.filterScroll} showsVerticalScrollIndicator={false}>
              {/* Age Range Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Age Range</Text>
                <View style={styles.chipRow}>
                  {AGE_PRESETS.map((p) => {
                    const isSelected = selectedAgePreset === p.id
                    return (
                      <Pressable
                        key={p.id}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => setSelectedAgePreset(p.id)}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{p.label}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              {/* City / Location Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Location / City</Text>
                <View style={styles.chipRow}>
                  {CITIES.map((c) => {
                    const isSelected = selectedCity === c
                    return (
                      <Pressable
                        key={c}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => setSelectedCity(c)}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>📍 {c}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              {/* Relationship Intentions Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Relationship Intentions</Text>
                <View style={styles.intentionCol}>
                  {INTENTIONS.map((item) => {
                    const isSelected = selectedIntention === item.id
                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.intentionRow, isSelected && styles.intentionRowSelected]}
                        onPress={() => setSelectedIntention(item.id)}
                      >
                        <Text style={[styles.intentionText, isSelected && styles.intentionTextSelected]}>
                          {item.label}
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={20} color="#E8475E" />}
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              {/* Verified Only Toggle */}
              <View style={styles.toggleSection}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="shield-checkmark" size={18} color="#E8475E" />
                    <Text style={styles.toggleTitle}>Google Verified Only</Text>
                  </View>
                  <Text style={styles.toggleSub}>Only discover profiles with verified identities and trust scores.</Text>
                </View>
                <Switch
                  value={verifiedOnly}
                  onValueChange={setVerifiedOnly}
                  trackColor={{ false: '#F0EDEF', true: '#E8475E' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.filterBottomBar}>
              <Pressable style={styles.filterResetBtn} onPress={handleResetFilters}>
                <Text style={styles.filterResetBtnText}>Reset All</Text>
              </Pressable>
              <Pressable style={styles.filterApplyBtn} onPress={handleApplyFilters}>
                <Text style={styles.filterApplyBtnText}>Apply Preferences</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={styles.refreshIconHeader} onPress={() => loadFeed(appliedFilters)}>
            <Ionicons name="reload-outline" size={18} color="#6B6B7B" />
          </Pressable>
          <Pressable
            style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? '#E8475E' : '#1A1A2E'} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Card Deck with 60fps Reanimated Swipe Physics */}
      <View style={styles.cardContainer}>
        <View style={styles.cardStack}>
          {/* Next Card Peek */}
          {nextCard && (
            <Animated.View style={[styles.card, styles.nextCard, nextCardAnimatedStyle]} pointerEvents="none">
              <Image
                source={{ uri: nextCard.photos[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80' }}
                style={styles.cardPhoto}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                locations={[0.45, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>
                  {nextCard.name}, {nextCard.age}
                </Text>
                <Text style={styles.locationText}>{nextCard.city}</Text>
              </View>
            </Animated.View>
          )}

          {/* Active Draggable Card */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.card, topCardAnimatedStyle]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  setPhotoViewIndex(0)
                  setInspectModal(current)
                }}
              >
                <Image
                  source={{ uri: current.photos[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80' }}
                  style={styles.cardPhoto}
                  resizeMode="cover"
                />

                {/* Gradient overlay */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  locations={[0.4, 1]}
                  style={StyleSheet.absoluteFill}
                />

                {/* LIKE / NOPE Floating Swipe Stamps */}
                <Animated.View style={[styles.swipeStamp, styles.likeStamp, likeStampStyle]} pointerEvents="none">
                  <Text style={styles.likeStampText}>LIKE ♥</Text>
                </Animated.View>
                <Animated.View style={[styles.swipeStamp, styles.passStamp, passStampStyle]} pointerEvents="none">
                  <Text style={styles.passStampText}>PASS</Text>
                </Animated.View>

                {/* Vouch Rating badge */}
                <View style={styles.vowBadge}>
                  <Text style={styles.vowBadgeText}>★ {current.vouchRating} Vouch Score</Text>
                </View>

                {/* Tap hint info icon */}
                <View style={styles.infoBadge}>
                  <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
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
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable style={styles.passButton} onPress={handlePass}>
            <Ionicons name="close" size={28} color="#6B6B7B" />
          </Pressable>

          <Pressable style={styles.superLikeButton} onPress={() => handleLike(true)}>
            <Ionicons name="star" size={22} color="#9D5CFF" />
          </Pressable>

          <Pressable style={styles.likeButton} onPress={() => handleLike(false)}>
            <Ionicons name="heart" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Inspect Profile Modal */}
      {inspectModal && (
        <Modal visible={!!inspectModal} transparent animationType="slide">
          <View style={styles.inspectBackdrop}>
            <View style={styles.inspectCard}>
              <View style={styles.inspectHeader}>
                <Text style={styles.inspectTitle}>{inspectModal.name}'s Profile</Text>
                <Pressable style={styles.inspectCloseBtn} onPress={() => setInspectModal(null)}>
                  <Ionicons name="close" size={22} color="#1A1A2E" />
                </Pressable>
              </View>

              <ScrollView style={styles.inspectScroll} showsVerticalScrollIndicator={false}>
                {/* Photo Gallery with pagination */}
                <View style={styles.galleryWrapper}>
                  <Image
                    source={{
                      uri:
                        inspectModal.photos[photoViewIndex] ||
                        inspectModal.photos[0] ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
                    }}
                    style={styles.inspectMainPhoto}
                    resizeMode="cover"
                  />
                  {inspectModal.photos.length > 1 && (
                    <View style={styles.galleryDots}>
                      {inspectModal.photos.map((_, idx) => (
                        <Pressable
                          key={idx}
                          onPress={() => setPhotoViewIndex(idx)}
                          style={[styles.galleryDot, photoViewIndex === idx && styles.galleryDotActive]}
                        />
                      ))}
                    </View>
                  )}
                </View>

                {/* Info Card */}
                <View style={styles.inspectBody}>
                  <View style={styles.inspectNameRow}>
                    <Text style={styles.inspectFullName}>
                      {inspectModal.name}, {inspectModal.age}
                    </Text>
                    <View style={[styles.verifiedBadge, inspectModal.livenessVerified && styles.faceVerifiedBadge]}>
                      <Ionicons
                        name={inspectModal.livenessVerified ? 'shield-checkmark' : 'checkmark-circle'}
                        size={16}
                        color={inspectModal.livenessVerified ? '#10B981' : '#E8475E'}
                      />
                      <Text style={[styles.verifiedText, inspectModal.livenessVerified && { color: '#059669' }]}>
                        {inspectModal.livenessVerified ? 'Face Verified' : 'Verified'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inspectLocationRow}>
                    <Ionicons name="location-outline" size={16} color="#6B6B7B" />
                    <Text style={styles.inspectLocationText}>{inspectModal.city}</Text>
                  </View>

                  <View style={styles.inspectScoreCard}>
                    <Text style={styles.inspectScoreLabel}>Vow Trust Rating</Text>
                    <Text style={styles.inspectScoreValue}>★ {inspectModal.vouchRating} / 100</Text>
                  </View>

                  {inspectModal.platformHistory ? (
                    <View style={styles.inspectHistoryCard}>
                      <View style={styles.inspectHistoryHeader}>
                        <Text style={styles.inspectSectionTitle}>Vow Platform History</Text>
                        <View style={styles.inspectHistoryBadge}>
                          <Text style={styles.inspectHistoryBadgeText}>
                            {inspectModal.platformHistory.badgeLabel}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.inspectHistoryRow}>
                        <View style={styles.inspectHistoryStat}>
                          <Text style={styles.inspectHistoryVal}>
                            {inspectModal.platformHistory.completedRelationships}
                          </Text>
                          <Text style={styles.inspectHistoryLbl}>Past Vows</Text>
                        </View>
                        <View style={styles.inspectHistoryStat}>
                          <Text style={styles.inspectHistoryVal}>
                            {inspectModal.platformHistory.longestCommitmentDays > 0
                              ? `${inspectModal.platformHistory.longestCommitmentDays}d`
                              : 'Fresh'}
                          </Text>
                          <Text style={styles.inspectHistoryLbl}>Longest Vow</Text>
                        </View>
                        <View style={styles.inspectHistoryStat}>
                          <Text style={styles.inspectHistoryVal}>
                            {inspectModal.platformHistory.avgHarmonyScore
                              ? `${inspectModal.platformHistory.avgHarmonyScore}%`
                              : '—'}
                          </Text>
                          <Text style={styles.inspectHistoryLbl}>Avg Harmony</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.inspectSection}>
                    <Text style={styles.inspectSectionTitle}>Looking For</Text>
                    <View style={styles.inspectPill}>
                      <Text style={styles.inspectPillText}>💍 {inspectModal.lookingFor}</Text>
                    </View>
                  </View>

                  {inspectModal.bio ? (
                    <View style={styles.inspectSection}>
                      <Text style={styles.inspectSectionTitle}>About</Text>
                      <Text style={styles.inspectBioText}>{inspectModal.bio}</Text>
                    </View>
                  ) : null}

                  {inspectModal.interests.length > 0 && (
                    <View style={styles.inspectSection}>
                      <Text style={styles.inspectSectionTitle}>Interests & Passions</Text>
                      <View style={styles.interestRow}>
                        {inspectModal.interests.map((tag) => (
                          <View key={tag} style={styles.inspectTag}>
                            <Text style={styles.inspectTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Bottom Quick Action Bar */}
              <View style={styles.inspectActions}>
                <Pressable
                  style={styles.inspectPassBtn}
                  onPress={() => {
                    setInspectModal(null)
                    handlePass()
                  }}
                >
                  <Ionicons name="close" size={24} color="#6B6B7B" />
                  <Text style={styles.inspectActionText}>Pass</Text>
                </Pressable>
                <Pressable
                  style={styles.inspectLikeBtn}
                  onPress={() => {
                    setInspectModal(null)
                    handleLike(false)
                  }}
                >
                  <Ionicons name="heart" size={22} color="#FFFFFF" />
                  <Text style={styles.inspectLikeText}>Like</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

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
                  router.push('/(single)/matches')
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

      {/* Filter Modal */}
      {renderFilterModal()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBF9', gap: 16 },
  loadingText: { fontSize: 16, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#6B6B7B' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#E8475E', alignItems: 'center', justifyContent: 'center' },
  logoHeart: { fontSize: 16, color: '#FFFFFF' },
  logoText: { fontSize: 22, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.25 },
  refreshIconHeader: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  filterButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, position: 'relative' },
  filterButtonActive: { borderColor: '#E8475E', borderWidth: 1.5 },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#E8475E', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'DMSans_700Bold', fontWeight: '700' },
  cardContainer: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
  cardStack: { width: CARD_WIDTH, height: CARD_HEIGHT, position: 'relative' },
  card: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 28, overflow: 'hidden', backgroundColor: '#F0EDEF' },
  nextCard: { position: 'absolute', top: 0, left: 0 },
  swipeStamp: { position: 'absolute', top: 70, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 3, zIndex: 20 },
  likeStamp: { left: 22, borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.16)' },
  likeStampText: { fontSize: 24, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#22C55E', letterSpacing: 1.2 },
  passStamp: { right: 22, borderColor: '#E8475E', backgroundColor: 'rgba(232,71,94,0.16)' },
  passStampText: { fontSize: 24, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#E8475E', letterSpacing: 1.2 },
  cardPhoto: { width: '100%', height: '100%' },
  vowBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(232,71,94,0.95)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  vowBadgeText: { fontSize: 12, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  infoBadge: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 28, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.25 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: 'rgba(255,255,255,0.85)' },
  goalPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  goalPillText: { fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#FFFFFF' },
  bioText: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  interestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  interestTag: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  interestTagText: { fontSize: 12, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#FFFFFF' },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingTop: 16 },
  passButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  superLikeButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', shadowColor: '#9D5CFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2 },
  likeButton: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#E8475E', alignItems: 'center', justifyContent: 'center', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6 },
  emptyContainer: { flex: 1, backgroundColor: '#FFFBF9' },
  emptyInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { fontSize: 24, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  emptySubtitle: { fontSize: 15, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', textAlign: 'center', lineHeight: 22 },
  emptyActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 16 },
  resetFiltersBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFEBF0', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14 },
  resetFiltersBtnText: { color: '#E8475E', fontFamily: 'DMSans_700Bold', fontWeight: '700', fontSize: 15 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8475E', borderRadius: 16, paddingHorizontal: 22, paddingVertical: 14 },
  refreshButtonText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontWeight: '700', fontSize: 15 },
  inspectBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  inspectCard: { backgroundColor: '#FFFBF9', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: height * 0.88, overflow: 'hidden' },
  inspectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0EDEF' },
  inspectTitle: { fontSize: 18, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  inspectCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0EDEF', alignItems: 'center', justifyContent: 'center' },
  inspectScroll: { flex: 1 },
  galleryWrapper: { width: '100%', height: 340, backgroundColor: '#F0EDEF', position: 'relative' },
  inspectMainPhoto: { width: '100%', height: '100%' },
  galleryDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  galleryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  galleryDotActive: { width: 24, backgroundColor: '#E8475E' },
  inspectBody: { padding: 20, gap: 16 },
  inspectNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inspectFullName: { fontSize: 26, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEBF0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  faceVerifiedBadge: { backgroundColor: '#ECFDF5' },
  verifiedText: { fontSize: 12, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#E8475E' },
  inspectHistoryCard: { backgroundColor: '#FAF6FF', borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E8DAFF' },
  inspectHistoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  inspectHistoryBadge: { backgroundColor: '#F0E6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  inspectHistoryBadgeText: { fontSize: 11, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#7C3AED' },
  inspectHistoryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inspectHistoryStat: { flex: 1, alignItems: 'center' },
  inspectHistoryVal: { fontSize: 16, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  inspectHistoryLbl: { fontSize: 11, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#8E8E9E', marginTop: 2 },
  inspectLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inspectLocationText: { fontSize: 15, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#6B6B7B' },
  inspectScoreCard: { backgroundColor: '#F8F3F1', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#F0E6E2' },
  inspectScoreLabel: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#1A1A2E' },
  inspectScoreValue: { fontSize: 16, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#E8475E' },
  inspectSection: { gap: 8 },
  inspectSectionTitle: { fontSize: 13, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#A0A0B0', textTransform: 'uppercase', letterSpacing: 0.5 },
  inspectPill: { alignSelf: 'flex-start', backgroundColor: '#FFEBF0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  inspectPillText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#E8475E' },
  inspectBioText: { fontSize: 15, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#3A3A4E', lineHeight: 22 },
  inspectTag: { backgroundColor: '#F0EDEF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  inspectTagText: { fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#1A1A2E' },
  inspectActions: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0EDEF' },
  inspectPassBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, backgroundColor: '#F0EDEF' },
  inspectActionText: { fontSize: 15, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B' },
  inspectLikeBtn: { flex: 2, height: 52, borderRadius: 16, backgroundColor: '#E8475E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  inspectLikeText: { fontSize: 15, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  filterBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  filterCard: { backgroundColor: '#FFFBF9', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: height * 0.85, overflow: 'hidden' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0EDEF' },
  filterTitle: { fontSize: 20, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  filterCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0EDEF', alignItems: 'center', justifyContent: 'center' },
  filterScroll: { padding: 20 },
  filterSection: { marginBottom: 24, gap: 10 },
  filterSectionTitle: { fontSize: 14, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: 0.2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F0EDEF', borderWidth: 1.5, borderColor: 'transparent' },
  chipSelected: { backgroundColor: '#FFEBF0', borderColor: '#E8475E' },
  chipText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B' },
  chipTextSelected: { color: '#E8475E', fontFamily: 'DMSans_700Bold', fontWeight: '700' },
  intentionCol: { gap: 8 },
  intentionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F0EDEF', borderWidth: 1.5, borderColor: 'transparent' },
  intentionRowSelected: { backgroundColor: '#FFEBF0', borderColor: '#E8475E' },
  intentionText: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#1A1A2E' },
  intentionTextSelected: { color: '#E8475E', fontFamily: 'DMSans_700Bold', fontWeight: '700' },
  toggleSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F0EDEF', marginBottom: 20 },
  toggleTitle: { fontSize: 15, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  toggleSub: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', marginTop: 2, paddingRight: 16 },
  filterBottomBar: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0EDEF' },
  filterResetBtn: { flex: 1, height: 52, borderRadius: 16, backgroundColor: '#F0EDEF', alignItems: 'center', justifyContent: 'center' },
  filterResetBtnText: { fontSize: 15, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B' },
  filterApplyBtn: { flex: 2, height: 52, borderRadius: 16, backgroundColor: '#E8475E', alignItems: 'center', justifyContent: 'center' },
  filterApplyBtnText: { fontSize: 15, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, alignItems: 'center', gap: 12 },
  modalEmoji: { fontSize: 48 },
  modalTitle: { fontSize: 26, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  modalSubtitle: { fontSize: 15, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', textAlign: 'center', lineHeight: 22 },
  modalButton: { backgroundColor: '#E8475E', borderRadius: 16, paddingVertical: 16, width: '100%', alignItems: 'center', marginTop: 12 },
  modalButtonText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontWeight: '700', fontSize: 16 },
  modalClose: { paddingVertical: 10 },
  modalCloseText: { color: '#A0A0B0', fontFamily: 'DMSans_500Medium', fontWeight: '500', fontSize: 14 },
})
