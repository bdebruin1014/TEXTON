export function TektonLogo({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const dims = { sm: 24, default: 28, lg: 36 }[size];
  const fontSize = { sm: 11, default: 13, lg: 16 }[size];

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center rounded-md font-bold"
        style={{
          width: dims,
          height: dims,
          fontSize,
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-700) 100%)",
          color: "var(--color-primary-accent)",
          boxShadow: "0 0 12px rgba(107, 158, 122, 0.2)",
        }}
      >
        T
      </div>
      <span
        className="font-bold tracking-[0.15em] text-[15px]"
        style={{ color: "var(--color-primary-accent)" }}
      >
        TEK{"\u00B7"}TON
      </span>
    </div>
  );
}
