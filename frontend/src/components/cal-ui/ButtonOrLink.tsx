import React from "react";
import { Link } from "@tanstack/react-router";

interface ButtonOrLinkProps extends React.ComponentProps<"button"> {
  href?: string;
  children: React.ReactNode;
}

export const ButtonOrLink = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonOrLinkProps>(
  ({ href, children, onClick, className, ...props }, ref) => {
    if (href) {
      return (
        <Link
          to={href}
          className={className}
          ref={ref as React.RefObject<HTMLAnchorElement>}
          onClick={onClick}
        >
          {children}
        </Link>
      );
    }

    return (
      <button
        className={className}
        ref={ref as React.RefObject<HTMLButtonElement>}
        onClick={onClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ButtonOrLink.displayName = "ButtonOrLink";