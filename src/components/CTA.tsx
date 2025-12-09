import React from 'react';
import "../app/globals.css";

const CTA = () => {
  return (
    <section id="cta" className="py-20">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl font-extrabold text-white">Ready to Secure Your Communications?</h2>
        <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
          Protect your company's valuable information and reputation. Install the Saferail addon for Outlook and Gmail today.
        </p>
        <button className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg transition-colors text-xl">
          Request a Demo
        </button>
      </div>
    </section>
  );
};

export default CTA;
