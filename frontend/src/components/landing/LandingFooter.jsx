import { BRANDING } from '../../config/branding';
import Logo from '../Logo';
import { Globe, Code, Briefcase, Mail, Shield, Zap, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[#0f172a] pt-32 pb-20 px-6 overflow-hidden">
      {/* Footer Top Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
          {/* Brand Column */}
          <div className="col-span-1 lg:col-span-1">
            <div className="flex items-center gap-3 mb-8">
              <Logo size={32} showText={true} textClass="text-2xl" />
            </div>
            <p className="text-muted text-sm leading-relaxed mb-8 max-w-xs">
              {BRANDING.META_DESCRIPTION} Built for the next generation of financial intelligence and security.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2.5 glass-premium rounded-xl text-muted hover:text-white transition-all hover:scale-110">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="p-2.5 glass-premium rounded-xl text-muted hover:text-white transition-all hover:scale-110">
                <Code className="w-5 h-5" />
              </a>
              <a href="#" className="p-2.5 glass-premium rounded-xl text-muted hover:text-white transition-all hover:scale-110">
                <Briefcase className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="text-white font-bold mb-8 text-sm uppercase tracking-widest">Product</h4>
            <ul className="space-y-4">
              <li><Link to="/signup" className="text-muted hover:text-primary transition-colors text-sm">Create Account</Link></li>
              <li><Link to="/login" className="text-muted hover:text-primary transition-colors text-sm">Sign In</Link></li>
              <li><a href="#dashboard-showcase" className="text-muted hover:text-primary transition-colors text-sm">Dashboard Preview</a></li>
              <li><a href="#" className="text-muted hover:text-primary transition-colors text-sm">Security Vault</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-8 text-sm uppercase tracking-widest">Company</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-muted hover:text-primary transition-colors text-sm">About NEXVAULT</a></li>
              <li><a href="#" className="text-muted hover:text-primary transition-colors text-sm">Brand Identity</a></li>
              <li><a href="#" className="text-muted hover:text-primary transition-colors text-sm">Privacy Policy</a></li>
              <li><a href="#" className="text-muted hover:text-primary transition-colors text-sm">Terms of Service</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-8 text-sm uppercase tracking-widest">Support</h4>
            <ul className="space-y-4">
              <li><Link to="/help" className="text-muted hover:text-primary transition-colors text-sm flex items-center gap-2"><Mail className="w-4 h-4" /> Help Center</Link></li>
              <li><Link to="/trust" className="text-muted hover:text-primary transition-colors text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Trust Center</Link></li>
              <li><Link to="/status" className="text-muted hover:text-primary transition-colors text-sm flex items-center gap-2"><Zap className="w-4 h-4" /> System Status</Link></li>
              <li><Link to="/docs" className="text-muted hover:text-primary transition-colors text-sm flex items-center gap-2"><Info className="w-4 h-4" /> Documentation</Link></li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-12 border-t border-white/5">
          <div className="text-muted text-xs font-medium">
            © {currentYear} {BRANDING.NAME} Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-8 text-xs font-bold text-muted uppercase tracking-[0.2em]">
            <span>Secured with AES-256</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Fintech Grade AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
