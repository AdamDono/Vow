import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { setAuthToken } from '../../lib/api'

const SETTINGS = [
  { icon: 'notifications-outline', label: 'Notifications', sub: 'Daily check-in reminders' },
  { icon: 'shield-checkmark-outline', label: 'Privacy & Security', sub: 'Data, visibility settings' },
  { icon: 'person-outline', label: 'Account Settings', sub: 'Email, password' },
]

export default function CoupleSettingsScreen() {
  const handleLogout = () => {
    setAuthToken(null)
    router.replace('/(auth)/login')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Settings items */}
      <View style={styles.section}>
        {SETTINGS.map((item, i) => (
          <Pressable key={i} style={[styles.settingRow, i < SETTINGS.length - 1 && styles.settingRowBorder]}>
            <View style={styles.settingIcon}>
              <Ionicons name={item.icon as any} size={20} color="#C9A0F4" />
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
        <Text style={styles.dangerTitle}>Relationship</Text>
        <Pressable style={styles.dangerButton}>
          <Ionicons name="heart-dislike-outline" size={20} color="#E8475E" />
          <Text style={styles.dangerButtonText}>End Relationship on Vow</Text>
          <Ionicons name="chevron-forward" size={16} color="#A0A0B0" />
        </Pressable>
        <Text style={styles.dangerNote}>
          Ending your relationship will move both of you back to Single Mode. Your shared history will be recorded anonymously on both profiles.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF9' },
  content: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24 },
  title: { fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.6 },
  section: { marginHorizontal: 20, marginBottom: 28, backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F0EDEF' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0EDEF' },
  settingIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F0E6FF', alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1A2E' },
  settingSub: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', marginTop: 2 },
  dangerTitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#A0A0B0', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 16, marginBottom: 0 },
  dangerButton: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  dangerButtonText: { flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#E8475E' },
  dangerNote: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', color: '#A0A0B0', paddingHorizontal: 16, paddingBottom: 16, lineHeight: 20 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 16, paddingVertical: 16, borderWidth: 1.5, borderColor: '#FECACA' },
  logoutBtnText: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#DC2626' },
})
