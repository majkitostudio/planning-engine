import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

import {
  mapAuthProfile,
} from "./lib/auth/config";
import {
  getActiveAuthRuntimeConfig,
  verifyLocalCredentials,
  type ActiveAuthRuntimeConfig,
} from "./lib/auth/local";
import { shouldProtectPagePath } from "./lib/auth/protection";

const runtime = getActiveAuthRuntimeConfig();
const providers = runtime.ok
  ? runtime.mode === "local"
    ? [
        Credentials({
          credentials: {
            email: { label: "E-mail", type: "email" },
            password: { label: "Heslo", type: "password" },
          },
          authorize: async (credentials) =>
            verifyLocalCredentials(credentials, runtime),
        }),
      ]
    : [
        MicrosoftEntraID({
          clientId: runtime.clientId,
          clientSecret: runtime.clientSecret,
          issuer: runtime.issuer,
          authorization: {
            params: {
              scope: "openid profile email",
            },
          },
        }),
      ]
  : [];

const authRuntime: ActiveAuthRuntimeConfig | null = runtime.ok ? runtime : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authRuntime?.secret,
  providers,
  pages: {
    signIn: "/prihlaseni",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized: ({ auth: session, request }) =>
      !shouldProtectPagePath(request.nextUrl.pathname) || Boolean(session?.user),
    jwt: ({ token, profile, user }) => {
      if (user && typeof user.id === "string") {
        token.sub = user.id;
        if (typeof user.email === "string") token.email = user.email;
        if (typeof user.name === "string") token.name = user.name;
        token.role = user.role === "manager" ? "manager" : "viewer";
        return token;
      }

      if (!authRuntime || authRuntime.mode !== "entra" || !profile) return token;

      const mapped = mapAuthProfile(profile, authRuntime);
      if (!mapped) return {};

      token.sub = mapped.id;
      token.email = mapped.email;
      token.name = mapped.name;
      token.role = mapped.role;
      return token;
    },
    session: ({ session, token }) => {
      if (session.user && typeof token.sub === "string") {
        session.user.id = token.sub;
        session.user.role = token.role === "manager" ? "manager" : "viewer";
      }
      return session;
    },
  },
});
