import type { DefaultSession } from "next-auth";

import type { AuthRole } from "./config";

declare module "next-auth" {
  interface User {
    role: AuthRole;
    mustChangePassword?: boolean;
    sessionVersion?: number;
  }

  interface Session {
    user: {
      id: string;
      role: AuthRole;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AuthRole;
    mustChangePassword?: boolean;
    sessionVersion?: number;
  }
}
