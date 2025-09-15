import React from "react";
import { cn } from "@/lib/utils";

export interface ShellProps {
  children?: React.ReactNode;
  heading?: React.ReactNode;
  subtitle?: React.ReactNode;
  CTA?: React.ReactNode;
  headerClassName?: string;
  className?: string;
}

export const Shell: React.FC<ShellProps> = ({
  children,
  heading,
  subtitle,
  CTA,
  headerClassName,
  className,
}) => {
  return (
    <div className={cn("flex flex-col px-10 py-4", className)}>
      {(heading || subtitle || CTA) && (
        <div className={cn("mb-6 flex items-center justify-between md:mb-6 md:mt-0 lg:mb-8", headerClassName)}>
          <div className="flex flex-col gap-0.5">
            {heading && <div className="text-2xl font-semibold">{heading}</div>}
            {subtitle && <div className="text-sm text-gray-600">{subtitle}</div>}
          </div>
          {CTA && <div>{CTA}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};