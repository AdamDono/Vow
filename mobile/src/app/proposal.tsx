import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { api } from '../lib/api'

export default function ProposalScreen() {
  const { receiverId, partnerName, partnerPhoto } = useLocalSearchParams<{
    receiverId?: string
    partnerName?: string
    partnerPhoto?: string
  }>()

  const displayName = partnerName || 'your match'
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [lockedIn, setLockedIn] = useState(false)
  const [reverseInviteId, setReverseInviteId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSendProposal = async () => {
    if (!receiverId) {
      setError('Could not identify your match. Please open this from your conversation.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await api.proposals.send(receiverId)
      if (res?.alreadyReceived && res?.invite?.id) {
        setReverseInviteId(res.invite.id)
        setStatusMessage(
          `${displayName} already sent you a Vow! Tap below to accept and enter Couples Mode together.`
        )
      } else {
        setStatusMessage(
          res?.alreadyPending
            ? `Your Vow proposal to ${displayName} is already waiting for their response.`
            : `Your Vow proposal has been delivered to ${displayName}. The moment they accept, you will both lock into Couples Mode together.`
        )
        setSent(true)
      }
    } catch (err: any) {
      setError(err.message || 'Could not send your Vow proposal. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptReverse = async () => {
    if (!reverseInviteId) return
    setLoading(true)
    setError(null)
    try {
      await api.proposals.accept(reverseInviteId)
      setLockedIn(true)
      setTimeout(() => {
        router.replace('/(couple)/dashboard')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Could not accept proposal. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (lockedIn) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#E8475E', '#C9A0F4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.centerContent}>
          <View style={styles.celebrationCircle}>
            <Text style={styles.iconEmoji}>💍</Text>
          </View>
          <Text style={styles.celebrationTitle}>Vow Locked In!</Text>
          <Text style={styles.celebrationSubtitle}>
            You and {displayName} are officially off the singles market. Opening your private Couples OS...
          </Text>
          <ActivityIndicator color="#FFFFFF" style={{ marginTop: 20 }} />
        </View>
      </View>
    )
  }

  if (reverseInviteId) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FFFBF9', '#F0E6FF']} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            {partnerPhoto ? (
              <Image source={{ uri: partnerPhoto }} style={styles.partnerAvatar} />
            ) : (
              <Text style={styles.iconEmoji}>💍</Text>
            )}
          </View>
          <Text style={styles.title}>Mutual Vow Ready!</Text>
          <Text style={styles.subtitle}>{statusMessage}</Text>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Pressable style={styles.doneButton} onPress={handleAcceptReverse} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmButtonText}>Accept Vow & Enter Couples Mode 💍</Text>
            )}
          </Pressable>
          <Pressable style={[styles.cancelButton, { width: '100%', marginTop: 12 }]} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FFFBF9', '#F0E6FF']} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            <Text style={styles.iconEmoji}>💍</Text>
          </View>
          <Text style={styles.title}>Vow Proposal Sent!</Text>
          <Text style={styles.subtitle}>{statusMessage}</Text>
          <Pressable style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.confirmButtonText}>Back to Conversation</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFBF9', '#FFF0ED', '#FDDDE3']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          {partnerPhoto ? (
            <Image source={{ uri: partnerPhoto }} style={styles.partnerAvatar} />
          ) : (
            <Text style={styles.iconEmoji}>💍</Text>
          )}
        </View>

        <Text style={styles.title}>Send a Vow</Text>
        <Text style={styles.subtitle}>
          You're about to ask <Text style={styles.nameHighlight}>{displayName}</Text> to commit to an exclusive relationship with you on Vow.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens when they accept?</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoStep}>1</Text>
            <Text style={styles.infoText}>{displayName} receives your private Vow request and can accept or decline without pressure.</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoStep}>2</Text>
            <Text style={styles.infoText}>Both of you exit the singles discovery pool and your other matches archive automatically.</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoStep}>3</Text>
            <Text style={styles.infoText}>Your app transforms into a private Couples OS with double-blind daily check-ins, shared timeline & private chat.</Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={loading}>
            <Text style={styles.cancelButtonText}>Not yet</Text>
          </Pressable>

          <Pressable style={styles.confirmButton} onPress={handleSendProposal} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmButtonText}>Send Vow 💍</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 72, paddingBottom: 48, alignItems: 'center' },
  centerContent: { flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' },
  iconWrapper: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#FDDDE3', alignItems: 'center', justifyContent: 'center', marginBottom: 24, overflow: 'hidden', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#E8475E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 6 },
  partnerAvatar: { width: '100%', height: '100%' },
  iconEmoji: { fontSize: 48 },
  celebrationCircle: { width: 112, height: 112, borderRadius: 56, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  celebrationTitle: { fontSize: 34, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.4, marginBottom: 12, textAlign: 'center' },
  celebrationSubtitle: { fontSize: 16, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: 'rgba(255,255,255,0.92)', textAlign: 'center', lineHeight: 26 },
  title: { fontSize: 32, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', letterSpacing: -0.4, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', textAlign: 'center', lineHeight: 25, marginBottom: 24 },
  nameHighlight: { fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#E8475E' },
  errorBox: { width: '100%', backgroundColor: '#FEE2E2', borderRadius: 14, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FCA5A5' },
  errorText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#B91C1C', textAlign: 'center' },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '100%', marginBottom: 32, gap: 16, borderWidth: 1, borderColor: '#F0EDEF' },
  infoTitle: { fontSize: 15, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  infoItem: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  infoStep: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FDDDE3', textAlign: 'center', lineHeight: 26, fontSize: 13, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#E8475E' },
  infoText: { flex: 1, fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#6B6B7B', lineHeight: 22 },
  buttons: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelButton: { flex: 1, paddingVertical: 18, alignItems: 'center', borderRadius: 18, borderWidth: 1.5, borderColor: '#F0EDEF', backgroundColor: '#FFFFFF' },
  cancelButtonText: { fontSize: 17, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B' },
  confirmButton: { flex: 1, backgroundColor: '#E8475E', paddingVertical: 18, alignItems: 'center', borderRadius: 18, shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  confirmButtonText: { fontSize: 16, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  doneButton: { width: '100%', backgroundColor: '#E8475E', paddingVertical: 18, alignItems: 'center', borderRadius: 18, marginTop: 16, shadowColor: '#E8475E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
})
