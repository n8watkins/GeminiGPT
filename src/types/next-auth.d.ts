declare module "next-auth" {
  /**
   * Extends the built-in session types to include user ID
   */
  interface Session {
    user: {
      id: string       // Google ID (e.g., "103456789...")
      email: string
      name: string
      image: string
    }
  }
}

declare module "next-auth/jwt" {
  /**
   * Extends the JWT token to include user ID
   */
  interface JWT {
    sub: string  // Google ID stored in token
  }
}
