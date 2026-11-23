import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

const { width, height } = Dimensions.get('window')

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Soft gradient background */}
      <LinearGradient
        colors={['#FFFBF9', '#FFF0ED', '#FDDDE3']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circleTopRight]} />
      <View style={[styles.circle, styles.circleBottomLeft]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoHeart}>♥</Text>
          </View>
          <Text style={styles.logoText}>vow</Text>
        </View>

        {/* Hero text */}
        <View style={styles.heroContainer}>
          <Text style={styles.heroTitle}>Find Love.{'\n'}Keep It.</Text>
          <Text style={styles.heroSubtitle}>
            The first app built for the full journey — from your first match to your lasting relationship.
          </Text>
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </Pressable>
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          By continuing you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> &{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF9',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  circleTopRight: {
    width: 300,
    height: 300,
    backgroundColor: '#E8475E',
    top: -80,
    right: -80,
  },
  circleBottomLeft: {
    width: 250,
    height: 250,
    backgroundColor: '#C9A0F4',
    bottom: 100,
    left: -80,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 48,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8475E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHeart: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  logoText: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold', fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -0.25,
  },
  heroContainer: {
    gap: 16,
  },
  heroTitle: {
    fontSize: 52,
    fontFamily: 'DMSans_700Bold', fontWeight: '700',
    color: '#1A1A2E',
    lineHeight: 58,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 17,
    fontFamily: 'DMSans_400Regular', fontWeight: '400',
    color: '#6B6B7B',
    lineHeight: 26,
  },
  buttonContainer: {
    gap: 14,
  },
  primaryButton: {
    backgroundColor: '#E8475E',
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 18,
    shadowColor: '#E8475E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold', fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#F0EDEF',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonPressed: {
    backgroundColor: '#FFF5F2',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold', fontWeight: '600',
    color: '#1A1A2E',
  },
  terms: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular', fontWeight: '400',
    color: '#A0A0B0',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#E8475E',
    fontFamily: 'DMSans_500Medium', fontWeight: '500',
  },
})
