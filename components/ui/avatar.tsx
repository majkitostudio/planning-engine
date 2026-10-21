export function Avatar({
  name,
  color = "blue",
  size = "md",
}: {
  name: string;
  color?: string;
  size?: "sm" | "md";
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <span
      className={`avatar avatar--${color}${size === "sm" ? " avatar--sm" : ""}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
