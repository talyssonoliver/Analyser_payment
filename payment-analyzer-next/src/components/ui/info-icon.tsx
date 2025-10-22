import type React from "react";
import styles from "@/styles/tooltips.module.css";
import { Tooltip, type TooltipProps } from "./tooltip";

export interface InfoIconProps {
  content: string | React.ReactNode;
  position?: TooltipProps["position"];
  className?: string;
  iconClassName?: string;
  size?: number;
  ariaLabel?: string;
}

export const InfoIcon: React.FC<InfoIconProps> = ({
  content,
  position = "top",
  className = "",
  iconClassName = "",
  size = 16,
  ariaLabel = "More information",
}) => {
  return (
    <Tooltip content={content} position={position} className={className}>
      <button
        type="button"
        className={`${styles.infoIcon} ${iconClassName}`}
        aria-label={ariaLabel}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.infoIconSvg}
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M8 7.5V11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="5" r="0.75" fill="currentColor" />
        </svg>
      </button>
    </Tooltip>
  );
};

export interface InfoIconWithLabelProps extends InfoIconProps {
  label: string;
  labelClassName?: string;
}

export const InfoIconWithLabel: React.FC<InfoIconWithLabelProps> = ({
  label,
  labelClassName = "",
  ...infoIconProps
}) => {
  return (
    <div className={styles.infoIconWithLabel}>
      <span className={`${styles.label} ${labelClassName}`}>{label}</span>
      <InfoIcon {...infoIconProps} />
    </div>
  );
};
