/**
 * Avatar s neutrálním zbarvením.
 *
 * Barva z ukázkových dat už neslouží k rozlišování osob. Avatary mají
 * jen několik tlumených tónů, aby rozhraní nepůsobilo jako barevná
 * šablona a pozornost zůstala na rozpisu směn.
 */
const TONES: Record<string, string> = {
  blue: "slate",
  indigo: "slate",
  purple: "slate",
  teal: "sage",
  green: "sage",
  amber: "stone",
  orange: "stone",
  rose: "stone",
};

export function Avatar({
  name,
  color = "stone",
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

  const tone = TONES[color] ?? "stone";

  return (
    <span
      className={`avatar avatar--${tone}${size === "sm" ? " avatar--sm" : ""}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
