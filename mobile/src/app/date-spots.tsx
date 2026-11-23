import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as Location from 'expo-location'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

interface DateSpot {
  id: string
  name: string
  category: 'dining' | 'coffee' | 'drinks' | 'outdoors'
  cuisine: string
  address: string
  city: string
  lat?: number
  lng?: number
  source: 'live_osm' | 'curated'
}

const CITIES = ['Cape Town', 'Johannesburg', 'Durban']

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'compass-outline' as const },
  { id: 'dining', label: 'Dining', icon: 'restaurant-outline' as const },
  { id: 'coffee', label: 'Coffee', icon: 'cafe-outline' as const },
  { id: 'drinks', label: 'Wine & Bars', icon: 'wine-outline' as const },
  { id: 'outdoors', label: 'Outdoors', icon: 'leaf-outline' as const },
]

const QUICK_SLOTS = [
  'Tonight @ 7:30 PM',
  'Friday @ 7:00 PM',
  'Saturday @ 6:30 PM',
  'Sunday Brunch @ 11:00 AM',
]

function getCategoryMeta(cat: DateSpot['category']) {
  switch (cat) {
    case 'coffee':
      return { icon: 'cafe-outline' as const, label: 'Coffee & Cafe', bg: '#FEF3C7', color: '#B45309' }
    case 'drinks':
      return { icon: 'wine-outline' as const, label: 'Wine & Lounge', bg: '#F0E6FF', color: '#7C3AED' }
    case 'outdoors':
      return { icon: 'leaf-outline' as const, label: 'Outdoors', bg: '#ECFDF5', color: '#059669' }
    default:
      return { icon: 'restaurant-outline' as const, label: 'Dining', bg: '#FFF0ED', color: '#E8475E' }
  }
}

export default function DateSpotsScreen() {
  const [city, setCity] = useState('Cape Town')
  const [category, setCategory] = useState('all')
  const [spots, setSpots] = useState<DateSpot[]>([])
  const [dataSource, setDataSource] = useState<'live_osm' | 'curated'>('live_osm')
  const [loading, setLoading] = useState(true)
  const [detectingGps, setDetectingGps] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Plan Date Modal
  const [selectedSpot, setSelectedSpot] = useState<DateSpot | null>(null)
  const [dateTimeLabel, setDateTimeLabel] = useState(QUICK_SLOTS[0])
  const [note, setNote] = useState('')
  const [planning, setPlanning] = useState(false)
  const [plannedToast, setPlannedToast] = useState<string | null>(null)

  const loadSpots = useCallback(
    async (opts?: { nextCity?: string; nextCategory?: string; nextCoords?: { lat: number; lng: number } | null }) => {
      const targetCity = opts?.nextCity ?? city
      const targetCategory = opts?.nextCategory ?? category
      const targetCoords = opts?.nextCoords !== undefined ? opts.nextCoords : coords

      setLoading(true)
      try {
        const res = await api.couples.getDateSpots({
          city: targetCoords ? undefined : targetCity,
          category: targetCategory,
          lat: targetCoords?.lat,
          lng: targetCoords?.lng,
        })
        setSpots(res.spots || [])
        setDataSource(res.source || 'curated')
        if (res.city && !targetCoords) {
          setCity(res.city)
        }
      } catch (err: any) {
        Alert.alert('Could not load spots', err.message || 'Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [city, category, coords]
  )

  useEffect(() => {
    loadSpots()
  }, [])

  const handleSelectCity = (c: string) => {
    setCoords(null)
    setCity(c)
    loadSpots({ nextCity: c, nextCoords: null })
  }

  const handleSelectCategory = (cat: string) => {
    setCategory(cat)
    loadSpots({ nextCategory: cat })
  }

  const handleUseGps = async () => {
    setDetectingGps(true)
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        })
        const nextCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCoords(nextCoords)
        setCity('Near You')
        await loadSpots({ nextCity: 'Near You', nextCoords })
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Location Needed', 'Enable location access or pick a city chip above.')
          return
        }
        const loc = await Location.getCurrentPositionAsync({})
        const nextCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude }
        setCoords(nextCoords)
        setCity('Near You')
        await loadSpots({ nextCity: 'Near You', nextCoords })
      }
    } catch {
      Alert.alert('GPS Unavailable', 'Could not read your GPS coordinates. Try choosing a city above.')
    } finally {
      setDetectingGps(false)
    }
  }

  const handleOpenMaps = (spot: DateSpot) => {
    const query =
      spot.lat && spot.lng
        ? `${spot.lat},${spot.lng}`
        : encodeURIComponent(`${spot.name} ${spot.address} ${spot.city}`)
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`
    Linking.openURL(url).catch(() => {})
  }

  const handleConfirmPlan = async () => {
    if (!selectedSpot) return
    setPlanning(true)
    try {
      await api.couples.planDateNight({
        spotName: selectedSpot.name,
        address: selectedSpot.address,
        dateTimeLabel,
        note: note.trim() || undefined,
      })
      const name = selectedSpot.name
      setSelectedSpot(null)
      setNote('')
      setPlannedToast(`Planned "${name}" — added to Shared Vows & sent in your Private Chat!`)
      setTimeout(() => setPlannedToast(null), 4000)
    } catch (err: any) {
      Alert.alert('Could not save plan', err.message || 'Please try again.')
    } finally {
      setPlanning(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="#1A1A2E" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Date Night Spots</Text>
          <Text style={styles.headerSub}>
            {dataSource === 'live_osm' ? `Live nearby in ${city}` : `Curated in ${city}`}
          </Text>
        </View>
        <Pressable style={styles.gpsBtn} onPress={handleUseGps} disabled={detectingGps}>
          {detectingGps ? (
            <ActivityIndicator size="small" color="#E8475E" />
          ) : (
            <Ionicons name="navigate" size={18} color="#E8475E" />
          )}
        </Pressable>
      </View>

      {/* City Selector */}
      <View style={styles.cityRow}>
        {CITIES.map((c) => {
          const active = city === c && !coords
          return (
            <Pressable
              key={c}
              style={[styles.cityChip, active && styles.cityChipActive]}
              onPress={() => handleSelectCity(c)}
            >
              <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>{c}</Text>
            </Pressable>
          )
        })}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catContent}
      >
        {CATEGORIES.map((cat) => {
          const active = category === cat.id
          return (
            <Pressable
              key={cat.id}
              style={[styles.catPill, active && styles.catPillActive]}
              onPress={() => handleSelectCategory(cat.id)}
            >
              <Ionicons name={cat.icon} size={15} color={active ? '#FFFFFF' : '#6B6B7B'} />
              <Text style={[styles.catPillText, active && styles.catPillTextActive]}>{cat.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Confirmation Banner */}
      {plannedToast ? (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#15803D" />
          <Text style={styles.toastText}>{plannedToast}</Text>
        </View>
      ) : null}

      {/* Spots List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#E8475E" />
          <Text style={styles.loadingText}>Finding real date spots in {city}...</Text>
        </View>
      ) : spots.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Ionicons name="restaurant-outline" size={44} color="#C0B8BC" />
          <Text style={styles.emptyTitle}>No spots found for this filter</Text>
          <Text style={styles.loadingText}>Try switching category or selecting another city.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {spots.map((spot) => {
            const meta = getCategoryMeta(spot.category)
            return (
              <View key={spot.id} style={styles.spotCard}>
                <View style={styles.spotTop}>
                  <View style={[styles.spotIconWrap, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={22} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.spotName}>{spot.name}</Text>
                    <Text style={styles.spotCuisine}>{spot.cuisine}</Text>
                    <View style={styles.addrRow}>
                      <Ionicons name="location-outline" size={13} color="#8E8E9E" />
                      <Text style={styles.spotAddress} numberOfLines={1}>
                        {spot.address}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.spotActions}>
                  <Pressable style={styles.mapBtn} onPress={() => handleOpenMaps(spot)}>
                    <Ionicons name="map-outline" size={16} color="#1A1A2E" />
                    <Text style={styles.mapBtnText}>Maps</Text>
                  </Pressable>
                  <Pressable
                    style={styles.planBtn}
                    onPress={() => {
                      setDateTimeLabel(QUICK_SLOTS[0])
                      setNote('')
                      setSelectedSpot(spot)
                    }}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.planBtnText}>Plan Date Night</Text>
                  </Pressable>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* Plan Date Modal */}
      <Modal visible={!!selectedSpot} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Plan Date Night</Text>
                <Text style={styles.modalSub}>{selectedSpot?.name}</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setSelectedSpot(null)}>
                <Ionicons name="close" size={20} color="#1A1A2E" />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Choose a Time</Text>
            <View style={styles.slotsGrid}>
              {QUICK_SLOTS.map((slot) => {
                const active = dateTimeLabel === slot
                return (
                  <Pressable
                    key={slot}
                    style={[styles.slotChip, active && styles.slotChipActive]}
                    onPress={() => setDateTimeLabel(slot)}
                  >
                    <Text style={[styles.slotChipText, active && styles.slotChipTextActive]}>
                      {slot}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Text style={styles.fieldLabel}>Note for Your Partner (Optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="e.g. Dress up — dinner is on me!"
              placeholderTextColor="#A0A0B0"
              value={note}
              onChangeText={setNote}
            />

            <Pressable style={styles.confirmBtn} onPress={handleConfirmPlan} disabled={planning}>
              {planning ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>Save & Send to Private Chat</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 58, paddingBottom: 12 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4F2F3', alignItems: 'center', justifyContent: 'center' },
  gpsBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF0ED', borderWidth: 1, borderColor: '#FDDDE3', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 19, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  headerSub: { fontSize: 12, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#8E8E9E', marginTop: 1 },
  cityRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  cityChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDEF' },
  cityChipActive: { backgroundColor: '#FFF0ED', borderColor: '#E8475E' },
  cityChipText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B' },
  cityChipTextActive: { color: '#E8475E', fontFamily: 'DMSans_700Bold', fontWeight: '700' },
  catScroll: { maxHeight: 46, marginBottom: 12 },
  catContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: '#F4F2F3' },
  catPillActive: { backgroundColor: '#E8475E' },
  catPillText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B' },
  catPillTextActive: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontWeight: '700' },
  toastBanner: { marginHorizontal: 20, marginBottom: 10, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  toastText: { flex: 1, fontSize: 13, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#15803D' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText: { fontSize: 14, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#6B6B7B', textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  listContent: { paddingHorizontal: 20, paddingBottom: 48, gap: 12 },
  spotCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F0EDEF', gap: 14 },
  spotTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  spotIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  spotName: { fontSize: 16, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  spotCuisine: { fontSize: 13, fontFamily: 'DMSans_500Medium', fontWeight: '500', color: '#6B6B7B', marginTop: 2 },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  spotAddress: { flex: 1, fontSize: 12, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#8E8E9E' },
  spotActions: { flexDirection: 'row', gap: 10 },
  mapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, backgroundColor: '#F4F2F3' },
  mapBtnText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#1A1A2E' },
  planBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, backgroundColor: '#E8475E' },
  planBtnText: { fontSize: 13, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 38 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E' },
  modalSub: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#E8475E', marginTop: 2 },
  fieldLabel: { fontSize: 13, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  slotChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: '#F4F2F3', borderWidth: 1, borderColor: 'transparent' },
  slotChipActive: { backgroundColor: '#FFF0ED', borderColor: '#E8475E' },
  slotChipText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', fontWeight: '600', color: '#6B6B7B' },
  slotChipTextActive: { color: '#E8475E', fontFamily: 'DMSans_700Bold', fontWeight: '700' },
  noteInput: { backgroundColor: '#FFFBF9', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'DMSans_400Regular', fontWeight: '400', color: '#1A1A2E', borderWidth: 1, borderColor: '#EBE4E8', marginBottom: 20 },
  confirmBtn: { backgroundColor: '#E8475E', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  confirmBtnText: { fontSize: 15, fontFamily: 'DMSans_700Bold', fontWeight: '700', color: '#FFFFFF' },
})
