import { type SVGProps } from "react";
import { cn } from "@/lib/utils";
import type { IconName } from "./icon-names";

function Icon({
  name,
  size = 16,
  className,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number | string;
}) {
  return (
    <svg
      height={size}
      width={size}
      className={cn("fill-transparent", className)}
      {...props}
      aria-hidden>
      <use href={`#${name}`} />
    </svg>
  );
}

export { type IconName, Icon };
export default Icon;