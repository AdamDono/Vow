// Centralized store for Onboarding steps & data persistence

export interface OnboardingState {
  firstName: string
  lastName?: string
  age: number
  gender: string
  photos: string[]
  bio: string
  lookingFor: string
  interests: string[]
  city: string
}

let onboardingData: Partial<OnboardingState> = {}

export const getOnboardingData = (): Partial<OnboardingState> => {
  return onboardingData
}

export const updateOnboardingData = (data: Partial<OnboardingState>) => {
  onboardingData = { ...onboardingData, ...data }
}

export const clearOnboardingData = () => {
  onboardingData = {}
}
