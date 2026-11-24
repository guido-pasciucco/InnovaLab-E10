
import Image from "next/image";

type NumoraLogoProps = {
  variant?: "light" | "dark";
  className?: string;
};

export function NumoraLogo({
  variant = "light",
  className = "",
}: NumoraLogoProps) {
  const src =
    variant === "dark"
      ? "/brand/numora-logo-dark.png"
      : "/brand/numora-logo-transparent.png";

  const dimensions =
    variant === "dark"
      ? { width: 2048, height: 682 }
      : { width: 1696, height: 356 };

  return (
    <Image
      src={src}
      alt="Numora"
      width={dimensions.width}
      height={dimensions.height}
      sizes="(max-width: 640px) 224px, 288px"
      className={`block h-full w-full object-contain ${className}`}
    />
  );
}
