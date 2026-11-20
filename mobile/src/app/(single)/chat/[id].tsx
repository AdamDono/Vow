import { View, Text, StyleSheet, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Modal, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState, useEffect, useRef } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { api, getAuthToken, setAuthToken } from '../../../lib/api'

interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  text: string
  mediaUrl?: string | null
  createdAt?: string
  isRead?: boolean
}

interface DateProposalData {
  type: 'date_proposal'
  activity: string
  emoji: string
  location: string
  dateTime: string
  status: 'pending' | 'accepted' | 'declined'
  senderName: string
}

interface PartnerInfo {
  id: string
  name: string
  age?: number
  photo?: string
  city?: string
  bio?: string
  lookingFor?: string
  interests?: string[]
}

const DATE_ACTIVITIES = [
  { label: 'Coffee & Stroll', emoji: '☕', defaultVenue: 'Local Artisan Cafe' },
  { label: 'Wine & Dinner', emoji: '🍷', defaultVenue: 'Cozy Italian Bistro' },
  { label: 'Botanical Picnic', emoji: '🌿', defaultVenue: 'City Botanical Gardens' },
  { label: 'Art Gallery Walk', emoji: '🎨', defaultVenue: 'Modern Art Museum' },
  { label: 'Sunset Drinks', emoji: '🌅', defaultVenue: 'Rooftop Lounge' },
  { label: 'Live Music Night', emoji: '🎷', defaultVenue: 'Jazz Club' },
]

const QUICK_TIMES = [
  'Friday @ 7:00 PM',
  'Saturday @ 3:00 PM',
  'Saturday @ 7:30 PM',
  'Sunday @ 11:30 AM',
  'Next Week Wednesday @ 6:30 PM',
]

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>('Me')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Modals
  const [showDateModal, setShowDateModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Date Proposal Form State
  const [selectedActivity, setSelectedActivity] = useState(DATE_ACTIVITIES[0])
  const [dateVenue, setDateVenue] = useState(DATE_ACTIVITIES[0].defaultVenue)
  const [dateTime, setDateTime] = useState(QUICK_TIMES[0])

  const flatListRef = useRef<FlatList>(null)

  const loadChatData = async () => {
    if (!id) return
    try {
      const token = getAuthToken()
      if (!token) {
        const syncRes = await api.auth.neonSync().catch(() => null)
        if (syncRes?.token) {
          setAuthToken(syncRes.token)
        }
      }

      // 1. Get current user
      const meRes = await api.auth.me().catch(() => null)
      if (meRes?.user) {
        setCurrentUserId(meRes.user.id)
        if (meRes.user.profile?.firstName) {
          setCurrentUserName(meRes.user.profile.firstName)
        }
      }

      // 2. Fetch messages
      const msgRes = await api.chat.getMessages(id).catch(() => ({ messages: [] }))
      if (msgRes?.messages) {
        setMessages(msgRes.messages)
      }

      // 3. Find partner info
      const convRes = await api.chat.getConversations().catch(() => ({ conversations: [] }))
      const matchedConv = convRes.conversations?.find((c: any) => c.id === id || c.matchId === id)
      if (matchedConv?.partner) {
        setPartner(matchedConv.partner)
      } else {
        const matchesRes = await api.singles.getMatches().catch(() => ({ matches: [] }))
        const matched = matchesRes.matches?.find((m: any) => m.matchId === id || m.partner?.id === id)
        if (matched?.partner) {
          setPartner(matched.partner)
        }
      }
    } catch (err) {
      console.warn('Error loading chat data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChatData()
    const interval = setInterval(() => {
      if (id) {
        api.chat.getMessages(id).then((res) => {
          if (res?.messages) {
            setMessages(res.messages)
          }
        }).catch(() => {})
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [id])

  const handleSendMessage = async (customText?: string, mediaUrl?: string) => {
    const textToSend = customText !== undefined ? customText : input.trim()
    if ((!textToSend && !mediaUrl) || !id || sending) return

    if (!customText && !mediaUrl) {
      setInput('')
    }
    setSending(true)

    const tempId = `temp_${Date.now()}`
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: id,
      senderId: currentUserId || 'me',
      text: textToSend || (mediaUrl ? '📷 Photo' : ''),
      mediaUrl: mediaUrl || null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const res = await api.chat.sendMessage(id, textToSend || '📷 Photo', mediaUrl)
      if (res?.message) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? res.message : m)))
      }
    } catch (err: any) {
      console.error('Failed to send message:', err)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      if (!customText && !mediaUrl) {
        setInput(textToSend)
      }
    } finally {
      setSending(false)
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }

  // Photo Attachment Picker & Upload
  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow camera roll permissions to send photos.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      })

      if (result.canceled || !result.assets || !result.assets[0]) return

      const asset = result.assets[0]
      setUploadingPhoto(true)

      let uploadedUrl = asset.uri
      if (asset.base64) {
        const mime = asset.mimeType || 'image/jpeg'
        const base64Data = `data:${mime};base64,${asset.base64}`
        const uploadRes = await api.upload.photo(base64Data)
        if (uploadRes?.url) {
          uploadedUrl = uploadRes.url
        }
      }

      await handleSendMessage('', uploadedUrl)
    } catch (err: any) {
      console.error('Chat photo upload error:', err)
      Alert.alert('Upload Failed', err.message || 'Could not upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Send Date Proposal
  const handleSendDateProposal = async () => {
    if (!dateVenue.trim() || !dateTime.trim()) return

    const proposalData: DateProposalData = {
      type: 'date_proposal',
      activity: selectedActivity.label,
      emoji: selectedActivity.emoji,
      location: dateVenue.trim(),
      dateTime: dateTime.trim(),
      status: 'pending',
      senderName: currentUserName,
    }

    setShowDateModal(false)
    await handleSendMessage(JSON.stringify(proposalData))
  }

  // Accept Date Proposal
  const handleAcceptDate = async (msg: ChatMessage, proposal: DateProposalData) => {
    const acceptanceMsg = `🎉 I'd love to! Count me in for ${proposal.emoji} ${proposal.activity} at ${proposal.location} on ${proposal.dateTime}.`
    await handleSendMessage(acceptanceMsg)
  }

  // Unmatch handler
  const handleUnmatch = () => {
    Alert.alert(
      `Unmatch with ${partnerName}?`,
      'This will remove the conversation and hide your profiles from each other.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmatch',
          style: 'destructive',
          onPress: async () => {
            setShowMenuModal(false)
            try {
              if (id) {
                await api.singles.unmatch(id)
              }
              router.replace('/(single)/matches')
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not unmatch.')
            }
          },
        },
      ]
    )
  }

  // Block & Report handler
  const handleBlock = () => {
    Alert.alert(
      `Block & Report ${partnerName}?`,
      'They will not be able to view your profile or message you again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: async () => {
            setShowMenuModal(false)
            try {
              if (id) {
                await api.singles.unmatch(id)
              }
              Alert.alert('Blocked', 'This user has been blocked.')
              router.replace('/(single)/matches')
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not block user.')
            }
          },
        },
      ]
    )
  }

  const partnerName = partner?.name || 'Match'
  const partnerPhoto = partner?.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80'

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return 'Now'
    try {
      const d = new Date(dateStr)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // Parse custom structured message (like Date Proposal)
  const parseSpecialMessage = (text: string): DateProposalData | null => {
    if (!text || !text.startsWith('{')) return null
    try {
      const parsed = JSON.parse(text)
      if (parsed.type === 'date_proposal') return parsed
    } catch (_) {}
    return null
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
        </Pressable>

        <Pressable style={styles.headerCenter} onPress={() => setShowProfileModal(true)}>
          <Image source={{ uri: partnerPhoto }} style={styles.headerPhoto} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{partnerName}</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Connected on Vow</Text>
            </View>
          </View>
        </Pressable>

        {/* Action Buttons */}
        <View style={styles.headerActions}>
          <Pressable style={styles.vowButton} onPress={() => router.push('/proposal')}>
            <Text style={styles.vowButtonText}>💍 Send Vow</Text>
          </Pressable>
          <Pressable style={styles.menuIconBtn} onPress={() => setShowMenuModal(true)}>
            <Ionicons name="ellipsis-vertical" size={20} color="#6B6B7B" />
          </Pressable>
        </View>
      </View>

      {/* Date Proposal Quick Banner */}
      <Pressable style={styles.dateBanner} onPress={() => setShowDateModal(true)}>
        <View style={styles.dateBannerIcon}>
          <Text style={{ fontSize: 16 }}>🗓️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateBannerTitle}>Ready for real life?</Text>
          <Text style={styles.dateBannerSub}>Tap to send an intentional Date Proposal to {partnerName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#E8475E" />
      </Pressable>

      {/* Messages List */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#E8475E" />
          <Text style={styles.loadingText}>Opening conversation...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyChatBox}>
          <Image source={{ uri: partnerPhoto }} style={styles.emptyPartnerPhoto} />
          <Text style={styles.emptyMatchTitle}>You matched with {partnerName}! 🎉</Text>
          <Text style={styles.emptyMatchSub}>
            Break the ice! Ask about their favorite spots, weekend passions, or propose a date.
          </Text>
          <View style={styles.icebreakers}>
            {[
              'Hey! How has your week been? 😊',
              'Loved your photos! What is Lisbon like? 🌊',
              'Coffee or tea on a Sunday morning? ☕',
            ].map((icebreaker, i) => (
              <Pressable
                key={i}
                style={styles.icebreakerPill}
                onPress={() => handleSendMessage(icebreaker)}
              >
                <Text style={styles.icebreakerText}>{icebreaker}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMine = item.senderId === currentUserId || item.senderId === 'me'
            const dateProposal = parseSpecialMessage(item.text)

            // Render Date Proposal Card
            if (dateProposal) {
              return (
                <View style={[styles.dateCardWrapper, isMine ? styles.dateCardMine : styles.dateCardOthers]}>
                  <LinearGradient
                    colors={['#FFF5F6', '#FFEBEF']}
                    style={styles.dateCardInner}
                  >
                    <View style={styles.dateCardHeader}>
                      <Text style={styles.dateCardEmoji}>{dateProposal.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dateCardType}>Date Proposal</Text>
                        <Text style={styles.dateCardActivity}>{dateProposal.activity}</Text>
                      </View>
                    </View>

                    <View style={styles.dateCardDetails}>
                      <View style={styles.dateDetailRow}>
                        <Ionicons name="location" size={14} color="#E8475E" />
                        <Text style={styles.dateDetailText}>{dateProposal.location}</Text>
                      </View>
                      <View style={styles.dateDetailRow}>
                        <Ionicons name="calendar" size={14} color="#E8475E" />
                        <Text style={styles.dateDetailText}>{dateProposal.dateTime}</Text>
                      </View>
                    </View>

                    {!isMine ? (
                      <View style={styles.dateCardActions}>
                        <Pressable
                          style={styles.dateAcceptBtn}
                          onPress={() => handleAcceptDate(item, dateProposal)}
                        >
                          <Text style={styles.dateAcceptBtnText}>Accept Date 🎉</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.dateSentPill}>
                        <Text style={styles.dateSentPillText}>Proposal sent • Awaiting response</Text>
                      </View>
                    )}
                    <Text style={styles.dateCardTime}>{formatMessageTime(item.createdAt)}</Text>
                  </LinearGradient>
                </View>
              )
            }

            // Render Standard Photo or Text Message
            return (
              <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
                {!isMine && <Image source={{ uri: partnerPhoto }} style={styles.messagAvatar} />}
                <View style={[styles.messageBubble, isMine && styles.messageBubbleMine]}>
                  {item.mediaUrl ? (
                    <Pressable onPress={() => setPreviewImage(item.mediaUrl || null)}>
                      <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} resizeMode="cover" />
                    </Pressable>
                  ) : null}

                  {item.text && item.text !== '📷 Photo' ? (
                    isMine ? (
                      <LinearGradient
                        colors={['#E8475E', '#C73350']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.messageBubbleGradient}
                      >
                        <Text style={[styles.messageText, styles.messageTextMine]}>{item.text}</Text>
                        <Text style={styles.timeMine}>{formatMessageTime(item.createdAt)}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.messageBubbleOthers}>
                        <Text style={styles.messageText}>{item.text}</Text>
                        <Text style={styles.timeOthers}>{formatMessageTime(item.createdAt)}</Text>
                      </View>
                    )
                  ) : item.mediaUrl ? (
                    <Text style={[styles.timeOnly, isMine ? styles.timeMine : styles.timeOthers]}>
                      {formatMessageTime(item.createdAt)}
                    </Text>
                  ) : null}
                </View>
              </View>
            )
          }}
        />
      )}

      {/* Uploading Photo Indicator */}
      {uploadingPhoto && (
        <View style={styles.uploadingBar}>
          <ActivityIndicator size="small" color="#E8475E" />
          <Text style={styles.uploadingBarText}>Uploading photo to cloud...</Text>
        </View>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        <Pressable
          style={styles.attachBtn}
          onPress={handlePickPhoto}
          disabled={uploadingPhoto || sending}
        >
          <Ionicons name="camera-outline" size={22} color="#6B6B7B" />
        </Pressable>

        <Pressable
          style={styles.dateActionBtn}
          onPress={() => setShowDateModal(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#E8475E" />
        </Pressable>

        <TextInput
          style={styles.input}
          placeholder={`Message ${partnerName}...`}
          placeholderTextColor="#A0A0B0"
          value={input}
          onChangeText={setInput}
          multiline
          onSubmitEditing={() => handleSendMessage()}
        />

        <Pressable
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={() => handleSendMessage()}
          disabled={!input.trim() || sending}
        >
          <LinearGradient
            colors={input.trim() ? ['#E8475E', '#C73350'] : ['#E0D8DA', '#CFC8CB']}
            style={styles.sendButtonGradient}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            )}
          </LinearGradient>
        </Pressable>
      </View>

      {/* Propose A Date Modal */}
      <Modal visible={showDateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.dateModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>🗓️ Propose a Date</Text>
                <Text style={styles.modalSubtitle}>Invite {partnerName} on a real date</Text>
              </View>
              <Pressable style={styles.modalCloseBtn} onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={20} color="#1A1A2E" />
              </Pressable>
            </View>

            {/* Activity Picker */}
            <Text style={styles.pickerLabel}>Choose an Activity:</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={DATE_ACTIVITIES}
              keyExtractor={(item) => item.label}
              style={styles.activityList}
              renderItem={({ item }) => {
                const isSelected = selectedActivity.label === item.label
                return (
                  <Pressable
                    style={[styles.activityPill, isSelected && styles.activityPillSelected]}
                    onPress={() => {
                      setSelectedActivity(item)
                      setDateVenue(item.defaultVenue)
                    }}
                  >
                    <Text style={styles.activityEmoji}>{item.emoji}</Text>
                    <Text style={[styles.activityLabel, isSelected && styles.activityLabelSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                )
              }}
            />

            {/* Venue / Place */}
            <Text style={styles.pickerLabel}>Venue / Spot:</Text>
            <TextInput
              style={styles.modalInput}
              value={dateVenue}
              onChangeText={setDateVenue}
              placeholder="e.g. Kirstenbosch Gardens, Truth Cafe"
              placeholderTextColor="#A0A0B0"
            />

            {/* Date & Time */}
            <Text style={styles.pickerLabel}>Suggested Day & Time:</Text>
            <View style={styles.timePillGrid}>
              {QUICK_TIMES.slice(0, 4).map((timeStr) => (
                <Pressable
                  key={timeStr}
                  style={[styles.timePill, dateTime === timeStr && styles.timePillSelected]}
                  onPress={() => setDateTime(timeStr)}
                >
                  <Text style={[styles.timePillText, dateTime === timeStr && styles.timePillTextSelected]}>
                    {timeStr}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Submit Date Proposal */}
            <Pressable style={styles.sendDateBtn} onPress={handleSendDateProposal}>
              <LinearGradient colors={['#E8475E', '#C73350']} style={styles.sendDateGradient}>
                <Text style={styles.sendDateBtnText}>Send Date Proposal 💌</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Full Partner Profile View Modal */}
      <Modal visible={showProfileModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{partnerName}'s Profile</Text>
              <Pressable style={styles.modalCloseBtn} onPress={() => setShowProfileModal(false)}>
                <Ionicons name="close" size={20} color="#1A1A2E" />
              </Pressable>
            </View>

            <Image source={{ uri: partnerPhoto }} style={styles.fullProfilePhoto} resizeMode="cover" />

            <View style={styles.profileDetailsBox}>
              <Text style={styles.profileFullName}>{partnerName}, {partner?.age || 25}</Text>
              <Text style={styles.profileCityText}>📍 {partner?.city || 'Johannesburg, SA'}</Text>
              
              <View style={styles.profileGoalBadge}>
                <Text style={styles.profileGoalBadgeText}>💍 {partner?.lookingFor || 'Long-term relationship'}</Text>
              </View>

              {partner?.bio ? (
                <View style={styles.profileBioBox}>
                  <Text style={styles.profileBioText}>{partner.bio}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      {/* Safety Menu Modal (Unmatch / Block) */}
      <Modal visible={showMenuModal} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenuModal(false)}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>Options for {partnerName}</Text>
            
            <Pressable style={styles.menuOption} onPress={() => { setShowMenuModal(false); setShowProfileModal(true) }}>
              <Ionicons name="person-outline" size={20} color="#1A1A2E" />
              <Text style={styles.menuOptionText}>View Profile</Text>
            </Pressable>

            <Pressable style={styles.menuOption} onPress={() => { setShowMenuModal(false); setShowDateModal(true) }}>
              <Ionicons name="calendar-outline" size={20} color="#E8475E" />
              <Text style={[styles.menuOptionText, { color: '#E8475E' }]}>Propose a Date</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable style={styles.menuOption} onPress={handleUnmatch}>
              <Ionicons name="heart-dislike-outline" size={20} color="#DC2626" />
              <Text style={[styles.menuOptionText, { color: '#DC2626' }]}>Unmatch</Text>
            </Pressable>

            <Pressable style={styles.menuOption} onPress={handleBlock}>
              <Ionicons name="shield-outline" size={20} color="#DC2626" />
              <Text style={[styles.menuOptionText, { color: '#DC2626' }]}>Block & Report</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Fullscreen Photo Lightbox Modal */}
      {previewImage && (
        <Modal visible={Boolean(previewImage)} transparent animationType="fade">
          <View style={styles.lightboxBackdrop}>
            <Pressable style={styles.lightboxClose} onPress={() => setPreviewImage(null)}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </Pressable>
            <Image source={{ uri: previewImage }} style={styles.lightboxImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0EDEF', gap: 10 },
  backButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerPhoto: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F0EDEF' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  onlineText: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vowButton: { backgroundColor: '#FDDDE3', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  vowButtonText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  menuIconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF0ED', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FDDDE3' },
  dateBannerIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  dateBannerTitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  dateBannerSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
  emptyChatBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  emptyPartnerPhoto: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#E8475E', marginBottom: 6 },
  emptyMatchTitle: { fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', textAlign: 'center' },
  emptyMatchSub: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', textAlign: 'center', lineHeight: 22 },
  icebreakers: { gap: 8, width: '100%', marginTop: 8 },
  icebreakerPill: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F0EDEF' },
  icebreakerText: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#E8475E', textAlign: 'center' },
  messageList: { padding: 16, gap: 12, paddingBottom: 24 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowMine: { flexDirection: 'row-reverse' },
  messagAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F0EDEF' },
  messageBubble: { maxWidth: '75%', borderRadius: 20, overflow: 'hidden' },
  messageBubbleMine: { borderBottomRightRadius: 4 },
  messageBubbleOthers: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F0EDEF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  messageBubbleGradient: { padding: 12 },
  messageText: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', lineHeight: 22 },
  messageTextMine: { color: '#FFFFFF' },
  timeMine: { fontSize: 10, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'right' },
  timeOthers: { fontSize: 10, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', marginTop: 4, textAlign: 'right' },
  timeOnly: { fontSize: 10, paddingHorizontal: 8, paddingBottom: 4 },
  messageImage: { width: 220, height: 160, borderRadius: 16, marginBottom: 4 },
  dateCardWrapper: { marginVertical: 8, width: '85%' },
  dateCardMine: { alignSelf: 'flex-end' },
  dateCardOthers: { alignSelf: 'flex-start' },
  dateCardInner: { borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: '#FDDDE3', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  dateCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  dateCardEmoji: { fontSize: 28 },
  dateCardType: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E', textTransform: 'uppercase', letterSpacing: 0.6 },
  dateCardActivity: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  dateCardDetails: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10, gap: 6, marginBottom: 12 },
  dateDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateDetailText: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#1A1A2E' },
  dateCardActions: { marginTop: 4 },
  dateAcceptBtn: { backgroundColor: '#E8475E', paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  dateAcceptBtnText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  dateSentPill: { alignSelf: 'center', backgroundColor: '#FFF0ED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dateSentPillText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#E8475E' },
  dateCardTime: { fontSize: 10, color: '#A0A0B0', textAlign: 'right', marginTop: 8 },
  uploadingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF0ED' },
  uploadingBarText: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: '#E8475E' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0EDEF' },
  attachBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  dateActionBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0ED' },
  input: { flex: 1, backgroundColor: '#FFFBF9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', maxHeight: 100, borderWidth: 1.5, borderColor: '#F0EDEF' },
  sendButton: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dateModalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  modalSubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', marginTop: 2 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F4F2F3', alignItems: 'center', justifyContent: 'center' },
  pickerLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', marginBottom: 8 },
  activityList: { marginBottom: 16 },
  activityPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 10 },
  activityPillSelected: { backgroundColor: '#FDDDE3', borderColor: '#E8475E' },
  activityEmoji: { fontSize: 16 },
  activityLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#64748B' },
  activityLabelSelected: { color: '#E8475E', fontFamily: 'PlusJakartaSans_700Bold' },
  modalInput: { backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  timePillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  timePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  timePillSelected: { backgroundColor: '#FDDDE3', borderColor: '#E8475E' },
  timePillText: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: '#64748B' },
  timePillTextSelected: { color: '#E8475E', fontFamily: 'PlusJakartaSans_700Bold' },
  sendDateBtn: { borderRadius: 18, overflow: 'hidden' },
  sendDateGradient: { paddingVertical: 16, alignItems: 'center' },
  sendDateBtnText: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  profileModalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '80%' },
  fullProfilePhoto: { width: '100%', height: 280, borderRadius: 20, marginBottom: 16 },
  profileDetailsBox: { gap: 8 },
  profileFullName: { fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  profileCityText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B6B7B' },
  profileGoalBadge: { alignSelf: 'flex-start', backgroundColor: '#FDDDE3', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginVertical: 4 },
  profileGoalBadgeText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  profileBioBox: { backgroundColor: '#FFFBF9', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#F0EDEF' },
  profileBioText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#4A4A5A', lineHeight: 22 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  menuCard: { width: '100%', maxWidth: 320, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 8 },
  menuTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', marginBottom: 8 },
  menuOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  menuOptionText: { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E' },
  menuDivider: { height: 1, backgroundColor: '#F0EDEF', marginVertical: 4 },
  lightboxBackdrop: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  lightboxClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: '80%' },
})
