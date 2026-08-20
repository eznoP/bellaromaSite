import type { ProductArtworkKind } from "@/lib/product";

export type ArtworkKind = ProductArtworkKind;

export function ProductArtwork({ kind }: { kind: ArtworkKind }) {
  const commonProps = {
    viewBox: "0 0 600 420",
    role: "presentation",
    focusable: false,
    "aria-hidden": true,
  } as const;

  if (kind === "table") {
    return (
      <svg {...commonProps}>
        <ellipse cx="300" cy="225" rx="238" ry="135" fill="#c4d4bd" />
        <ellipse cx="300" cy="225" rx="174" ry="94" fill="#fdf6ed" />
        <circle cx="300" cy="225" r="55" fill="#dccfc0" />
        <path d="M111 181c44-70 140-102 231-82 68 15 122 54 149 103" fill="none" stroke="#344238" strokeWidth="5" strokeDasharray="3 14" strokeLinecap="round" />
        <path d="M131 286c74 66 194 78 286 30" fill="none" stroke="#778873" strokeWidth="8" strokeLinecap="round" />
        <path d="M265 206c24-24 59-24 83 0M269 245c19 17 52 18 72 1" fill="none" stroke="#778873" strokeWidth="6" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "pillow") {
    return (
      <svg {...commonProps}>
        <path d="M155 71c68 20 222 18 290 0 25 66 25 212 0 278-77-19-213-19-290 0-25-66-25-212 0-278Z" fill="#fdf6ed" stroke="#344238" strokeWidth="8" />
        <path d="M193 106c52 15 162 15 214 0 16 48 16 158 0 206-57-15-157-15-214 0-16-48-16-158 0-206Z" fill="#dccfc0" />
        <path d="M205 164c59 43 131 62 198 36M200 236c65-40 142-49 205-13" fill="none" stroke="#778873" strokeWidth="16" strokeLinecap="round" />
        <path d="M159 80c-25 62-25 198 0 260M441 80c25 62 25 198 0 260" fill="none" stroke="#a1bc98" strokeWidth="5" strokeDasharray="2 13" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "bottle") {
    return (
      <svg {...commonProps}>
        <path d="M247 74h106v57c0 18 7 35 20 47l24 22c15 14 23 33 23 53v91c0 22-18 40-40 40H220c-22 0-40-18-40-40v-91c0-20 8-39 23-53l24-22c13-12 20-29 20-47V74Z" fill="#fdf6ed" stroke="#344238" strokeWidth="8" />
        <rect x="232" y="45" width="136" height="42" rx="15" fill="#344238" />
        <path d="M209 257h182v75c0 15-12 27-27 27H236c-15 0-27-12-27-27v-75Z" fill="#a1bc98" />
        <path d="M260 283c29-31 65-31 92 0-27 31-63 31-92 0Z" fill="#778873" />
        <path d="M300 253v62" stroke="#fdf6ed" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "aroma") {
    return (
      <svg {...commonProps}>
        <path d="M251 176h98l24 169c3 20-13 38-33 38h-80c-20 0-36-18-33-38l24-169Z" fill="#dccfc0" stroke="#344238" strokeWidth="8" />
        <rect x="242" y="151" width="116" height="39" rx="13" fill="#778873" />
        <path d="M271 154 210 48M294 154 277 27M321 154l54-117M341 154l89-79" fill="none" stroke="#344238" strokeWidth="7" strokeLinecap="round" />
        <path d="M208 52c-25-8-38-28-39-53 25 3 43 18 49 41M374 40c7-25 27-39 52-41-1 25-14 45-39 54M428 77c21-14 46-13 68-2-13 21-34 33-59 27" fill="#a1bc98" stroke="#344238" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="300" cy="280" r="35" fill="#fdf6ed" />
        <path d="M280 281c13-15 29-17 43-4" fill="none" stroke="#778873" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "soap") {
    return (
      <svg {...commonProps}>
        <rect x="116" y="177" width="247" height="146" rx="54" fill="#dccfc0" stroke="#344238" strokeWidth="8" transform="rotate(-8 116 177)" />
        <rect x="252" y="111" width="225" height="143" rx="52" fill="#fdf6ed" stroke="#344238" strokeWidth="8" transform="rotate(10 252 111)" />
        <path d="M302 170c31-25 68-24 97 3-20 34-54 45-88 27" fill="none" stroke="#a1bc98" strokeWidth="12" strokeLinecap="round" />
        <circle cx="171" cy="121" r="26" fill="none" stroke="#fdf6ed" strokeWidth="7" />
        <circle cx="122" cy="82" r="14" fill="none" stroke="#fdf6ed" strokeWidth="5" />
        <circle cx="205" cy="69" r="10" fill="#fdf6ed" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M88 94h261v220H88z" fill="#dccfc0" stroke="#344238" strokeWidth="8" transform="rotate(-6 88 94)" />
      <path d="M227 66h284v229H227z" fill="#fdf6ed" stroke="#344238" strokeWidth="8" transform="rotate(7 227 66)" />
      <path d="M263 115c68 25 138 25 203 1M255 169c73 26 150 27 217 3M249 226c75 25 156 26 229 2" fill="none" stroke="#a1bc98" strokeWidth="11" strokeLinecap="round" />
      <path d="M99 283c50-39 115-48 174-19" fill="none" stroke="#778873" strokeWidth="8" strokeDasharray="3 14" strokeLinecap="round" />
      <path d="m421 313 61-46M458 334l-38-55" stroke="#344238" strokeWidth="9" strokeLinecap="round" />
      <circle cx="489" cy="260" r="29" fill="none" stroke="#344238" strokeWidth="8" />
      <circle cx="411" cy="346" r="29" fill="none" stroke="#344238" strokeWidth="8" />
    </svg>
  );
}
