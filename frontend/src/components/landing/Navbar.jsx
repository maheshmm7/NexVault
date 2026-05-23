import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, Shield } from 'lucide-react';
import Logo from '../Logo';
import { BRANDING } from '../../config/branding';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, id) => {
    e.preventDefault();
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const navLinks = [
    { label: 'Showcase', id: 'dashboard-showcase' },
    { label: 'Features', id: 'features' },
    { label: 'Intelligence', id: 'intelligence' }
  ];

  return (
    <>
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 ${
          scrolled 
            ? 'bg-slate-950/70 border-b border-white/10 backdrop-blur-md py-3 shadow-[0_4px_30px_rgba(0,0,0,0.4)]' 
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group relative z-50">
            <Logo size={28} showText={true} textClass="text-xl" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => handleNavClick(e, link.id)}
                className="text-sm font-bold text-muted hover:text-white transition-colors relative py-1.5 group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Desktop Call To Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="px-5 py-2.5 text-sm font-bold text-white hover:text-primary transition-colors cursor-pointer"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center gap-1 group cursor-pointer"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-muted hover:text-white transition-colors focus:outline-none relative z-50"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.header>

      {/* Fullscreen Mobile Navigation Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-45 md:hidden flex flex-col pt-32 px-8 pb-10"
          >
            {/* Background lighting orbs for mobile overlay */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Mobile Navigation Links */}
            <nav className="flex flex-col gap-6 mb-12">
              {navLinks.map((link, idx) => (
                <motion.a
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => handleNavClick(e, link.id)}
                  className="text-2xl font-bold text-muted hover:text-white transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>

            {/* Mobile CTAs */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-auto space-y-4 flex flex-col"
            >
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="w-full py-4 rounded-xl border border-white/10 text-center font-bold hover:bg-white/5 transition-all text-white cursor-pointer"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setIsOpen(false)}
                className="w-full py-4 bg-primary text-white rounded-xl text-center font-bold shadow-[0_0_35px_rgba(59,130,246,0.3)] active:scale-[0.98] transition-all cursor-pointer"
              >
                Get Started Free
              </Link>
              
              <div className="flex items-center justify-center gap-1.5 pt-6 text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>AES-256 Secured Vault</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
