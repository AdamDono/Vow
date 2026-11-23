import { View, Text, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator, Alert } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState, useCallback } from 'react'
import { api, setAuthToken } from '../../lib/api'

const SETTINGS = [
  { icon: 'notifications-outline', label: 'Daily Check-In Reminders', sub: 'Double-blind evening nudge at 8:00 PM' },
  { icon: 'shield-checkmark-outline', label: 'Privacy & Double-Blind Lock', sub: 'Reflections stay sealed until both submit' },
  { icon: 'heart-circle-outline', label: 'Platform History', sub: 'Verified commitment timeline & trust record' },
]

export default function CoupleSettingsScreen() {
  const [partnerName, setPartnerName] = useState('your partner')
  const [anniversary, setAnniversary] = useState<string | null>(null)
  const [daysTogether, setDaysTogether] = useState<number>(1)
  const [showEndModal, setShowEndModal] = useState(false)
  const [respectRating, setRespectRating] = useState<number>(5)
  const [ending, setEnding] = useState(false)

  useFocusEffect(
    useCallback(() => {
      api.couples
        .getDashboard()
        .then((dash) => {
          if (dash?.partner?.name) setPartnerName(dash.partner.name)
          if (dash?.anniversaryDate) setAnniversary(dash.anniversaryDate)
          if (dash?.daysTogether) setDaysTogether(dash.daysTogether)
        })
        .catch(() => {})
    }, [])
  )

  const handleLogout = () => {
    setAuthToken(null)
    router.replace('/(auth)/login')
  }

  const handleConfirmEndRelationship = async () => {
    setEnding(true)
    try {
      await api.couples.endRelationship({ respectRating })
      setShowEndModal(false)
      router.replace('/(single)/discover')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not end relationship. Please try again.')
    } finally {
      setEnding(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Couple Settings</Text>
      </View>

      {/* Active Vow Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryEyebrow}>ACTIVE VOW COMMITMENT</Text>
        <Text style={styles.summaryTitle}>Committed with {partnerName}</Text>
        <Text style={styles.summaryMeta}>
          💍 {daysTogether} {daysTogether === 1 ? 'day' : 'days'} together
          {anniversary ? ` • Since ${anniversary}` : ''}
        </Text>
      </View>

      {/* Settings items */}
      <View style={styles.section}>
        {SETTINGS.map((item, i) => (
          <Pressable
            key={i}
            style={[styles.settingRow, i < SETTINGS.length - 1 && styles.settingRowBorder]}
            onPress={() => Alert.alert(item.label, item.sub)}
          >
            <View style={styles.settingIcon}>
              <Ionicons name={item.icon as any} size={20} color="#7C3AED" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{item.label}</Text>
              <Text style={styles.settingSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#A0A0B0" />
          </Pressable>
        ))}
      </View>

      {/* Logout Action Button */}
      <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Log Out of Account</Text>
        </Pressable>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={styles.dangerTitle}>Relationship Lifecycle</Text>
        <Pressable style={styles.dangerButton} onPress={() => setShowEndModal(true)}>
          <Ionicons name="heart-dislike-outline" size={20} color="#E8475E" />
          <Text style={styles.dangerButtonText}>End Relationship on Vow</Text>
          <Ionicons name="chevron-forward" size={16} color="#A0A0B0" />
        </Pressable>
        <Text style={styles.dangerNote}>
          Ending your relationship respectfully returns both of you to Single Mode. Your verified relationship duration is preserved anonymously in your Vow Platform History.
        </Text>
      </View>

      {/* End Relationship Modal with Mutual Respect Rating */}
      <Modal visible={showEndModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🕊️</Text>
            <Text style={styles.modalTitle}>End Vow with {partnerName}?</Text>
            <Text style={styles.modalDesc}>
              Both of you will return to Single Mode. Before closing this chapter, rate the mutual respect shown during your relationship (kept private & anonymous).
            </Text>

            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRespectRating(star)} style={styles.starBtn}>
                  <Ionicons
                    name={star <= respectRating ? 'star' : 'star-outline'}
                    size={30}
                    color={star <= respectRating ? '#E8475E' : '#D4CCD0'}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingLabel}>Mutual Respect Rating: {respectRating} / 5</Text>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setShowEndModal(false)} disabled={ending}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmBtn}
                onPress={handleConfirmEndRelationship}
                disabled={ending}
              >
                {ending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Return to Single Mode</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  content: { paddingBottom: 110 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  title: { fontSize: 28, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.3 },
  summaryCard: { marginHorizontal: 20, marginBottom: 22, backgroundColor: '#F5EEFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#DEC9FC', gap: 4 },
  summaryEyebrow: { fontSize: 10, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#7C3AED', letterSpacing: 0.9 },
  summaryTitle: { fontSize: 18, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  summaryMeta: { fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#6B6B7B', marginTop: 2 },
  section: { marginHorizontal: 20, marginBottom: 28, backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F0EDEF' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0EDEF' },
  settingIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F0E6FF', alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#1A1A2E' },
  settingSub: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#A0A0B0', marginTop: 2 },
  dangerTitle: { fontSize: 12, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#A0A0B0', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 16 },
  dangerButton: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  dangerButtonText: { flex: 1, fontSize: 15, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#E8475E' },
  dangerNote: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#A0A0B0', paddingHorizontal: 16, paddingBottom: 16, lineHeight: 20 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 16, paddingVertical: 16, borderWidth: 1.5, borderColor: '#FECACA' },
  logoutBtnText: { fontSize: 16, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#DC2626' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 26, padding: 24, alignItems: 'center', gap: 10 },
  modalEmoji: { fontSize: 44 },
  modalTitle: { fontSize: 21, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  modalDesc: { fontSize: 13, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', textAlign: 'center', lineHeight: 20 },
  ratingRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  starBtn: { padding: 4 },
  ratingLabel: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#E8475E', marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 6 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F4F2F3', alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B' },
  modalConfirmBtn: { flex: 1.4, paddingVertical: 14, borderRadius: 14, backgroundColor: '#E8475E', alignItems: 'center' },
  modalConfirmText: { fontSize: 14, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
})
