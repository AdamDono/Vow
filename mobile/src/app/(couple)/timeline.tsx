import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const MILESTONES = [
  { date: 'Feb 15, 2025', label: 'Matched on Vow', emoji: '💫', isFirst: true },
  { date: 'Feb 22, 2025', label: 'First message sent', emoji: '💬', isFirst: false },
  { date: 'Mar 10, 2025', label: 'Relationship started', emoji: '💍', isFirst: false },
  { date: 'Mar 28, 2025', label: '2 weeks together', emoji: '🌱', isFirst: false },
  { date: 'Apr 15, 2025', label: '1 month together', emoji: '🎉', isFirst: false },
  { date: 'Jun 01, 2025', label: 'Harmony Score hit 80%', emoji: '⭐', isFirst: false },
]

export default function TimelineScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Our Story</Text>
        <Text style={styles.subtitle}>Every milestone of your journey together</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {MILESTONES.map((milestone, index) => (
          <View key={index} style={styles.milestoneRow}>
            {/* Timeline line */}
            <View style={styles.lineCol}>
              <View style={[styles.dot, milestone.isFirst && styles.dotFirst]}>
                <Text style={styles.dotEmoji}>{milestone.emoji}</Text>
              </View>
              {index < MILESTONES.length - 1 && <View style={styles.line} />}
            </View>

            {/* Content */}
            <View style={styles.milestoneContent}>
              <Text style={styles.milestoneDate}>{milestone.date}</Text>
              <Text style={styles.milestoneLabel}>{milestone.label}</Text>
            </View>
          </View>
        ))}

        {/* Add future milestone */}
        <View style={styles.addMilestone}>
          <Text style={styles.addMilestoneText}>+ Add a milestone</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24 },
  title: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.6, marginBottom: 4 },
  subtitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  milestoneRow: { flexDirection: 'row', gap: 16, marginBottom: 0 },
  lineCol: { alignItems: 'center', width: 48 },
  dot: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0E6FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E8DAFF', zIndex: 1 },
  dotFirst: { backgroundColor: '#FDDDE3', borderColor: '#FBBBC8' },
  dotEmoji: { fontSize: 22 },
  line: { width: 2, flex: 1, backgroundColor: '#F0EDEF', minHeight: 32, marginVertical: 4 },
  milestoneContent: { flex: 1, paddingTop: 10, paddingBottom: 28 },
  milestoneDate: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', marginBottom: 4 },
  milestoneLabel: { fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E' },
  addMilestone: { marginLeft: 64, paddingVertical: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#F0EDEF', borderStyle: 'dashed', alignItems: 'center' },
  addMilestoneText: { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#C9A0F4' },
})
