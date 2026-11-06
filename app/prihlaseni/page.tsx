import type { Metadata } from "next";
import { connection } from "next/server";
import { LoginForm } from "@/components/login-form";
import { BrandMark } from "@/components/ui/brand-mark";
import { getActiveAuthRuntimeConfig } from "@/lib/auth/local";

export const metadata: Metadata = {
  title: "Přihlášení",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const authRuntime = getActiveAuthRuntimeConfig();
  const authConfigured = authRuntime.ok;
  const authMode = authRuntime.ok ? authRuntime.mode : "local";

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <span className="brand__mark" aria-hidden="true">
            <BrandMark size={34} />
          </span>
          <span className="brand__text">
            <span className="brand__name">Plánovací Engine</span>
          </span>
        </div>

        <h1 className="login__title">Přihlášení</h1>

        <LoginForm
          authConfigured={authConfigured}
          authMode={authMode}
          passwordChanged={params.passwordChanged === "1"}
        />
      </div>
    </div>
  );
}
