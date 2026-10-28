import type { DefaultSession } from "next-auth";

import type { AuthRole } from "./config";

declare module "next-auth" {
  interface User {
    role: AuthRole;
  }

  interface Session {
    user: {
      id: string;
      role: AuthRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AuthRole;
  }
}
