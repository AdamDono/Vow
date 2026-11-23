import { View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useState, useEffect, useCallback } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { api, getAuthToken, setAuthToken } from '../../lib/api'

interface LikeItem {
  id: string
  name: string
  age: number
  city?: string
  photo: string
  superLike?: boolean
  createdAt?: string
}

export default function LikesScreen() {
  const [likes, setLikes] = useState<LikeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)

  const fetchLikes = useCallback(async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        const syncRes = await api.auth.neonSync().catch(() => null)
        if (syncRes?.token) {
          setAuthToken(syncRes.token)
        }
      }

      const res = await api.singles.getLikes()
      if (res?.likes) {
        setLikes(res.likes)
      }
    } catch (err) {
      console.warn('Failed to load likes:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchLikes()
    }, [fetchLikes])
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchLikes()
  }

  const handleLikeBack = async (targetId: string) => {
    setActingId(targetId)
    try {
      const res = await api.singles.swipe(targetId, 'like')
      setLikes((prev) => prev.filter((item) => item.id !== targetId))
      if (res?.isMatch) {
        router.push('/(single)/matches')
      }
    } catch (err) {
      console.error('Error liking back:', err)
    } finally {
      setActingId(null)
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Likes</Text>
          {likes.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{likes.length}</Text>
            </View>
          )}
        </View>
        <Pressable style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="reload" size={18} color="#6B6B7B" />
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        People who liked your profile. Like them back to start chatting!
      </Text>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E8475E" />
          <Text style={styles.loadingText}>Checking incoming likes...</Text>
        </View>
      ) : likes.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8475E" />}
        >
          <Text style={styles.emptyEmoji}>💌</Text>
          <Text style={styles.emptyTitle}>No new likes yet</Text>
          <Text style={styles.emptySub}>
            When someone likes or super likes your profile, they will show up here. Keep your profile updated to stand out!
          </Text>
          <Pressable style={styles.discoverBtn} onPress={() => router.push('/(single)/discover')}>
            <Text style={styles.discoverBtnText}>Explore Discover Feed</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8475E" />}
        >
          {likes.map((profile) => {
            const isLiking = actingId === profile.id
            return (
              <View key={profile.id} style={styles.likeCard}>
                <View style={styles.photoWrapper}>
                  <Image source={{ uri: profile.photo }} style={styles.photo} resizeMode="cover" />
                  {profile.superLike && (
                    <View style={styles.superLikeBadge}>
                      <Ionicons name="star" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <View style={styles.cardFooter}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {profile.name}, {profile.age}
                    </Text>
                    {profile.city ? (
                      <Text style={styles.cityText} numberOfLines={1}>📍 {profile.city}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    style={[styles.likeBackButton, isLiking && { opacity: 0.6 }]}
                    onPress={() => handleLikeBack(profile.id)}
                    disabled={isLiking}
                  >
                    {isLiking ? (
                      <ActivityIndicator size="small" color="#E8475E" />
                    ) : (
                      <Ionicons name="heart" size={18} color="#E8475E" />
                    )}
                  </Pressable>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 28, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.3 },
  countBadge: { backgroundColor: '#FDDDE3', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { fontSize: 14, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#E8475E' },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F2F3', alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#A0A0B0', paddingHorizontal: 20, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 20, paddingBottom: 110 },
  likeCard: { width: '47%', borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFFFFF', shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#F0EDEF' },
  photoWrapper: { width: '100%', aspectRatio: 3 / 4, position: 'relative' },
  photo: { width: '100%', height: '100%' },
  superLikeBadge: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: '#C9A0F4', alignItems: 'center', justifyContent: 'center' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  profileName: { fontSize: 15, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  cityText: { fontSize: 12, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#8E8E9E', marginTop: 2 },
  likeBackButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FDDDE3' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#6B6B7B' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, marginTop: 40 },
  emptyEmoji: { fontSize: 54, marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', textAlign: 'center', lineHeight: 22 },
  discoverBtn: { marginTop: 12, backgroundColor: '#E8475E', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14 },
  discoverBtnText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontWeight: '700', fontSize: 15 },
})
