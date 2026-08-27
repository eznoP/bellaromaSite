import Image from "next/image";
import mark from "./bellaroma-mark.png";
import seal from "./bellaroma-seal.png";

export function BrandMark({
  className = "",
  variant = "mark",
}: {
  className?: string;
  variant?: "mark" | "seal";
}) {
  if (variant === "seal") {
    return (
      <span className={className}>
        <Image src={seal} alt="Bellaroma" priority />
      </span>
    );
  }

  return (
    <span className={className}>
      <Image src={mark} alt="Bellaroma" priority />
      <small>Costura artesanal</small>
    </span>
  );
}
