import React from 'react';
import "../app/globals.css";


const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="bg-gray-900/[0.5] p-8 rounded-2xl border border-gray-800 backdrop-blur-sm">
    <div className="text-blue-500 mb-4">{icon}</div>
    <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </div>
);

const Features = () => {
  const features = [
    {
      icon: <IconConfidential />,
      title: 'Prevent Data Leaks',
      description: 'Saferail detects and warns against sending confidential information or sensitive documents to unauthorized recipients, both internal and external.'
    },
    {
      icon: <IconCompliance />,
      title: 'Ensure Compliance',
      description: 'Automatically checks emails against company policies and industry regulations (e.g., GDPR, HIPAA) to prevent costly compliance violations.'
    },
    {
      icon: <IconProfessionalism />,
      title: 'Maintain Professionalism',
      description: 'Analyzes email tone and content for professionalism, helping employees maintain a positive brand image in all communications.'
    }
  ];

  return (
    <section id="features" className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-white">Protect Every Email, Automatically</h2>
          <p className="mt-2 text-lg text-gray-400">Here’s how Saferail empowers your organization.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map(feature => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

const IconConfidential = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <path d="M12 9h.01" />
        <path d="M11 12h1v4h1" />
    </svg>
);

const IconCompliance = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="2" />
        <path d="M9 12l2 2l4 -4" />
    </svg>
);

const IconProfessionalism = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 20h4l10.5 -10.5a1.5 1.5 0 0 0 -4 -4l-10.5 10.5v4" />
        <line x1="13.5" y1="6.5" x2="17.5" y2="10.5" />
    </svg>
);


export default Features;
