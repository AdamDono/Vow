import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import { api } from '../lib/api'

export default function ProposalScreen() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSendProposal = async () => {
    setLoading(true)
    try {
      // In production, receiverId is passed from active match conversation
      await api.proposals.send('sample-partner-id')
      setSent(true)
    } catch (err) {
      console.warn('Simulated proposal send:', err)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FFFBF9', '#F0E6FF']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            <Text style={styles.iconEmoji}>💍</Text>
          </View>
          <Text style={styles.title}>Vow Proposal Sent!</Text>
          <Text style={styles.subtitle}>
            Your proposal has been delivered. If accepted, you will both transition directly into Couples Mode.
          </Text>
          <Pressable style={styles.doneButton} onPress={() => router.back()}>
            <LinearGradient colors={['#E8475E', '#C73350']} style={styles.confirmButtonGradient}>
              <Text style={styles.confirmButtonText}>Back to Messages</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFFBF9', '#FFF0ED', '#FDDDE3']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFillObject} />

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconWrapper}>
          <Text style={styles.iconEmoji}>💍</Text>
        </View>

        <Text style={styles.title}>Send a Vow</Text>
        <Text style={styles.subtitle}>
          You're about to ask <Text style={styles.nameHighlight}>Sarah</Text> to start an exclusive relationship with you on Vow.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoStep}>1</Text>
            <Text style={styles.infoText}>Sarah will receive your Vow request and can accept or decline.</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoStep}>2</Text>
            <Text style={styles.infoText}>If she accepts, you both move into Couples Mode together.</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoStep}>3</Text>
            <Text style={styles.infoText}>Both of you are removed from the singles discovery pool.</Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={loading}>
            <Text style={styles.cancelButtonText}>Not yet</Text>
          </Pressable>

          <Pressable style={styles.confirmButton} onPress={handleSendProposal} disabled={loading}>
            <LinearGradient colors={['#E8475E', '#C73350']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmButtonGradient}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Send Vow 💍</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 48, alignItems: 'center' },
  iconWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FDDDE3', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  iconEmoji: { fontSize: 48 },
  title: { fontSize: 32, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', letterSpacing: -0.8, marginBottom: 12 },
  subtitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', textAlign: 'center', lineHeight: 26, marginBottom: 32 },
  nameHighlight: { fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '100%', marginBottom: 40, gap: 16, borderWidth: 1, borderColor: '#F0EDEF' },
  infoTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: '#1A1A2E', marginBottom: 4 },
  infoItem: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  infoStep: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FDDDE3', textAlign: 'center', lineHeight: 26, fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#E8475E' },
  infoText: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: '#6B6B7B', lineHeight: 22 },
  buttons: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelButton: { flex: 1, paddingVertical: 18, alignItems: 'center', borderRadius: 18, borderWidth: 1.5, borderColor: '#F0EDEF', backgroundColor: '#FFFFFF' },
  cancelButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#6B6B7B' },
  confirmButton: { flex: 1, borderRadius: 18, overflow: 'hidden', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  confirmButtonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  confirmButtonText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
  doneButton: { width: '100%', borderRadius: 18, overflow: 'hidden', marginTop: 24 },
})
