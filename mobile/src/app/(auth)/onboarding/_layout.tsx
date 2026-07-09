import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="basics" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="bio" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="location" />
    </Stack>
  )
}
