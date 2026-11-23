import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
  Image,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { api } from '../../lib/api'

interface MilestoneItem {
  id: string
  eventDate: string
  title: string
  description?: string
  photoUrl?: string | null
}

interface GoalItem {
  id: string
  title: string
  description?: string
  targetDate?: string | null
  isCompleted: boolean
}

export default function TimelineScreen() {
  const [activeTab, setActiveTab] = useState<'memories' | 'goals'>('memories')
  const [milestones, setMilestones] = useState<MilestoneItem[]>([])
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Add Milestone Modal
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [mTitle, setMTitle] = useState('')
  const [mDesc, setMDesc] = useState('')
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0])
  const [mPhotoUrl, setMPhotoUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [savingMilestone, setSavingMilestone] = useState(false)

  // Add Goal Modal
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [gTitle, setGTitle] = useState('')
  const [gDesc, setGDesc] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [timelineRes, goalsRes] = await Promise.all([
        api.couples.getTimeline().catch(() => ({ milestones: [] })),
        api.couples.getGoals().catch(() => ({ goals: [] })),
      ])
      setMilestones(timelineRes.milestones || [])
      setGoals(goalsRes.goals || [])
    } catch (err) {
      console.warn('Error loading couple story:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData])
  )

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const handlePickMilestonePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow photo library access.')
        return
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      })
      if (res.canceled || !res.assets?.[0]) return

      const asset = res.assets[0]
      setUploadingPhoto(true)
      if (asset.base64) {
        const mime = asset.mimeType || 'image/jpeg'
        const uploadRes = await api.upload.photo(`data:${mime};base64,${asset.base64}`)
        if (uploadRes?.url) setMPhotoUrl(uploadRes.url)
      } else {
        setMPhotoUrl(asset.uri)
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSaveMilestone = async () => {
    if (!mTitle.trim()) {
      Alert.alert('Title Required', 'Give this memory a short title.')
      return
    }
    setSavingMilestone(true)
    try {
      const res = await api.couples.createMilestone({
        title: mTitle.trim(),
        description: mDesc.trim(),
        eventDate: mDate.trim(),
        photoUrl: mPhotoUrl || undefined,
      })
      if (res?.milestone) {
        setMilestones((prev) => [res.milestone, ...prev])
      }
      setMTitle('')
      setMDesc('')
      setMPhotoUrl(null)
      setMDate(new Date().toISOString().split('T')[0])
      setShowMilestoneModal(false)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save milestone.')
    } finally {
      setSavingMilestone(false)
    }
  }

  const handleSaveGoal = async () => {
    if (!gTitle.trim()) {
      Alert.alert('Title Required', 'Enter a shared vow or relationship goal.')
      return
    }
    setSavingGoal(true)
    try {
      const res = await api.couples.createGoal({
        title: gTitle.trim(),
        description: gDesc.trim(),
      })
      if (res?.goal) {
        setGoals((prev) => [res.goal, ...prev])
      }
      setGTitle('')
      setGDesc('')
      setShowGoalModal(false)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save shared goal.')
    } finally {
      setSavingGoal(false)
    }
  }

  const handleToggleGoal = async (goal: GoalItem) => {
    const nextState = !goal.isCompleted
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, isCompleted: nextState } : g)))
    try {
      await api.couples.toggleGoal(goal.id, nextState)
    } catch {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, isCompleted: goal.isCompleted } : g)))
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId))
    try {
      await api.couples.deleteGoal(goalId)
    } catch {
      loadData()
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const completedCount = goals.filter((g) => g.isCompleted).length

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Our Story</Text>
        <Text style={styles.subtitle}>Shared memories, milestones & vows together</Text>

        {/* Segmented Control */}
        <View style={styles.segmentWrap}>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'memories' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('memories')}
          >
            <Text style={[styles.segmentText, activeTab === 'memories' && styles.segmentTextActive]}>
              📅 Memory Vault ({milestones.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'goals' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('goals')}
          >
            <Text style={[styles.segmentText, activeTab === 'goals' && styles.segmentTextActive]}>
              💍 Shared Vows ({completedCount}/{goals.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#E8475E" size="large" />
          <Text style={styles.loadingText}>Loading your story...</Text>
        </View>
      ) : activeTab === 'memories' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8475E" />}
        >
          {milestones.map((milestone, index) => {
            const isVowDay = milestone.title.toLowerCase().includes('vow')
            return (
              <View key={milestone.id || index} style={styles.milestoneRow}>
                <View style={styles.lineCol}>
                  <View style={[styles.dot, isVowDay && styles.dotFirst]}>
                    {isVowDay ? (
                      <Text style={styles.dotEmoji}>💍</Text>
                    ) : (
                      <Ionicons name="heart" size={20} color="#E8475E" />
                    )}
                  </View>
                  {index < milestones.length - 1 && <View style={styles.line} />}
                </View>

                <View style={styles.milestoneContent}>
                  <Text style={styles.milestoneDate}>{formatDate(milestone.eventDate)}</Text>
                  <Text style={styles.milestoneLabel}>{milestone.title}</Text>
                  {milestone.description ? (
                    <Text style={styles.milestoneDesc}>{milestone.description}</Text>
                  ) : null}
                  {milestone.photoUrl ? (
                    <Image source={{ uri: milestone.photoUrl }} style={styles.milestonePhoto} resizeMode="cover" />
                  ) : null}
                </View>
              </View>
            )
          })}

          <Pressable style={styles.addMilestone} onPress={() => setShowMilestoneModal(true)}>
            <Ionicons name="add-circle-outline" size={20} color="#7C3AED" />
            <Text style={styles.addMilestoneText}>Add a Memory Milestone</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8475E" />}
        >
          {goals.length === 0 ? (
            <View style={styles.emptyGoalsBox}>
              <Text style={{ fontSize: 44 }}>💍</Text>
              <Text style={styles.emptyGoalsTitle}>Set Your First Shared Vow</Text>
              <Text style={styles.emptyGoalsSub}>
                Track promises, trips, date rituals, and relationship goals you want to build together.
              </Text>
            </View>
          ) : (
            goals.map((goal) => (
              <View key={goal.id} style={[styles.goalCard, goal.isCompleted && styles.goalCardDone]}>
                <Pressable style={styles.goalCheck} onPress={() => handleToggleGoal(goal)}>
                  <Ionicons
                    name={goal.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                    color={goal.isCompleted ? '#16A34A' : '#C9A0F4'}
                  />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalTitle, goal.isCompleted && styles.goalTitleDone]}>
                    {goal.title}
                  </Text>
                  {goal.description ? <Text style={styles.goalDesc}>{goal.description}</Text> : null}
                </View>
                <Pressable style={styles.goalDelete} onPress={() => handleDeleteGoal(goal.id)}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </Pressable>
              </View>
            ))
          )}

          <Pressable style={[styles.addMilestone, { marginLeft: 0 }]} onPress={() => setShowGoalModal(true)}>
            <Ionicons name="add-circle-outline" size={20} color="#7C3AED" />
            <Text style={styles.addMilestoneText}>Add Shared Vow / Goal</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Add Milestone Modal */}
      <Modal visible={showMilestoneModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="bookmark" size={20} color="#E8475E" />
                <Text style={styles.modalTitle}>New Memory Milestone</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setShowMilestoneModal(false)}>
                <Ionicons name="close" size={20} color="#1A1A2E" />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. First Weekend Getaway"
              placeholderTextColor="#A0A0B0"
              value={mTitle}
              onChangeText={setMTitle}
            />

            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="2026-11-20"
              placeholderTextColor="#A0A0B0"
              value={mDate}
              onChangeText={setMDate}
            />

            <Text style={styles.fieldLabel}>Story / Note</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="What made this moment special?"
              placeholderTextColor="#A0A0B0"
              value={mDesc}
              onChangeText={setMDesc}
              multiline
            />

            <Pressable style={styles.photoPickerBtn} onPress={handlePickMilestonePhoto} disabled={uploadingPhoto}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#7C3AED" />
              ) : mPhotoUrl ? (
                <View style={styles.pickedPhotoRow}>
                  <Image source={{ uri: mPhotoUrl }} style={styles.pickedThumb} />
                  <Text style={styles.photoPickerText}>Photo attached ✓ (Tap to change)</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="image-outline" size={18} color="#7C3AED" />
                  <Text style={styles.photoPickerText}>Attach Memory Photo (Optional)</Text>
                </>
              )}
            </Pressable>

            <Pressable style={styles.saveBtn} onPress={handleSaveMilestone} disabled={savingMilestone || uploadingPhoto}>
              {savingMilestone ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save to Memory Vault</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add Shared Goal Modal */}
      <Modal visible={showGoalModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💍 New Shared Vow / Goal</Text>
              <Pressable style={styles.modalClose} onPress={() => setShowGoalModal(false)}>
                <Ionicons name="close" size={20} color="#1A1A2E" />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Shared Goal or Promise</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Phone-free Sunday dinners every week"
              placeholderTextColor="#A0A0B0"
              value={gTitle}
              onChangeText={setGTitle}
            />

            <Text style={styles.fieldLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Why this matters to both of us..."
              placeholderTextColor="#A0A0B0"
              value={gDesc}
              onChangeText={setGDesc}
              multiline
            />

            <Pressable style={styles.saveBtn} onPress={handleSaveGoal} disabled={savingGoal}>
              {savingGoal ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Add Shared Vow</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#8E8E9E', marginBottom: 16 },
  segmentWrap: { flexDirection: 'row', backgroundColor: '#F4EFF6', borderRadius: 14, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  segmentText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#7B748A' },
  segmentTextActive: { color: '#7C3AED', fontFamily: 'DMSans_700Bold', fontWeight: '700' },
  loadingBox: { padding: 48, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110, paddingTop: 6 },
  milestoneRow: { flexDirection: 'row', gap: 16 },
  lineCol: { alignItems: 'center', width: 48 },
  dot: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0E6FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E8DAFF', zIndex: 1 },
  dotFirst: { backgroundColor: '#FDDDE3', borderColor: '#FBBBC8' },
  dotEmoji: { fontSize: 22 },
  line: { width: 2, flex: 1, backgroundColor: '#F0EDEF', minHeight: 32, marginVertical: 4 },
  milestoneContent: { flex: 1, paddingTop: 6, paddingBottom: 24 },
  milestoneDate: { fontSize: 12, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#A0A0B0', marginBottom: 2 },
  milestoneLabel: { fontSize: 16, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  milestoneDesc: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', lineHeight: 19 },
  milestonePhoto: { width: '100%', height: 170, borderRadius: 16, marginTop: 10 },
  addMilestone: { marginLeft: 64, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#DEC9FC', borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, backgroundColor: '#FAF6FF' },
  addMilestoneText: { fontSize: 14, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#7C3AED' },
  emptyGoalsBox: { alignItems: 'center', padding: 28, gap: 10, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#F0EDEF', marginBottom: 16 },
  emptyGoalsTitle: { fontSize: 18, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  emptyGoalsSub: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', textAlign: 'center', lineHeight: 20 },
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F0EDEF' },
  goalCardDone: { backgroundColor: '#F7FDF9', borderColor: '#BBF7D0' },
  goalCheck: { padding: 2 },
  goalTitle: { fontSize: 15, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  goalTitleDone: { textDecorationLine: 'line-through', color: '#6B7280' },
  goalDesc: { fontSize: 12, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', marginTop: 3 },
  goalDelete: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 38 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 20, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F4F2F3', alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 13, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  fieldInput: { backgroundColor: '#FFFBF9', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#1A1A2E', borderWidth: 1, borderColor: '#EBE4E8', marginBottom: 14 },
  photoPickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FAF6FF', borderWidth: 1, borderColor: '#DEC9FC', borderRadius: 14, paddingVertical: 12, marginBottom: 18 },
  photoPickerText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#7C3AED' },
  pickedPhotoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickedThumb: { width: 32, height: 32, borderRadius: 8 },
  saveBtn: { borderRadius: 16, backgroundColor: '#E8475E', paddingVertical: 16, alignItems: 'center', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
  saveBtnText: { fontSize: 15, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
})
