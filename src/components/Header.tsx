import React from 'react';
import "../app/globals.css";


const Header = () => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-black/40 backdrop-blur-lg backdrop-saturate-150 border-b border-white/5">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Saferail</h1>
        <nav>
          <ul className="flex space-x-8">
            <li><a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a></li>
            <li><a href="#demo" className="text-gray-300 hover:text-white transition-colors">Demo</a></li>
            <li><a href="#cta" className="text-gray-300 hover:text-white transition-colors">Get Started</a></li>
          </ul>
        </nav>
        <button className="bg-blue-600/95 hover:bg-blue-700/95 text-white font-bold py-2 px-4 rounded-lg transition-colors backdrop-contrast-125">
          Request a Demo
        </button>
      </div>
    </header>
  );
};

export default Header;
