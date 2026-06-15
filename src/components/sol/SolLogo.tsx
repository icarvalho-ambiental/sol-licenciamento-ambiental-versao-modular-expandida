import solLogoAsset from "@/assets/sol-logo.jpg.asset.json";

type Variant = "mark" | "full";

export function SolLogo({
  size = 32,
  variant = "mark",
  className = "",
}: {
  size?: number;
  variant?: Variant;
  className?: string;
}) {
  if (variant === "full") {
    return (
      <img
        src={solLogoAsset.url}
        alt="SOL — Sistema Operacional de Licenciamento e Regularização Ambiental"
        style={{ height: size, width: "auto" }}
        className={`object-contain ${className}`}
      />
    );
  }
  // Compact mark: crop just the logomark area of the image via background-position
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={solLogoAsset.url}
        alt="SOL"
        style={{ height: size, width: "auto" }}
        className="object-contain"
      />
    </div>
  );
}