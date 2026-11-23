import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { api } from '../../lib/api'

interface CoupleMessage {
  id: string
  conversationId: string
  senderId: string
  text: string
  mediaUrl?: string | null
  createdAt?: string
}

export default function CoupleChatScreen() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [selfId, setSelfId] = useState<string | null>(null)
  const [partner, setPartner] = useState<{ name: string; photo?: string | null }>({ name: 'Partner' })
  const [messages, setMessages] = useState<CoupleMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const flatListRef = useRef<FlatList>(null)

  const loadCoupleChat = useCallback(async () => {
    try {
      const dash = await api.couples.getDashboard()
      if (dash?.self?.id) setSelfId(dash.self.id)
      if (dash?.partner) setPartner(dash.partner)
      if (dash?.conversationId) {
        setConversationId(dash.conversationId)
        const msgRes = await api.chat.getMessages(dash.conversationId).catch(() => ({ messages: [] }))
        if (msgRes?.messages) setMessages(msgRes.messages)
      }
    } catch (err) {
      console.warn('Could not load couple chat:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadCoupleChat()
    }, [loadCoupleChat])
  )

  useEffect(() => {
    if (!conversationId) return
    const interval = setInterval(() => {
      api.chat
        .getMessages(conversationId)
        .then((res) => {
          if (res?.messages) setMessages(res.messages)
        })
        .catch(() => {})
    }, 4000)
    return () => clearInterval(interval)
  }, [conversationId])

  const handleSend = async (customText?: string, mediaUrl?: string) => {
    const textToSend = customText !== undefined ? customText : input.trim()
    if ((!textToSend && !mediaUrl) || !conversationId || sending) return

    if (!customText && !mediaUrl) setInput('')
    setSending(true)

    const tempId = `temp_${Date.now()}`
    const optimistic: CoupleMessage = {
      id: tempId,
      conversationId,
      senderId: selfId || 'me',
      text: textToSend || '📷 Photo',
      mediaUrl: mediaUrl || null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await api.chat.sendMessage(conversationId, textToSend || '📷 Photo', mediaUrl)
      if (res?.message) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? res.message : m)))
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      if (!customText && !mediaUrl) setInput(textToSend)
    } finally {
      setSending(false)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow photo library access to share photos.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      })
      if (result.canceled || !result.assets?.[0]) return

      const asset = result.assets[0]
      setUploadingPhoto(true)
      let url = asset.uri
      if (asset.base64) {
        const mime = asset.mimeType || 'image/jpeg'
        const uploadRes = await api.upload.photo(`data:${mime};base64,${asset.base64}`)
        if (uploadRes?.url) url = uploadRes.url
      }
      await handleSend('', url)
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return 'Now'
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        {partner.photo ? (
          <Image source={{ uri: partner.photo }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{(partner.name?.[0] || 'P').toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{partner.name}</Text>
          <View style={styles.badgeRow}>
            <Ionicons name="lock-closed" size={11} color="#7C3AED" />
            <Text style={styles.headerSub}>Private Vow Channel</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C9A0F4" />
          <Text style={styles.loadingText}>Opening your private chat...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={{ fontSize: 48 }}>💌</Text>
          <Text style={styles.emptyTitle}>Your Private Couple Space</Text>
          <Text style={styles.emptySub}>
            Just you and {partner.name}. Share daily moments, love notes, and date night ideas here.
          </Text>
          <View style={styles.quickPrompts}>
            {[
              'Thinking of you today ♥',
              'What should we cook or plan for date night? 🍷',
              'Grateful to be on this journey with you 💍',
            ].map((text) => (
              <Pressable key={text} style={styles.quickPill} onPress={() => handleSend(text)}>
                <Text style={styles.quickPillText}>{text}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMine = item.senderId === selfId || item.senderId === 'me'
            return (
              <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
                <View style={[styles.bubble, isMine && styles.bubbleMine]}>
                  {item.mediaUrl ? (
                    <Pressable onPress={() => setPreviewImage(item.mediaUrl || null)}>
                      <Image source={{ uri: item.mediaUrl }} style={styles.msgImage} resizeMode="cover" />
                    </Pressable>
                  ) : null}
                  {item.text && item.text !== '📷 Photo' ? (
                    isMine ? (
                      <View style={styles.bubbleGradient}>
                        <Text style={styles.msgTextMine}>{item.text}</Text>
                        <Text style={styles.timeMine}>{formatTime(item.createdAt)}</Text>
                      </View>
                    ) : (
                      <View style={styles.bubbleOther}>
                        <Text style={styles.msgTextOther}>{item.text}</Text>
                        <Text style={styles.timeOther}>{formatTime(item.createdAt)}</Text>
                      </View>
                    )
                  ) : null}
                </View>
              </View>
            )
          }}
        />
      )}

      {uploadingPhoto && (
        <View style={styles.uploadingBar}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.uploadingText}>Uploading photo...</Text>
        </View>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        <Pressable style={styles.photoBtn} onPress={handlePickPhoto} disabled={uploadingPhoto || sending}>
          <Ionicons name="camera-outline" size={22} color="#7C3AED" />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder={`Message ${partner.name}...`}
          placeholderTextColor="#A0A0B0"
          value={input}
          onChangeText={setInput}
          multiline
          onSubmitEditing={() => handleSend()}
        />
        <Pressable
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {previewImage && (
        <Modal visible transparent animationType="fade">
          <View style={styles.lightbox}>
            <Pressable style={styles.lightboxClose} onPress={() => setPreviewImage(null)}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </Pressable>
            <Image source={{ uri: previewImage }} style={styles.lightboxImg} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 58, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0EDEF' },
  headerAvatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0E6FF', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 18, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#7C3AED' },
  headerName: { fontSize: 18, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  headerSub: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#7C3AED' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#6B6B7B' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  emptyTitle: { fontSize: 21, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  emptySub: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', textAlign: 'center', lineHeight: 22 },
  quickPrompts: { width: '100%', gap: 8, marginTop: 10 },
  quickPill: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#E8DAFF' },
  quickPillText: { fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#7C3AED', textAlign: 'center' },
  listContent: { padding: 16, gap: 10, paddingBottom: 24 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end' },
  msgRowMine: { flexDirection: 'row-reverse' },
  bubble: { maxWidth: '78%', borderRadius: 20, overflow: 'hidden' },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleGradient: { padding: 12, backgroundColor: '#E8475E' },
  bubbleOther: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F0EDEF' },
  msgTextMine: { fontSize: 15, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#FFFFFF', lineHeight: 22 },
  msgTextOther: { fontSize: 15, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#1A1A2E', lineHeight: 22 },
  timeMine: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 4, textAlign: 'right' },
  timeOther: { fontSize: 10, color: '#A0A0B0', marginTop: 4, textAlign: 'right' },
  msgImage: { width: 220, height: 160, borderRadius: 16, marginBottom: 4 },
  uploadingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F5EEFF' },
  uploadingText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#7C3AED' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, paddingBottom: 14, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0EDEF' },
  photoBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5EEFF', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: '#FFFBF9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#1A1A2E', maxHeight: 100, borderWidth: 1.5, borderColor: '#F0EDEF' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8475E', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#E0D8DA' },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  lightboxClose: { position: 'absolute', top: 56, right: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  lightboxImg: { width: '100%', height: '80%' },
})
