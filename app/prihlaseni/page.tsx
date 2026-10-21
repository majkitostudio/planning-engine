import { LoginForm } from "@/components/login-form";
import { Alert } from "@/components/ui/alert";

export default function LoginPage() {
  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <span className="brand__mark" aria-hidden="true">
            PE
          </span>
          <span className="brand__text">
            <span className="brand__name">Plánovací engine</span>
            <span className="brand__sub">AAAAuto · TM oddělení</span>
          </span>
        </div>

        <h1 className="login__title">Přihlášení</h1>
        <p className="login__lead">
          Vstup do manažerského prostředí pro sestavování rozpisů směn.
        </p>

        <div className="login__alert">
          <Alert variant="warning">
            <strong>Bez skutečného přihlášení.</strong> Formulář je pouze vizuální
            náhled, aplikaci nezabezpečuje.
          </Alert>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
