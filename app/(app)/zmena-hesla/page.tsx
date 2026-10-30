import { ChangePasswordForm } from "@/components/accounts/change-password-form";

export default function ChangePasswordPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Zabezpečení účtu</p>
        <h1>Změna hesla</h1>
        <p>Než budete pokračovat do aplikace, nastavte si vlastní heslo.</p>
      </header>
      <section className="panel" aria-label="Změna hesla">
        <ChangePasswordForm />
      </section>
    </div>
  );
}
