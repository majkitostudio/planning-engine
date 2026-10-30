import { ChangePasswordForm } from "@/components/accounts/change-password-form";

export default function ChangePasswordPage() {
  return (
    <div>
      <header className="page-head">
        <div className="page-head__lead">
          <div>
            <h1 className="page-head__title">Změna hesla</h1>
            <p className="page-head__sub">Než budete pokračovat do aplikace, nastavte si vlastní heslo.</p>
          </div>
        </div>
      </header>
      <section className="card" aria-label="Změna hesla">
        <div className="card__body"><ChangePasswordForm /></div>
      </section>
    </div>
  );
}
