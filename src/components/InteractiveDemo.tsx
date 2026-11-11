"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { getCopy } from "@/i18n";

type DemoStage = "halted" | "fixed" | "sent" | "typing" | "sending";

export default function InteractiveDemo() {
  const { language } = useLocale();
  const text = getCopy(language).demo;
  const [stage, setStage] = useState<DemoStage>("halted");
  const [typedLength, setTypedLength] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (stage === "typing") return;

    let timer: ReturnType<typeof setTimeout>;
    if (stage === "halted") {
      timer = setTimeout(() => setStage("fixed"), 5200);
    } else if (stage === "fixed") {
      timer = setTimeout(() => setStage("sent"), 2800);
    } else if (stage === "sent") {
      timer = setTimeout(() => setStage("typing"), 2800);
    } else {
      timer = setTimeout(() => setStage("halted"), 900);
    }

    return () => clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "typing") {
      setTypedLength(0);
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        setTypedLength((length) => {
          const nextLength = Math.min(length + 2, text.message.length);
          if (nextLength === text.message.length) {
            if (interval) clearInterval(interval);
            finishTimer = setTimeout(() => setStage("sending"), 700);
          }
          return nextLength;
        });
      }, 34);
    }, 500);

    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, [stage, text.message]);

  const composing = stage === "typing" || stage === "sending";

  return (
    <div className="demo-card" aria-label={text.ariaLabel}>
      <div className="demo-topbar">
        <span>{text.newMessage}</span>
        <span className="demo-muted">{text.subject}</span>
      </div>
      <div className="demo-row">
        <span className="mono">{text.to}</span>
        <span>sarah@example.com</span>
      </div>
      <div className="demo-row demo-row-cc">
        <span className="mono">{text.cc}</span>
        <span>lieferant@example.com</span>
        <span className="external-badge">{text.external}</span>
      </div>
      <div className="demo-body">
        <p>{text.greeting}</p>
        {composing && (
          <p>
            {text.message.slice(0, typedLength)}
            {stage === "typing" && <span className="caret" aria-hidden="true" />}
          </p>
        )}
        {stage === "halted" && (
          <p>
            {text.riskyPrefix}{" "}
            <span className="risk-text">{text.riskyText}</span>.
          </p>
        )}
        {(stage === "fixed" || stage === "sent") && (
          <p className="pop">
            <span className="rewrite-text">{text.rewrite}</span>
          </p>
        )}
        {stage !== "typing" && (
          <>
            <p>{text.rest}</p>
            <p>
              {text.signoff}
              <br />
              {text.sender}
            </p>
          </>
        )}
      </div>

      {stage === "halted" && (
        <div className="demo-notice pop" role="status">
          <div className="notice-heading">
            <div className="notice-title">
              <svg
                aria-hidden="true"
                width="20"
                height="22"
                viewBox="0 0 20 22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10 1.5 18.5 4.5v6c0 5-3.6 8.6-8.5 10-4.9-1.4-8.5-5-8.5-10v-6L10 1.5Z" />
                <path d="M7.5 8v6M12.5 8v6" />
              </svg>
              <strong>{text.halted}</strong>
            </div>
            <span className="severity">{text.severity}</span>
          </div>
          <p className="notice-description">
            <strong>{language === "de" ? "Grund:" : "Reason:"}</strong>{" "}
            {text.reason}
          </p>
          <button
            className="demo-action"
            type="button"
            onClick={() => setStage("fixed")}
          >
            {text.apply}
          </button>
        </div>
      )}

      {stage === "fixed" && (
        <div className="demo-notice fixed-notice pop" role="status">
          <span>
            <strong>{text.fixed}</strong> {text.compliant}
          </span>
          <button
            className="demo-action"
            type="button"
            onClick={() => setStage("sent")}
          >
            {text.send}
          </button>
        </div>
      )}

      {stage === "sent" && (
        <div className="demo-notice sent-notice pop" role="status">
          <span>
            <strong style={{ color: "var(--teal)" }}>{text.sent}</strong>{" "}
            {text.safe}
          </span>
          <button
            className="demo-action"
            type="button"
            onClick={() => setStage("halted")}
          >
            {text.again}
          </button>
        </div>
      )}

      {stage === "sending" && (
        <p className="status-message" role="status">
          {text.checking}
        </p>
      )}
    </div>
  );
}
