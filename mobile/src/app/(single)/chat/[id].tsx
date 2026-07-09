import { View, Text, StyleSheet, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, Image } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'

const MATCH = {
  id: '1',
  name: 'Sarah',
  age: 24,
  photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
}

const INITIAL_MESSAGES = [
  { id: '1', text: 'Hey! I loved your profile 😊', mine: false, time: '10:30 AM' },
  { id: '2', text: 'Thank you! Yours too, especially the travel photos!', mine: true, time: '10:32 AM' },
  { id: '3', text: 'Ha! I just got back from Lisbon, it was amazing 🌊', mine: false, time: '10:33 AM' },
]

export default function ChatScreen() {
  const { id } = useLocalSearchParams()
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')

  const sendMessage = () => {
    if (!input.trim()) return
    setMessages((prev) => [...prev, { id: Date.now().toString(), text: input.trim(), mine: true, time: 'Now' }])
    setInput('')
    // TODO: send via Supabase realtime
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
        </Pressable>
        <Image source={{ uri: MATCH.photo }} style={styles.headerPhoto} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{MATCH.name}, {MATCH.age}</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online now</Text>
          </View>
        </View>
        {/* Propose Relationship Button */}
        <Pressable style={styles.vowButton} onPress={() => router.push('/proposal')}>
          <Text style={styles.vowButtonText}>💍 Send Vow</Text>
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.mine && styles.messageRowMine]}>
            {!item.mine && <Image source={{ uri: MATCH.photo }} style={styles.messagAvatar} />}
            <View style={[styles.messageBubble, item.mine && styles.messageBubbleMine]}>
              {item.mine ? (
                <LinearGradient colors={['#E8475E', '#C73350']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.messageBubbleGradient}>
                  <Text style={[styles.messageText, styles.messageTextMine]}>{item.text}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.messageText}>{item.text}</Text>
              )}
            </View>
          </View>
        )}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Write a message..."
          placeholderTextColor="#A0A0B0"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]} onPress={sendMessage} disabled={!input.trim()}>
          <LinearGradient colors={input.trim() ? ['#E8475E', '#C73350'] : ['#E0D8DA', '#CFC8CB']} style={styles.sendButtonGradient}>
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0EDEF', gap: 10 },
  backButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerPhoto: { width: 42, height: 42, borderRadius: 21 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  onlineText: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  vowButton: { backgroundColor: '#FDDDE3', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  vowButtonText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  messageList: { padding: 16, gap: 12 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowMine: { flexDirection: 'row-reverse' },
  messagAvatar: { width: 30, height: 30, borderRadius: 15 },
  messageBubble: { maxWidth: '72%', backgroundColor: '#FFFFFF', borderRadius: 20, borderBottomLeftRadius: 4, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  messageBubbleMine: { borderBottomLeftRadius: 20, borderBottomRightRadius: 4 },
  messageBubbleGradient: { padding: 12 },
  messageText: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', padding: 12, lineHeight: 22 },
  messageTextMine: { color: '#FFFFFF', padding: 0 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0EDEF' },
  input: { flex: 1, backgroundColor: '#FFFBF9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#1A1A2E', maxHeight: 100, borderWidth: 1.5, borderColor: '#F0EDEF' },
  sendButton: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden' },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
})
