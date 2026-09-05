export interface AuthUser {
  userId: string
  email: string
}

export type AppEnv = {
  Variables: {
    user: AuthUser
  }
}
