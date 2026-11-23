import { View, Text, StyleSheet, ScrollView, Image, Pressable, TextInput, ActivityIndicator, RefreshControl, Alert, Modal } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useState, useCallback, useEffect } from 'react'
import { api, getAuthToken, setAuthToken } from '../../lib/api'
import { subscribeWs } from '../../lib/ws'

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

interface ProposalItem {
  id: string
  status: string
  sentAt: string
  senderId: string
  receiverId: string
  partner: {
    id: string
    name: string
    age?: number | null
    city?: string | null
    photo?: string | null
  }
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [incomingProposals, setIncomingProposals] = useState<ProposalItem[]>([])
  const [outgoingProposals, setOutgoingProposals] = useState<ProposalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [actingInviteId, setActingInviteId] = useState<string | null>(null)
  const [lockingPartnerName, setLockingPartnerName] = useState<string | null>(null)

  const loadMatchesAndConversations = useCallback(async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        const syncRes = await api.auth.neonSync().catch(() => null)
        if (syncRes?.token) {
          setAuthToken(syncRes.token)
        }
      }

      // If partner accepted our Vow, auto-transition into Couples Mode
      const meRes = await api.auth.me().catch(() => null)
      if (meRes?.user?.relationshipStatus === 'coupled') {
        router.replace('/(couple)/dashboard')
        return
      }

      const [matchesRes, convRes, proposalsRes] = await Promise.all([
        api.singles.getMatches().catch(() => ({ matches: [] })),
        api.chat.getConversations().catch(() => ({ conversations: [] })),
        api.proposals.list().catch(() => ({ incoming: [], outgoing: [] })),
      ])

      if (matchesRes?.matches) {
        setMatches(matchesRes.matches)
      }
      if (convRes?.conversations) {
        setConversations(convRes.conversations)
      }
      if (proposalsRes?.incoming) {
        setIncomingProposals(proposalsRes.incoming)
      }
      if (proposalsRes?.outgoing) {
        setOutgoingProposals(proposalsRes.outgoing)
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

  // Real-time WebSocket updates for incoming Vows, new matches, and live messages
  useEffect(() => {
    const unsubscribe = subscribeWs((event) => {
      if (event.type === 'proposal:accepted') {
        router.replace('/(couple)/dashboard')
        return
      }
      if (
        event.type === 'proposal:received' ||
        event.type === 'proposal:updated' ||
        event.type === 'single:match' ||
        event.type === 'chat:message'
      ) {
        loadMatchesAndConversations()
      }
    })
    return unsubscribe
  }, [loadMatchesAndConversations])

  const onRefresh = () => {
    setRefreshing(true)
    loadMatchesAndConversations()
  }

  const handleAcceptProposal = async (proposal: ProposalItem) => {
    setActingInviteId(proposal.id)
    try {
      await api.proposals.accept(proposal.id)
      setLockingPartnerName(proposal.partner.name)
      setTimeout(() => {
        router.replace('/(couple)/dashboard')
      }, 1500)
    } catch (err: any) {
      Alert.alert('Could not accept Vow', err.message || 'Please try again.')
    } finally {
      setActingInviteId(null)
    }
  }

  const handleDeclineProposal = async (proposal: ProposalItem, isWithdraw = false) => {
    setActingInviteId(proposal.id)
    try {
      await api.proposals.decline(proposal.id)
      if (isWithdraw) {
        setOutgoingProposals((prev) => prev.filter((p) => p.id !== proposal.id))
      } else {
        setIncomingProposals((prev) => prev.filter((p) => p.id !== proposal.id))
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update Vow proposal.')
    } finally {
      setActingInviteId(null)
    }
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
      ) : matches.length === 0 && conversations.length === 0 && incomingProposals.length === 0 ? (
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
          {/* Incoming Vow Proposals */}
          {incomingProposals.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>💍 Incoming Vow Proposals</Text>
              {incomingProposals.map((proposal) => {
                const isBusy = actingInviteId === proposal.id
                const photoUrl =
                  proposal.partner.photo ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80'
                return (
                  <LinearGradient
                    key={proposal.id}
                    colors={['#FFF5F7', '#F5EEFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.vowCard}
                  >
                    <View style={styles.vowCardTop}>
                      <Image source={{ uri: photoUrl }} style={styles.vowPhoto} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vowCardEyebrow}>COMMITMENT LOCK INVITE</Text>
                        <Text style={styles.vowCardTitle}>
                          {proposal.partner.name} sent you a Vow!
                        </Text>
                        <Text style={styles.vowCardSub}>
                          Accepting moves you both into private Couples Mode and removes you from the singles feed.
                        </Text>
                      </View>
                    </View>
                    <View style={styles.vowCardActions}>
                      <Pressable
                        style={styles.vowDeclineBtn}
                        onPress={() => handleDeclineProposal(proposal, false)}
                        disabled={isBusy}
                      >
                        <Text style={styles.vowDeclineText}>Decline</Text>
                      </Pressable>
                      <Pressable
                        style={styles.vowAcceptBtn}
                        onPress={() => handleAcceptProposal(proposal)}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.vowAcceptText}>Accept Vow 💍</Text>
                        )}
                      </Pressable>
                    </View>
                  </LinearGradient>
                )
              })}
            </View>
          )}

          {/* Outgoing Pending Vows */}
          {outgoingProposals.length > 0 && (
            <View style={styles.sectionBlock}>
              {outgoingProposals.map((proposal) => (
                <View key={proposal.id} style={styles.outgoingBanner}>
                  <Text style={styles.outgoingText}>
                    💍 Vow sent to <Text style={{ fontFamily: 'DMSans_700Bold', fontWeight: '700' }}>{proposal.partner.name}</Text> • Awaiting response
                  </Text>
                  <Pressable
                    onPress={() => handleDeclineProposal(proposal, true)}
                    disabled={actingInviteId === proposal.id}
                  >
                    <Text style={styles.withdrawText}>Withdraw</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

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

      {/* Commitment Lock Transition Modal */}
      <Modal visible={!!lockingPartnerName} transparent animationType="fade">
        <LinearGradient
          colors={['#E8475E', '#C9A0F4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.lockOverlay}
        >
          <View style={styles.lockCircle}>
            <Text style={{ fontSize: 52 }}>💍</Text>
          </View>
          <Text style={styles.lockTitle}>Vow Committed!</Text>
          <Text style={styles.lockSubtitle}>
            You and {lockingPartnerName} are now exclusively paired. Entering your private Couples OS...
          </Text>
          <ActivityIndicator color="#FFFFFF" size="large" style={{ marginTop: 24 }} />
        </LinearGradient>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 28, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.3 },
  countBadge: { backgroundColor: '#FDDDE3', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { fontSize: 14, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#E8475E' },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F2F3', alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#F0EDEF' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#1A1A2E' },
  scrollContent: { paddingBottom: 110 },
  sectionBlock: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#A0A0B0', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 12 },
  vowCard: { marginHorizontal: 20, borderRadius: 22, padding: 18, borderWidth: 1.5, borderColor: '#F6CED8', marginBottom: 10, gap: 14 },
  vowCardTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  vowPhoto: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: '#E8475E' },
  vowCardEyebrow: { fontSize: 10, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#E8475E', letterSpacing: 0.9, marginBottom: 2 },
  vowCardTitle: { fontSize: 17, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  vowCardSub: { fontSize: 12, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', lineHeight: 18 },
  vowCardActions: { flexDirection: 'row', gap: 10 },
  vowDeclineBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6DFE4', alignItems: 'center' },
  vowDeclineText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B' },
  vowAcceptBtn: { flex: 2, borderRadius: 14, backgroundColor: '#E8475E', paddingVertical: 12, alignItems: 'center' },
  vowAcceptText: { fontSize: 14, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  outgoingBanner: { marginHorizontal: 20, backgroundColor: '#F0E6FF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#DEC9FC', marginBottom: 8 },
  outgoingText: { flex: 1, fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#5B21B6', paddingRight: 10 },
  withdrawText: { fontSize: 12, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#E8475E' },
  newMatchesRow: { paddingLeft: 20 },
  newMatchItem: { alignItems: 'center', marginRight: 16, width: 68 },
  newMatchPhotoWrapper: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 2.5, borderColor: '#E8475E', position: 'relative' },
  newMatchPhoto: { width: '100%', height: '100%' },
  newMatchOnline: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4ADE80', borderWidth: 2, borderColor: '#FFFFFF' },
  newMatchName: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#1A1A2E', marginTop: 6, textAlign: 'center' },
  matchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14, backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 10, borderRadius: 18, borderWidth: 1, borderColor: '#F0EDEF' },
  matchPhotoWrapper: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  matchPhoto: { width: '100%', height: '100%' },
  matchInfo: { flex: 1 },
  matchNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  matchName: { fontSize: 16, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  matchTime: { fontSize: 12, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#A0A0B0' },
  matchLastMessage: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B' },
  matchLastMessageUnread: { fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E8475E', alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { fontSize: 11, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  noConvBox: { paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center' },
  noConvText: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#A0A0B0', textAlign: 'center' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#6B6B7B' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, marginTop: 40 },
  emptyEmoji: { fontSize: 54, marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', textAlign: 'center', lineHeight: 22 },
  discoverBtn: { marginTop: 12, backgroundColor: '#E8475E', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14 },
  discoverBtnText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontWeight: '700', fontSize: 15 },
  lockOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36 },
  lockCircle: { width: 112, height: 112, borderRadius: 56, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  lockTitle: { fontSize: 34, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.4, marginBottom: 12, textAlign: 'center' },
  lockSubtitle: { fontSize: 16, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: 'rgba(255,255,255,0.92)', textAlign: 'center', lineHeight: 26 },
})
