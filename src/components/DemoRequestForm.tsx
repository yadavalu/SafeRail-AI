"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { getCopy } from "@/i18n";

type SubmissionStatus = {
  kind: "success" | "error";
  message: string;
} | null;

export default function DemoRequestForm() {
  const { language } = useLocale();
  const text = getCopy(language).contact;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SubmissionStatus>(null);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    setStatus(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("https://formsubmit.co/ajax/kiyan@saferail.io", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          _replyto: email,
          _subject: "SafeRail demo request",
          _honey: String(formData.get("_honey") ?? ""),
        }),
      });

      const result: { success?: boolean | string; message?: string } =
        await response.json();
      if (
        !response.ok ||
        (result.success !== true && result.success !== "true")
      ) {
        throw new Error(
          result.message ??
            `FormSubmit request failed with status ${response.status}.`,
        );
      }

      form.reset();
      setStatus({ kind: "success", message: text.success });
    } catch (error) {
      console.error("Could not send the SafeRail demo request.", error);
      setStatus({ kind: "error", message: text.error });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="contact-form reveal" onSubmit={submitRequest}>
      <div className="form-field">
        <label htmlFor="sr-name">{text.name}</label>
        <input
          id="sr-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
        />
      </div>
      <div className="form-field">
        <label htmlFor="sr-mail">{text.email}</label>
        <input
          id="sr-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </div>
      <div className="form-honeypot" aria-hidden="true">
        <label htmlFor="sr-website">Leave this field empty</label>
        <input
          id="sr-website"
          name="_honey"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <button className="cta-ink" type="submit" disabled={isSubmitting}>
        {isSubmitting ? text.sending : getCopy(language).nav.demo}
      </button>
      {status && (
        <p
          className={`form-status ${status.kind}`}
          role={status.kind === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {status.message}
        </p>
      )}
    </form>
  );
}
