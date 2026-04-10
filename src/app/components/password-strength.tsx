import { useMemo } from "react";
import { validatePassword, type PasswordValidation } from "../../lib/auth-security";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
  show?: boolean; // only show when password is being typed
}

const strengthColors: Record<PasswordValidation["strength"], string> = {
  weak: "bg-red-500",
  fair: "bg-orange-500",
  good: "bg-yellow-500",
  strong: "bg-green-500",
};

const strengthLabels: Record<PasswordValidation["strength"], string> = {
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
};

const strengthWidths: Record<PasswordValidation["strength"], string> = {
  weak: "w-1/4",
  fair: "w-2/4",
  good: "w-3/4",
  strong: "w-full",
};

export function PasswordStrength({ password, show = true }: PasswordStrengthProps) {
  const validation = useMemo(() => validatePassword(password), [password]);

  if (!show || !password) return null;

  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
  ];

  return (
    <div className="space-y-2 mt-1.5">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${strengthWidths[validation.strength]} ${strengthColors[validation.strength]}`}
          />
        </div>
        <span className={`text-xs font-medium ${
          validation.strength === "weak" ? "text-red-500" :
          validation.strength === "fair" ? "text-orange-500" :
          validation.strength === "good" ? "text-yellow-500" :
          "text-green-500"
        }`}>
          {strengthLabels[validation.strength]}
        </span>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-0.5">
        {requirements.map((req) => (
          <li key={req.label} className="flex items-center gap-1.5 text-xs">
            {req.met ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground" />
            )}
            <span className={req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
