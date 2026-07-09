import { Redirect } from 'expo-router'

// Entry point: redirect to auth welcome screen
// Later this will check Supabase session and redirect accordingly
export default function Index() {
  return <Redirect href="/(auth)/welcome" />
}
