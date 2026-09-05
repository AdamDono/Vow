import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native'
import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

interface MilestoneItem {
  id?: string
  date: string
  label: string
  emoji: string
  isFirst: boolean
  description?: string
}

export default function TimelineScreen() {
  const [milestones, setMilestones] = useState<MilestoneItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadMilestones = async () => {
    setLoading(true)
    try {
      const res = await api.couples.getTimeline()
      if (res.milestones && res.milestones.length > 0) {
        const mapped: MilestoneItem[] = res.milestones.map((m: any, idx: number) => ({
          id: m.id,
          date: new Date(m.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          label: m.title,
          description: m.description,
          emoji: idx === 0 ? '💍' : '💫',
          isFirst: idx === 0,
        }))
        setMilestones(mapped)
      } else {
        setMilestones([
          { date: 'Feb 14, 2024', label: 'Official Vow Commitment', emoji: '💍', isFirst: true, description: 'Accepted our Vow Proposal and entered Couples Mode.' },
          { date: 'Jun 20, 2024', label: 'First Road Trip to Franschhoek', emoji: '🍷', isFirst: false, description: 'Wine tasting, cozy cabin evening, and endless laughing.' },
        ])
      }
    } catch (err) {
      console.warn('Fallback timeline data:', err)
      setMilestones([
        { date: 'Feb 14, 2024', label: 'Official Vow Commitment', emoji: '💍', isFirst: true, description: 'Accepted our Vow Proposal and entered Couples Mode.' },
        { date: 'Jun 20, 2024', label: 'First Road Trip to Franschhoek', emoji: '🍷', isFirst: false, description: 'Wine tasting, cozy cabin evening, and endless laughing.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMilestones()
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Our Story</Text>
        <Text style={styles.subtitle}>Every milestone of your journey together</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#E8475E" />
          <Text style={styles.loadingText}>Loading memory book...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {milestones.map((milestone, index) => (
            <View key={milestone.id || index} style={styles.milestoneRow}>
              {/* Timeline line */}
              <View style={styles.lineCol}>
                <View style={[styles.dot, milestone.isFirst && styles.dotFirst]}>
                  <Text style={styles.dotEmoji}>{milestone.emoji}</Text>
                </View>
                {index < milestones.length - 1 && <View style={styles.line} />}
              </View>

              {/* Content */}
              <View style={styles.milestoneContent}>
                <Text style={styles.milestoneDate}>{milestone.date}</Text>
                <Text style={styles.milestoneLabel}>{milestone.label}</Text>
                {milestone.description ? (
                  <Text style={styles.milestoneDesc}>{milestone.description}</Text>
                ) : null}
              </View>
            </View>
          ))}

          {/* Add future milestone */}
          <Pressable style={styles.addMilestone}>
            <Text style={styles.addMilestoneText}>+ Add a milestone</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.6, marginBottom: 4 },
  subtitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0' },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  milestoneRow: { flexDirection: 'row', gap: 16, marginBottom: 0 },
  lineCol: { alignItems: 'center', width: 48 },
  dot: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0E6FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E8DAFF', zIndex: 1 },
  dotFirst: { backgroundColor: '#FDDDE3', borderColor: '#FBBBC8' },
  dotEmoji: { fontSize: 22 },
  line: { width: 2, flex: 1, backgroundColor: '#F0EDEF', minHeight: 32, marginVertical: 4 },
  milestoneContent: { flex: 1, paddingTop: 10, paddingBottom: 24 },
  milestoneDate: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', marginBottom: 2 },
  milestoneLabel: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', marginBottom: 4 },
  milestoneDesc: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', lineHeight: 18 },
  addMilestone: { marginLeft: 64, paddingVertical: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#F0EDEF', borderStyle: 'dashed', alignItems: 'center', marginTop: 8 },
  addMilestoneText: { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#C9A0F4' },
})
