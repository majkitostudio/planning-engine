import { Icon, type IconName } from "@/components/icons";

export function StatCard({
  icon,
  tone,
  label,
  value,
  meta,
  trend,
  detailHref,
}: {
  icon: IconName;
  tone: "blue" | "green" | "red" | "amber";
  label: string;
  value: string;
  meta?: string;
  trend?: "up" | "down" | "flat";
  detailHref?: string;
}) {
  return (
    <div className="stat">
      <span className={`stat__icon stat__icon--${tone}`} aria-hidden="true">
        <Icon name={icon} width={21} height={21} />
      </span>
      <div className="stat__body">
        <p className="stat__label">{label}</p>
        <p className="stat__value">{value}</p>
        {meta ? (
          <p className="stat__meta">
            {trend === "up" || trend === "down" ? (
              <span className={`delta delta--${trend}`} aria-hidden="true">
                {trend === "up" ? "↑" : "↓"}
              </span>
            ) : null}
            {meta}
          </p>
        ) : null}
        {detailHref ? (
          <a className="link-arrow" href={detailHref}>
            Zobrazit detail
            <Icon name="arrowRight" width={14} height={14} />
          </a>
        ) : null}
      </div>
    </div>
  );
}
