import { Icon, type IconName } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

import type { ReactNode } from "react";

export function SectionPlaceholder({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon: IconName;
  action?: ReactNode;
}) {
  return (
    <>
      <div className="page-head">
        <div className="page-head__lead">
          <span className="page-head__icon" aria-hidden="true">
            <Icon name={icon} width={22} height={22} />
          </span>
          <div>
            <h1 className="page-head__title">{title}</h1>
            <p className="page-head__sub">{description}</p>
          </div>
        </div>
        <div className="page-head__actions">
          <Badge variant="warning" dot={false}>
            Připravované
          </Badge>
        </div>
      </div>

      <div className="card">
        <EmptyState
          icon={icon}
          title="Sekce je připravená, data zatím chybí"
          description="Obsah doplníme po schválení doménového kontraktu a napojení databáze. Zatím jde pouze o připravenou strukturu rozhraní bez skutečných dat."
          action={action}
        />
      </div>
    </>
  );
}
