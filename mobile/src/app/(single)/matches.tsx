import { View, Text, StyleSheet, ScrollView, Image, Pressable, TextInput } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const MOCK_MATCHES = [
  { id: '1', name: 'Sarah', age: 24, photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80', lastMessage: 'Hey! How are you? 😊', time: '2m', unread: 2 },
  { id: '2', name: 'Amara', age: 26, photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80', lastMessage: 'That sounds amazing!', time: '1h', unread: 0 },
  { id: '3', name: 'Zoe', age: 28, photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80', lastMessage: 'Matched just now', time: '3h', unread: 1 },
]

const NEW_MATCHES = [
  { id: '4', name: 'Priya', photo: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&q=80' },
  { id: '5', name: 'Leila', photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&q=80' },
]

export default function MatchesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
        <Ionicons name="notifications-outline" size={24} color="#1A1A2E" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* New matches row */}
        <Text style={styles.sectionLabel}>New Matches</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newMatchesRow}>
          {NEW_MATCHES.map((m) => (
            <View key={m.id} style={styles.newMatchItem}>
              <View style={styles.newMatchPhotoWrapper}>
                <Image source={{ uri: m.photo }} style={styles.newMatchPhoto} resizeMode="cover" />
                <View style={styles.newMatchOnline} />
              </View>
              <Text style={styles.newMatchName}>{m.name}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Conversations */}
        <Text style={styles.sectionLabel}>Messages</Text>
        {MOCK_MATCHES.map((match) => (
          <Pressable
            key={match.id}
            style={styles.matchRow}
            onPress={() => router.push(`/(single)/chat/${match.id}`)}
          >
            <View style={styles.matchPhotoWrapper}>
              <Image source={{ uri: match.photo }} style={styles.matchPhoto} resizeMode="cover" />
            </View>
            <View style={styles.matchInfo}>
              <View style={styles.matchNameRow}>
                <Text style={styles.matchName}>{match.name}, {match.age}</Text>
                <Text style={styles.matchTime}>{match.time}</Text>
              </View>
              <Text style={[styles.matchLastMessage, match.unread > 0 && styles.matchLastMessageUnread]} numberOfLines={1}>
                {match.lastMessage}
              </Text>
            </View>
            {match.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{match.unread}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.6 },
  scrollContent: { paddingBottom: 100 },
  sectionLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#A0A0B0', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 14 },
  newMatchesRow: { paddingLeft: 20, marginBottom: 28 },
  newMatchItem: { alignItems: 'center', marginRight: 16 },
  newMatchPhotoWrapper: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 2.5, borderColor: '#E8475E', position: 'relative' },
  newMatchPhoto: { width: '100%', height: '100%' },
  newMatchOnline: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4ADE80', borderWidth: 2, borderColor: '#FFFFFF' },
  newMatchName: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E', marginTop: 6 },
  matchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  matchPhotoWrapper: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  matchPhoto: { width: '100%', height: '100%' },
  matchInfo: { flex: 1 },
  matchNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  matchName: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E' },
  matchTime: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0' },
  matchLastMessage: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0' },
  matchLastMessageUnread: { fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E' },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E8475E', alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
})
