"use client";

import { useState } from "react";
import { getLogoUrl, getTeamColor, getTeamInitials } from "@/lib/logos";

interface TeamLogoProps {
  teamName: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  xs: { container: "w-5 h-5", text: "text-[7px]", img: 20 },
  sm: { container: "w-7 h-7", text: "text-[9px]", img: 28 },
  md: { container: "w-10 h-10", text: "text-xs", img: 40 },
  lg: { container: "w-14 h-14", text: "text-sm", img: 56 },
};

export default function TeamLogo({ teamName, size = "sm", className = "" }: TeamLogoProps) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getLogoUrl(teamName);
  const s = SIZES[size];

  if (!logoUrl || imgError) {
    return (
      <div
        className={`${s.container} rounded-full flex items-center justify-center font-bold ${s.text} text-white shrink-0 ${className}`}
        style={{ backgroundColor: getTeamColor(teamName) }}
        title={teamName}
      >
        {getTeamInitials(teamName)}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={teamName}
      width={s.img}
      height={s.img}
      className={`${s.container} object-contain shrink-0 ${className}`}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
}
