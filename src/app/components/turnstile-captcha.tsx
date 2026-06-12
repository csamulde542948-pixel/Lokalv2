import { useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "../../lib/env";
import { cn } from "./ui/utils";

type TurnstileWidgetId = string;

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "auto" | "light" | "dark";
      retry?: "auto" | "never";
      "retry-interval"?: number;
      "refresh-expired"?: "auto" | "manual" | "never";
      "refresh-timeout"?: "auto" | "manual" | "never";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: (errorCode?: string) => void;
      "timeout-callback"?: () => void;
    }
  ) => TurnstileWidgetId;
  reset: (widgetId?: TurnstileWidgetId) => void;
  remove: (widgetId?: TurnstileWidgetId) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_SELECTOR = 'script[data-turnstile-script="true"]';
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_LOAD_TIMEOUT_MS = 8000;

let turnstileScriptPromise: Promise<void> | null = null;

function waitForTurnstileApi(timeoutMs: number = TURNSTILE_LOAD_TIMEOUT_MS): Promise<void> {
  if (typeof window === "undefined" || window.turnstile) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const checkReady = () => {
      if (window.turnstile) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("Turnstile API timed out."));
        return;
      }

      window.setTimeout(checkReady, 50);
    };

    checkReady();
  });
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      TURNSTILE_SCRIPT_SELECTOR
    ) as HTMLScriptElement | null;

    const fail = (error: Error) => {
      turnstileScriptPromise = null;
      reject(error);
    };

    const handleReady = () => {
      waitForTurnstileApi()
        .then(resolve)
        .catch((error) => {
          fail(error instanceof Error ? error : new Error("Failed to initialize Turnstile CAPTCHA."));
        });
    };
    const handleError = () => {
      fail(new Error("Failed to load Turnstile CAPTCHA."));
    };

    if (existingScript) {
      if (window.turnstile) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", handleReady, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      waitForTurnstileApi().then(resolve).catch(() => {});
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-turnstile-script", "true");
    script.addEventListener("load", handleReady, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

interface TurnstileCaptchaProps {
  onVerify: (token: string | null) => void;
  resetSignal?: number;
  className?: string;
}

export function TurnstileCaptcha({
  onVerify,
  resetSignal = 0,
  className,
}: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<TurnstileWidgetId | null>(null);
  const onVerifyRef = useRef(onVerify);
  const previousResetSignalRef = useRef(resetSignal);
  const retryCountRef = useRef(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const destroyWidget = () => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.remove(widgetIdRef.current);
    }
    widgetIdRef.current = null;
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
  };

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    let cancelled = false;

    async function renderWidget() {
      try {
        await loadTurnstileScript();

        if (
          cancelled ||
          !containerRef.current ||
          !window.turnstile ||
          widgetIdRef.current
        ) {
          return;
        }

        setErrorMessage(null);
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "auto",
          retry: "auto",
          "retry-interval": 8000,
          "refresh-expired": "auto",
          "refresh-timeout": "auto",
          callback: (token) => {
            retryCountRef.current = 0;
            setErrorMessage(null);
            onVerifyRef.current(token);
          },
          "expired-callback": () => {
            onVerifyRef.current(null);
          },
          "error-callback": (errorCode) => {
            onVerifyRef.current(null);
            destroyWidget();

            if (retryCountRef.current < 2) {
              retryCountRef.current += 1;
              window.setTimeout(() => {
                if (!cancelled) {
                  void renderWidget();
                }
              }, 600);
              return;
            }

            setErrorMessage(
              errorCode
                ? `CAPTCHA could not load in this browser. Error code: ${errorCode}.`
                : "CAPTCHA could not load in this browser."
            );
          },
          "timeout-callback": () => {
            onVerifyRef.current(null);
            destroyWidget();
            if (!cancelled) {
              window.setTimeout(() => {
                void renderWidget();
              }, 400);
            }
          },
        });
      } catch {
        if (!cancelled) {
          setErrorMessage("CAPTCHA could not load in this browser.");
          onVerifyRef.current(null);
        }
      }
    }

    void renderWidget();

    return () => {
      cancelled = true;
      destroyWidget();
    };
  }, []);

  useEffect(() => {
    if (previousResetSignalRef.current === resetSignal) {
      return;
    }

    previousResetSignalRef.current = resetSignal;
    onVerifyRef.current(null);
    setErrorMessage(null);
    retryCountRef.current = 0;

    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  return (
    <div className={cn("space-y-2", className)}>
      <div ref={containerRef} className="min-h-[65px]" />
      {errorMessage ? (
        <p className="text-xs text-destructive">
          {errorMessage} Refresh the page or disable blocking extensions/tracking protection for this site, then try again.
        </p>
      ) : null}
    </div>
  );
}
