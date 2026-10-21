import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

export function Alert({
  variant = "info",
  children,
}: {
  variant?: "info" | "warning";
  children: ReactNode;
}) {
  return (
    <div
      className={`alert${variant === "warning" ? " alert--warning" : ""}`}
      role="status"
    >
      <span className="alert__icon" aria-hidden="true">
        <Icon name={variant === "warning" ? "alert" : "info"} width={18} height={18} />
      </span>
      <div>{children}</div>
    </div>
  );
}
