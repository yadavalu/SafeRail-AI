import React from 'react';
import "../app/globals.css";



const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center text-center bg-grid-gray-700/[0.2] overflow-hidden">
      {/* Animated blurry circles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="animate-hero-blur1 absolute top-[-8rem] left-[-8rem] w-[28rem] h-[28rem] bg-blue-500 opacity-40 rounded-full blur-3xl" />
        <div className="animate-hero-blur2 absolute bottom-[-8rem] right-[-8rem] w-[24rem] h-[24rem] bg-purple-500 opacity-40 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-6 relative z-10">
        <h2 className="text-5xl font-extrabold text-white md:text-7xl leading-tight">
          Keep Your Communication Secure and Professional
        </h2>
        <p className="mt-4 text-lg text-gray-300 md:text-xl max-w-3xl mx-auto">
          Saferail is a smart addon for Outlook and Gmail that ensures your emails align with company values, protect sensitive data, and maintain professionalism.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">
            Get Started
          </button>
          <button className="border border-gray-600 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">
            Watch Demo
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
