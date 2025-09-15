import React from "react";
import { Link } from "@tanstack/react-router";

interface ButtonOrLinkProps {
  href?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  className?: string;
}

export const ButtonOrLink = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonOrLinkProps>(
  ({ href, children, onClick, className, ...props }, ref) => {
    if (href) {
      return (
        <Link
          to={href}
          className={className}
          ref={ref as React.RefObject<HTMLAnchorElement>}
          onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
        >
          {children}
        </Link>
      );
    }

    return (
      <button
        className={className}
        ref={ref as React.RefObject<HTMLButtonElement>}
        onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ButtonOrLink.displayName = "ButtonOrLink";