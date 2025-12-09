import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import InteractiveDemo from '@/components/InteractiveDemo';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="bg-black">
      <Header />
      <main>
        <Hero />
        <Features />
        <InteractiveDemo />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
