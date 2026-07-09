import { Tabs } from 'expo-router'
import { View, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

function TabIcon({ name, focused }: { name: any; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={focused ? '#E8475E' : '#A0A0B0'} />
    </View>
  )
}

export default function SingleLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#E8475E',
        tabBarInactiveTintColor: '#A0A0B0',
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} /> }}
      />
      <Tabs.Screen
        name="likes"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'heart' : 'heart-outline'} focused={focused} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} /> }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    elevation: 0,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    height: 84,
    paddingBottom: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: '#FFF0ED' },
})
