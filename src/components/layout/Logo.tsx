export function KovaLogo({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const fontSize = { sm: 13, default: 16, lg: 20 }[size];

  return (
    <span
      className="font-bold"
      style={{
        fontSize,
        letterSpacing: "2px",
        color: "#4A8C5E",
      }}
    >
      KOVA
    </span>
  );
}
