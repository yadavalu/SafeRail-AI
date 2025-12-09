import React from 'react';
import "../app/globals.css";


const Footer = () => {
  return (
    <footer className="border-t border-gray-800 py-8">
      <div className="container mx-auto px-6 text-center text-gray-500">
        <p>&copy; {new Date().getFullYear()} Saferail. All rights reserved.</p>
        <div className="flex justify-center space-x-6 mt-4">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
