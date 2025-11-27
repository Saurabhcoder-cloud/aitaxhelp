'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Newsletter Section */}
      <div className="bg-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="relative max-w-lg">
              <input
                type="email"
                placeholder="Email address to Subscribe"
                className="w-full px-6 py-4 rounded-full text-gray-900 pr-32"
              />
              <button className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition-colors">
                Subscribe
              </button>
            </div>
            <div className="flex justify-center lg:justify-end space-x-4">
              <a href="#" className="w-12 h-12 flex items-center justify-center bg-blue-600 rounded-full hover:bg-blue-700 transition-colors cursor-pointer">
                <i className="ri-facebook-fill text-xl"></i>
              </a>
              <a href="#" className="w-12 h-12 flex items-center justify-center bg-blue-600 rounded-full hover:bg-blue-700 transition-colors cursor-pointer">
                <i className="ri-twitter-fill text-xl"></i>
              </a>
              <a href="https://www.instagram.com/tradenetsolutions/" target="_blank" className="w-12 h-12 flex items-center justify-center bg-blue-600 rounded-full hover:bg-blue-700 transition-colors cursor-pointer">
                <i className="ri-instagram-fill text-xl"></i>
              </a>
              <a href="#" className="w-12 h-12 flex items-center justify-center bg-blue-600 rounded-full hover:bg-blue-700 transition-colors cursor-pointer">
                <i className="ri-linkedin-fill text-xl"></i>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <Link href="/" className="flex items-center mb-6">
                <img 
                  src="https://tradenetsolution.com/assets/images/17528207731745724405tradenet-logo(1).png"
                  alt="TradeNet Solution"
                  className="h-10 brightness-0 invert"
                />
              </Link>
              <div className="relative mb-6">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 rounded-full text-gray-900 pr-24"
                />
                <button className="absolute right-2 top-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full transition-colors text-sm">
                  SignUp
                </button>
              </div>
            </div>

            {/* About Us */}
            <div>
              <h4 className="text-xl font-bold mb-6">About Us</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/privacy" className="text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center">
                    <i className="ri-arrow-right-s-line mr-2"></i>
                    Privacy & Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center">
                    <i className="ri-arrow-right-s-line mr-2"></i>
                    Terms & Condition
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center">
                    <i className="ri-arrow-right-s-line mr-2"></i>
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <Link href="/sitemap" className="text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center">
                    <i className="ri-arrow-right-s-line mr-2"></i>
                    Sitemap
                  </Link>
                </li>
              </ul>
            </div>

            {/* Products */}
            <div>
              <h4 className="text-xl font-bold mb-6">Products</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/category/paper-products" className="text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center">
                    <i className="ri-arrow-right-s-line mr-2"></i>
                    Paper & Paper Products
                  </Link>
                </li>
                <li>
                  <Link href="/category/plastic-products" className="text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center">
                    <i className="ri-arrow-right-s-line mr-2"></i>
                    Plastic Products
                  </Link>
                </li>
                <li>
                  <Link href="/category/automobiles" className="text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center">
                    <i className="ri-arrow-right-s-line mr-2"></i>
                    Automobiles & Accessories
                  </Link>
                </li>
                <li>
                  <Link href="/category/furniture" className="text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center">
                    <i className="ri-arrow-right-s-line mr-2"></i>
                    Furniture
                  </Link>
                </li>
                <li>
                  <Link href="/category/lighting" className="text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center">
                    <i className="ri-arrow-right-s-line mr-2"></i>
                    Lighting
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-xl font-bold mb-6">Contact Info</h4>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <i className="ri-map-pin-line text-blue-400 mr-3 mt-1"></i>
                  <span className="text-gray-300">
                    1000 4Th, Office #410,<br />
                    San Rafael, CA 94901, USA
                  </span>
                </li>
                <li className="flex items-center">
                  <i className="ri-phone-line text-blue-400 mr-3"></i>
                  <a href="tel:+14152503828" className="text-gray-300 hover:text-white transition-colors cursor-pointer">
                    (415) 250-3828
                  </a>
                </li>
                <li className="flex items-center">
                  <i className="ri-mail-line text-blue-400 mr-3"></i>
                  <a href="mailto:support@taxhelp-ai.com" className="text-gray-300 hover:text-white transition-colors cursor-pointer">
                    support@taxhelp-ai.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400">
              <i className="ri-copyright-line mr-2"></i>
              <Link href="/" className="hover:text-white transition-colors cursor-pointer">
                TaxHelp AI
              </Link>
              , All rights reserved.
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
              <div className="text-gray-400">
                <Link 
                  href="https://readdy.ai/?origin=logo" 
                  target="_blank"
                  className="text-white hover:text-blue-400 transition-colors cursor-pointer"
                >
                  Made with Readdy
                </Link>
              </div>
              <div className="text-xs text-gray-500 text-center md:text-right">
                The intellectual property used in creating this website is protected in accordance with U.S. law.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}