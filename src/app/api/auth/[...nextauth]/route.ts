import NextAuth from "next-auth/next"
import GoogleProvider from "next-auth/providers/google"
import { userOps } from "@/lib/database"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],

  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user, profile }: any) {
      if (!profile?.sub) {
        console.error('No Google ID in profile');
        return false;
      }

      try {
        // Check if user already exists by Google ID
        const existingUser = userOps.getByGoogleId(profile.sub);

        if (!existingUser) {
          // Create new Google user
          userOps.createGoogleUser(
            profile.sub,           // Google ID as user ID
            user.email!,
            user.name!,
            user.image!
          );

          console.log(`✅ Created new Google user: ${user.email}`);
        } else {
          console.log(`✅ Existing Google user signed in: ${user.email}`);
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      // Add Google ID to session
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user, account }: any) {
      // Persist Google ID in JWT
      if (account && user) {
        token.sub = account.providerAccountId; // Google ID
      }
      return token;
    }
  },

  session: {
    strategy: "jwt" as const, // Use JWT instead of database sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/', // Redirect to home page for sign in
    error: '/', // Redirect to home page on error
  },

  debug: process.env.NODE_ENV === 'development', // Enable debug logs in dev
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
