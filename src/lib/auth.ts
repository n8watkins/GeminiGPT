import NextAuth, { type NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import { userOps } from "@/lib/database"

// CRITICAL SECURITY: Helper function to validate the auth secret
// Called lazily (per request via the NextAuth config function below),
// not at build time, so `next build` works without the env var set.
// v5 prefers AUTH_SECRET but we keep supporting NEXTAUTH_SECRET (set on Render).
function validateNextAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!secret) {
    const errorMsg =
      '🚨 CRITICAL SECURITY ERROR: NEXTAUTH_SECRET environment variable is not set. ' +
      'This is required for secure JWT signing. ' +
      'Generate a secure secret with: openssl rand -base64 32';
    console.error(errorMsg);

    // In production, this is a critical error
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET is required in production');
    }

    return 'development-secret-replace-in-production'; // Fallback for development
  }

  if (secret.length < 32) {
    const warningMsg =
      '🚨 CRITICAL SECURITY WARNING: NEXTAUTH_SECRET is too short (minimum 32 characters required). ' +
      'Current length: ' + secret.length + '. ' +
      'Generate a secure secret with: openssl rand -base64 32';
    console.error(warningMsg);

    // In production, this is a critical error
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET must be at least 32 characters in production');
    }
  }

  return secret;
}

// Auth is OPTIONAL: Google OAuth only activates when both env vars are set.
// The app fully supports anonymous users with no auth env vars at all.
function buildConfig(): NextAuthConfig {
  return {
    // CRITICAL SECURITY: Explicitly set and validate secret for JWT signing
    secret: validateNextAuthSecret(),

    // We run behind a trusted reverse proxy in production (Render sets
    // TRUST_PROXY=true). v4 had no host-trust check; v5 would reject every
    // auth request (UntrustedHost) in production without this.
    trustHost: true,

    providers:
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? [
            Google({
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            }),
          ]
        : [],

    callbacks: {
      async signIn({ user, profile }) {
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

      async session({ session, token }) {
        // Add Google ID to session
        if (token.sub) {
          session.user.id = token.sub;
        }
        return session;
      },

      async jwt({ token, user, account }) {
        // Persist Google ID in JWT
        if (account && user) {
          token.sub = account.providerAccountId; // Google ID
        }
        return token;
      }
    },

    session: {
      strategy: "jwt", // Use JWT instead of database sessions
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },

    pages: {
      signIn: '/', // Redirect to home page for sign in
      error: '/', // Redirect to home page on error
    },

    debug: process.env.NODE_ENV === 'development', // Enable debug logs in dev
  };
}

// Lazy config (function form) so secret validation runs at request time,
// not when the module is imported during `next build`.
export const { handlers, auth, signIn, signOut } = NextAuth(() => buildConfig());
