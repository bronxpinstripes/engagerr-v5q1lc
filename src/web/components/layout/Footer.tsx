import React from 'react';
import Link from 'next/link';
import { Twitter, Instagram, Linkedin, Youtube, Facebook } from 'lucide-react';
import { cn } from '../../lib/utils';

type FooterProps = {
  className?: string;
};

type FooterLink = {
  label: string;
  href: string;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

type SocialLink = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

const Footer = ({ className }: FooterProps) => {
  // Define footer sections with links
  const footerSections: FooterSection[] = [
    {
      title: 'About',
      links: [
        { label: 'Our Story', href: '/about' },
        { label: 'Features', href: '/features' },
        { label: 'How It Works', href: '/how-it-works' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Blog', href: '/blog' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Cookie Policy', href: '/cookies' },
        { label: 'Accessibility', href: '/accessibility' }
      ]
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', href: '/help' },
        { label: 'Contact Us', href: '/contact' },
        { label: 'FAQs', href: '/faqs' },
        { label: 'Creator Resources', href: '/resources' },
        { label: 'Brand Resources', href: '/brand-resources' }
      ]
    }
  ];

  // Define social media links
  const socialLinks: SocialLink[] = [
    { name: 'Twitter', href: 'https://twitter.com/engagerr', icon: <Twitter size={20} aria-hidden="true" /> },
    { name: 'Instagram', href: 'https://instagram.com/engagerr', icon: <Instagram size={20} aria-hidden="true" /> },
    { name: 'LinkedIn', href: 'https://linkedin.com/company/engagerr', icon: <Linkedin size={20} aria-hidden="true" /> },
    { name: 'YouTube', href: 'https://youtube.com/engagerr', icon: <Youtube size={20} aria-hidden="true" /> },
    { name: 'Facebook', href: 'https://facebook.com/engagerr', icon: <Facebook size={20} aria-hidden="true" /> }
  ];

  return (
    <footer className={cn('bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800', className)}>
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Upper section with link columns and logo */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
          {/* Logo and description */}
          <div className="md:col-span-4">
            <Link href="/" className="inline-block">
              <h2 className="text-2xl font-bold text-primary">Engagerr</h2>
            </Link>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-md">
              Connecting creators and brands through comprehensive content relationship mapping and data-driven partnerships.
            </p>
          </div>

          {/* Link sections */}
          <div className="md:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {footerSections.map((section) => (
                <div key={section.title}>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{section.title}</h3>
                  <ul className="space-y-2">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        <Link 
                          href={link.href} 
                          className="text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors focus:outline-none focus:text-primary dark:focus:text-primary"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Social media links */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            {socialLinks.map((link) => (
              <a 
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Follow us on ${link.name}`}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-800 mb-8"></div>

        {/* Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center text-gray-600 dark:text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Engagerr. All rights reserved.</p>
          <div className="mt-4 md:mt-0 flex space-x-4">
            <Link 
              href="/terms" 
              className="hover:text-primary dark:hover:text-primary transition-colors focus:outline-none focus:text-primary dark:focus:text-primary"
            >
              Terms
            </Link>
            <Link 
              href="/privacy" 
              className="hover:text-primary dark:hover:text-primary transition-colors focus:outline-none focus:text-primary dark:focus:text-primary"
            >
              Privacy
            </Link>
            <Link 
              href="/cookies" 
              className="hover:text-primary dark:hover:text-primary transition-colors focus:outline-none focus:text-primary dark:focus:text-primary"
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;