import { createTamagui } from 'tamagui'
import { config as baseConfig } from '@tamagui/config/v3'

// Vow Design Tokens — Light & Warm
const vowConfig = createTamagui({
  ...baseConfig,
  tokens: {
    ...baseConfig.tokens,
    color: {
      ...baseConfig.tokens.color,
      // Backgrounds
      background: '#FFFBF9',
      backgroundSoft: '#FFF5F2',
      surface: '#FFFFFF',
      surfaceMuted: '#FFF0ED',
      // Brand
      primary: '#E8475E',
      primarySoft: '#FDDDE3',
      primaryDark: '#C73350',
      // Couples Mode accent
      secondary: '#C9A0F4',
      secondarySoft: '#F0E6FF',
      // Warm gradient partner
      accent: '#F4A0B5',
      accentWarm: '#FFD6C0',
      // Text
      textPrimary: '#1A1A2E',
      textSecondary: '#6B6B7B',
      textMuted: '#A0A0B0',
      // Borders
      border: '#F0EDEF',
      borderSoft: '#FAF0F0',
    },
  },
  themes: {
    light: {
      background: '#FFFBF9',
      backgroundHover: '#FFF5F2',
      backgroundPress: '#FDDDE3',
      backgroundFocus: '#FFF0ED',
      borderColor: '#F0EDEF',
      borderColorHover: '#E8D0D5',
      color: '#1A1A2E',
      colorHover: '#E8475E',
      colorPress: '#C73350',
      colorFocus: '#E8475E',
      placeholderColor: '#A0A0B0',
      outlineColor: '#E8475E',
    },
  },
  fonts: {
    ...baseConfig.fonts,
    heading: {
      ...baseConfig.fonts.heading,
      family: 'PlusJakartaSans_700Bold',
    },
    body: {
      ...baseConfig.fonts.body,
      family: 'PlusJakartaSans_400Regular',
    },
  },
  settings: {
    allowedStyleValues: 'somewhat-strict',
    autocompleteSpecificTokens: 'except-special',
  },
})

export type VowConfig = typeof vowConfig
declare module 'tamagui' {
  interface TamaguiCustomConfig extends VowConfig {}
}

export default vowConfig
