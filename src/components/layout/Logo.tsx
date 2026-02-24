export function KovaLogo({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const fontSize = { sm: 13, default: 14, lg: 18 }[size];

  return (
    <span
      className="font-semibold"
      style={{
        fontSize,
        letterSpacing: "2px",
        color: "#FFFFFF",
      }}
    >
      KOVA
    </span>
  );
}
