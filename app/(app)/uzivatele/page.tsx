import { AccountManagement } from "@/components/accounts/account-management";
import { requirePlanningActor } from "@/lib/auth/route-access";
import { getActiveAuthRuntimeConfig } from "@/lib/auth/local";
import { listAccounts } from "@/lib/auth/account-service";
import { prisma } from "@/lib/db";

export default async function AccountsPage() {
  const runtime = getActiveAuthRuntimeConfig();
  const access = await requirePlanningActor();
  const canManage = runtime.ok && runtime.mode === "database" && access.ok && access.actor.role === "manager";
  let initialAccounts: Awaited<ReturnType<typeof listAccounts>> = [];
  let loadFailed = false;
  if (canManage) {
    try {
      initialAccounts = await listAccounts(prisma);
    } catch {
      loadFailed = true;
    }
  }

  return (
    <div>
      <header className="page-head">
        <div className="page-head__lead">
          <div>
            <h1 className="page-head__title">Správa účtů</h1>
            <p className="page-head__sub">Vytvářejte uživatelské účty a spravujte jejich přístup do aplikace.</p>
          </div>
        </div>
      </header>
      {canManage ? (
        loadFailed ? (
          <section className="card" role="alert">
            <div className="card__body"><p>Účty se nepodařilo načíst z databáze.</p></div>
          </section>
        ) : <AccountManagement initialAccounts={initialAccounts.map((account) => ({
          ...account,
          createdAt: account.createdAt.toISOString(),
        }))} />
      ) : (
        <section className="card" role="alert">
          <div className="card__body">
            <h2 className="card__title">Správa účtů není dostupná</h2>
            <p>Je nutný manager přihlášený v databázovém režimu.</p>
          </div>
        </section>
      )}
    </div>
  );
}
