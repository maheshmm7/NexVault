import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/landing/Navbar';
import LandingHero from '../components/landing/LandingHero';
import DashboardShowcase from '../components/landing/DashboardShowcase';
import FeatureSections from '../components/landing/FeatureSections';
import Intelligence from '../components/landing/Intelligence';
import LandingCTA from '../components/landing/LandingCTA';
import LandingFooter from '../components/landing/LandingFooter';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-[#0f172a] text-white min-h-screen overflow-x-hidden">
      {/* Background layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-cinematic-grid opacity-20" />
        <div className="absolute inset-0 bg-cinematic-gradient" />
      </div>

      <Navbar />

      <main className="relative z-10">
        <LandingHero />
        <DashboardShowcase />
        <FeatureSections />
        <Intelligence />
        <LandingCTA />
      </main>

      <LandingFooter />
    </div>
  );
}

