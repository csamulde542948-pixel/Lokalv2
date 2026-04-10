import { Link } from "react-router";

interface BrandLogoProps {
  /** Visual size of the logo box. Default: "md" */
  size?: "sm" | "md" | "lg";
  /** Whether to show the "lokalhost.club" wordmark. Default: true */
  showText?: boolean;
  /** Extra className applied to the outer wrapper */
  className?: string;
  /** Wrap in a Link. Default: true */
  asLink?: boolean;
  /** Link destination. Default: "/" */
  linkTo?: string;
}

/**
 * Reusable brand logo:  [ L ]  lokalhost<span orange>.club</span>
 *
 * Usage:
 *   <BrandLogo />
 *   <BrandLogo size="lg" />
 *   <BrandLogo showText={false} />
 *   <BrandLogo asLink={false} />
 */
export function BrandLogo({
  size = "md",
  showText = true,
  className = "",
  asLink = true,
  linkTo = "/",
}: BrandLogoProps) {
  const boxSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };
  const letterSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };
  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  const content = (
    <>
      <div
        className={`${boxSizes[size]} bg-primary rounded-md flex items-center justify-center flex-shrink-0`}
      >
        <span className={`text-white font-bold leading-none ${letterSizes[size]}`}>L</span>
      </div>
      {showText && (
        <span className={`font-semibold leading-none ${textSizes[size]}`}>
          lokalhost<span style={{ color: "#ff6600" }}>.club</span>
        </span>
      )}
    </>
  );

  const wrapperClass = `flex items-center gap-2 ${className}`.trim();

  if (!asLink) {
    return <div className={wrapperClass}>{content}</div>;
  }

  return (
    <Link to={linkTo} className={wrapperClass}>
      {content}
    </Link>
  );
}
