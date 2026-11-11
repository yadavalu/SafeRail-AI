"use client";

import { useEffect, useState } from "react";

type DemoStage = "halted" | "fixed" | "sent" | "typing" | "sending";

const message =
  "Bitte verwende für die Verhandlung ausschließlich die interne Zielmarge von 42 % und gehe nicht unter einen Einkaufsrabatt von 18 %.";

export default function InteractiveDemo() {
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
          const nextLength = Math.min(length + 2, message.length);
          if (nextLength === message.length) {
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
  }, [stage]);

  const composing = stage === "typing" || stage === "sending";

  return (
    <div className="demo-card" aria-label="SafeRail E-Mail-Demo">
      <div className="demo-topbar">
        <span>NEUE NACHRICHT</span>
        <span className="demo-muted">Re: Konditionen Q3</span>
      </div>
      <div className="demo-row">
        <span className="mono">An</span>
        <span>sarah@example.com</span>
      </div>
      <div className="demo-row demo-row-cc">
        <span className="mono">Cc</span>
        <span>lieferant@example.com</span>
        <span className="external-badge">extern</span>
      </div>
      <div className="demo-body">
        <p>Hallo Sarah,</p>
        {composing && (
          <p>
            {message.slice(0, typedLength)}
            {stage === "typing" && <span className="caret" aria-hidden="true" />}
          </p>
        )}
        {stage === "halted" && (
          <p>
            Bitte verwende für die Verhandlung ausschließlich die{" "}
            <span className="risk-text">
              interne Zielmarge von 42&nbsp;% und gehe nicht unter einen
              Einkaufsrabatt von 18&nbsp;%
            </span>
            .
          </p>
        )}
        {(stage === "fixed" || stage === "sent") && (
          <p className="pop">
            <span className="rewrite-text">
              Die Parameter für die Verhandlung schicke ich dir gleich separat
              über unseren internen Kanal.
            </span>
          </p>
        )}
        {stage !== "typing" && (
          <>
            <p>Ansonsten sollte alles wie besprochen sein.</p>
            <p>
              Viele Grüße
              <br />
              Daniel
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
              <strong>Versand angehalten</strong>
            </div>
            <span className="severity">Hohes Risiko</span>
          </div>
          <p className="notice-description">
            <strong>Grund:</strong> Diese E-Mail enthält vertrauliche interne
            Verhandlungsparameter. Da ein externer Lieferant in Kopie steht,
            kann der Versand die kommerzielle Strategie offenlegen.
          </p>
          <button
            className="demo-action"
            type="button"
            onClick={() => setStage("fixed")}
          >
            Regelkonforme Formulierung übernehmen
          </button>
        </div>
      )}

      {stage === "fixed" && (
        <div className="demo-notice fixed-notice pop" role="status">
          <span>
            <strong>Formulierung übernommen.</strong> Die Nachricht ist
            regelkonform.
          </span>
          <button
            className="demo-action"
            type="button"
            onClick={() => setStage("sent")}
          >
            Senden
          </button>
        </div>
      )}

      {stage === "sent" && (
        <div className="demo-notice sent-notice pop" role="status">
          <span>
            <strong style={{ color: "var(--teal)" }}>Gesendet.</strong> Das
            Risiko hat das Unternehmen nie verlassen.
          </span>
          <button
            className="demo-action"
            type="button"
            onClick={() => setStage("halted")}
          >
            Noch einmal
          </button>
        </div>
      )}

      {stage === "sending" && (
        <p className="status-message" role="status">
          SafeRail prüft …
        </p>
      )}
    </div>
  );
}
