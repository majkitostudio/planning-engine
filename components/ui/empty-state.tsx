import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

export function EmptyState({
  icon = "box",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        <Icon name={icon} width={18} height={18} />
      </span>
      <p className="empty__title">{title}</p>
      <p className="empty__desc">{description}</p>
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
