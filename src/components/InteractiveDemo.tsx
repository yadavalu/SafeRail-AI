"use client";
import React, { useState, useEffect } from 'react';
import "../app/globals.css";


const suggestions = {
  confidential: {
    trigger: "confidential",
    message: "Warning: This email may contain confidential information. Are you sure you want to send it to an external address?",
    severity: "red"
  },
  password: {
    trigger: "password",
    message: "Security Alert: Sharing passwords via email is insecure. Consider using a secure password manager.",
    severity: "red"
  },
  urgent: {
    trigger: "urgent",
    message: "Tone Suggestion: Using 'urgent' can create pressure. Consider rephrasing for a more professional tone.",
    severity: "yellow"
  },
  contract: {
      trigger: "contract",
      message: "Compliance Check: This email mentions a contract. Please ensure it has been reviewed by the legal department before sending.",
      severity: "yellow"
  }
};

const InteractiveDemo = () => {
  const [emailBody, setEmailBody] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState<{ message: string; severity: string; } | null>(null);

  useEffect(() => {
    const lowercasedBody = emailBody.toLowerCase();
    let foundSuggestion = null;

    for (const key in suggestions) {
        const rule = suggestions[key as keyof typeof suggestions];
      if (lowercasedBody.includes(rule.trigger)) {
        foundSuggestion = { message: rule.message, severity: rule.severity };
      }
    }
    setActiveSuggestion(foundSuggestion);

  }, [emailBody]);

  const getBorderColor = () => {
    if (!activeSuggestion) return 'border-gray-700';
    return activeSuggestion.severity === 'red' ? 'border-red-500' : 'border-yellow-500';
  };

  return (
    <section id="demo" className="py-20 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-white">See Saferail in Action</h2>
          <p className="mt-2 text-lg text-gray-400">Type keywords like "confidential", "password", "urgent", or "contract".</p>
        </div>
        <div className={`bg-gray-900 rounded-2xl border ${getBorderColor()} p-6 max-w-4xl mx-auto transition-all duration-300`}>
          <div className="flex items-center justify-between pb-4 border-b border-gray-700">
            <span className="text-gray-400">New Message</span>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Send</button>
          </div>
          <div className="py-2">
            <input type="text" placeholder="To: external.contact@example.com" className="w-full bg-transparent text-gray-300 p-2 focus:outline-none" />
          </div>
          <div className="py-2 border-t border-b border-gray-700">
            <input type="text" placeholder="Subject: Project Details" className="w-full bg-transparent text-gray-300 p-2 focus:outline-none" />
          </div>
          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            placeholder="Compose your email..."
            className="w-full h-48 bg-transparent text-gray-200 p-4 focus:outline-none resize-none"
          ></textarea>
          {activeSuggestion && (
            <div className={`p-4 rounded-lg mt-4 ${activeSuggestion.severity === 'red' ? 'bg-red-900/[0.4]' : 'bg-yellow-900/[0.4]'}`}>
              <p className={`font-semibold ${activeSuggestion.severity === 'red' ? 'text-red-400' : 'text-yellow-400'}`}>
                {activeSuggestion.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default InteractiveDemo;
