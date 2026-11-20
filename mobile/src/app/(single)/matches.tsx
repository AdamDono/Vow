import { View, Text, StyleSheet, ScrollView, Image, Pressable, TextInput, ActivityIndicator, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState, useCallback } from 'react'
import { api, getAuthToken, setAuthToken } from '../../lib/api'

interface MatchItem {
  matchId: string
  matchedAt: string
  partner: {
    id: string
    name: string
    age?: number
    city?: string
    photo?: string
  }
}

interface ConversationItem {
  id: string
  matchId: string
  partner: {
    id: string
    name: string
    photo?: string
  }
  lastMessage: string
  lastMessageTime?: string
  unread?: number
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const loadMatchesAndConversations = useCallback(async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        const syncRes = await api.auth.neonSync().catch(() => null)
        if (syncRes?.token) {
          setAuthToken(syncRes.token)
        }
      }

      const [matchesRes, convRes] = await Promise.all([
        api.singles.getMatches().catch(() => ({ matches: [] })),
        api.chat.getConversations().catch(() => ({ conversations: [] })),
      ])

      if (matchesRes?.matches) {
        setMatches(matchesRes.matches)
      }
      if (convRes?.conversations) {
        setConversations(convRes.conversations)
      }
    } catch (err) {
      console.warn('Failed to load matches and chats:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadMatchesAndConversations()
    }, [loadMatchesAndConversations])
  )

  const onRefresh = () => {
    setRefreshing(true)
    loadMatchesAndConversations()
  }

  const filteredConversations = conversations.filter((c) =>
    (c.partner.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return 'Just now'
    try {
      const d = new Date(timeStr)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h`
      return `${Math.floor(diffHours / 24)}d`
    } catch {
      return 'Recent'
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Matches</Text>
          {(matches.length > 0 || conversations.length > 0) && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{matches.length}</Text>
            </View>
          )}
        </View>
        <Pressable style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="reload" size={18} color="#6B6B7B" />
        </Pressable>
      </View>

      {/* Search bar */}
      {(matches.length > 0 || conversations.length > 0) && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#A0A0B0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search matches or messages..."
            placeholderTextColor="#A0A0B0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#A0A0B0" />
            </Pressable>
          )}
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E8475E" />
          <Text style={styles.loadingText}>Loading your matches & messages...</Text>
        </View>
      ) : matches.length === 0 && conversations.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8475E" />}
        >
          <Text style={styles.emptyEmoji}>💘</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySub}>
            Mutual likes will show up here. Head over to the Discover feed and start swiping to create your first connection!
          </Text>
          <Pressable style={styles.discoverBtn} onPress={() => router.push('/(single)/discover')}>
            <Text style={styles.discoverBtnText}>Start Discovering</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8475E" />}
        >
          {/* New Matches Bubble Row */}
          {matches.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>New Matches</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newMatchesRow}>
                {matches.map((m) => {
                  const photoUrl = m.partner.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80'
                  return (
                    <Pressable
                      key={m.matchId}
                      style={styles.newMatchItem}
                      onPress={() => router.push(`/(single)/chat/${m.matchId}`)}
                    >
                      <View style={styles.newMatchPhotoWrapper}>
                        <Image source={{ uri: photoUrl }} style={styles.newMatchPhoto} resizeMode="cover" />
                        <View style={styles.newMatchOnline} />
                      </View>
                      <Text style={styles.newMatchName} numberOfLines={1}>
                        {m.partner.name || 'Match'}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </View>
          )}

          {/* Conversations Message Threads */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Messages</Text>
            {filteredConversations.length === 0 ? (
              <View style={styles.noConvBox}>
                <Text style={styles.noConvText}>
                  {searchQuery ? 'No conversations match your search.' : 'Tap any connection above to start chatting!'}
                </Text>
              </View>
            ) : (
              filteredConversations.map((conv) => {
                const photoUrl = conv.partner.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80'
                const hasUnread = Boolean(conv.unread && conv.unread > 0)
                return (
                  <Pressable
                    key={conv.id}
                    style={styles.matchRow}
                    onPress={() => router.push(`/(single)/chat/${conv.id}`)}
                  >
                    <View style={styles.matchPhotoWrapper}>
                      <Image source={{ uri: photoUrl }} style={styles.matchPhoto} resizeMode="cover" />
                    </View>
                    <View style={styles.matchInfo}>
                      <View style={styles.matchNameRow}>
                        <Text style={styles.matchName}>{conv.partner.name || 'Member'}</Text>
                        <Text style={styles.matchTime}>{formatTime(conv.lastMessageTime)}</Text>
                      </View>
                      <Text
                        style={[styles.matchLastMessage, hasUnread && styles.matchLastMessageUnread]}
                        numberOfLines={1}
                      >
                        {conv.lastMessage}
                      </Text>
                    </View>
                    {hasUnread && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{conv.unread}</Text>
                      </View>
                    )}
                  </Pressable>
                )
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.6 },
  countBadge: { backgroundColor: '#FDDDE3', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F2F3', alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#F0EDEF' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E' },
  scrollContent: { paddingBottom: 110 },
  sectionBlock: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: '#A0A0B0', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 12 },
  newMatchesRow: { paddingLeft: 20 },
  newMatchItem: { alignItems: 'center', marginRight: 16, width: 68 },
  newMatchPhotoWrapper: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 2.5, borderColor: '#E8475E', position: 'relative' },
  newMatchPhoto: { width: '100%', height: '100%' },
  newMatchOnline: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4ADE80', borderWidth: 2, borderColor: '#FFFFFF' },
  newMatchName: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E', marginTop: 6, textAlign: 'center' },
  matchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14, backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 10, borderRadius: 18, borderWidth: 1, borderColor: '#F0EDEF' },
  matchPhotoWrapper: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  matchPhoto: { width: '100%', height: '100%' },
  matchInfo: { flex: 1 },
  matchNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  matchName: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  matchTime: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0' },
  matchLastMessage: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  matchLastMessageUnread: { fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E8475E', alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  noConvBox: { paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center' },
  noConvText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', textAlign: 'center' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, marginTop: 40 },
  emptyEmoji: { fontSize: 54, marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', textAlign: 'center', lineHeight: 22 },
  discoverBtn: { marginTop: 12, backgroundColor: '#E8475E', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14 },
  discoverBtnText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 },
})
