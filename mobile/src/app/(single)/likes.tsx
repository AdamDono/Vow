import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const MOCK_LIKES = [
  { id: '1', name: 'Priya', age: 25, photo: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300&q=80', superLike: false },
  { id: '2', name: 'Leila', age: 23, photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&q=80', superLike: true },
  { id: '3', name: 'Zoe', age: 28, photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80', superLike: false },
  { id: '4', name: 'Nia', age: 27, photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&q=80', superLike: false },
]

export default function LikesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Likes</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{MOCK_LIKES.length}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>People who liked your profile. Like them back to match!</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {MOCK_LIKES.map((profile) => (
          <Pressable key={profile.id} style={styles.likeCard}>
            <View style={styles.photoWrapper}>
              <Image source={{ uri: profile.photo }} style={styles.photo} resizeMode="cover" />
              {profile.superLike && (
                <View style={styles.superLikeBadge}>
                  <Ionicons name="star" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
            <Text style={styles.profileName}>{profile.name}, {profile.age}</Text>
            <Pressable style={styles.likeBackButton}>
              <Ionicons name="heart" size={18} color="#E8475E" />
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 6 },
  title: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.6 },
  countBadge: { backgroundColor: '#FDDDE3', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  subtitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', paddingHorizontal: 20, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 20, paddingBottom: 100 },
  likeCard: { width: '46%', borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFFFFF', shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  photoWrapper: { width: '100%', aspectRatio: 3 / 4, position: 'relative' },
  photo: { width: '100%', height: '100%' },
  superLikeBadge: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: '#C9A0F4', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', paddingHorizontal: 12, paddingTop: 10 },
  likeBackButton: { margin: 10, padding: 10, alignSelf: 'flex-end', backgroundColor: '#FDDDE3', borderRadius: 20 },
})
