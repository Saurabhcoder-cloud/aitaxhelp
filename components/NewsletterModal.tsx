'use client';

import { useState } from 'react';

interface NewsletterModalProps {
  onClose: () => void;
}

export default function NewsletterModal({ onClose }: NewsletterModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <i className="ri-close-line text-2xl"></i>
        </button>
        
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">NEWSLETTER</h1>
          <p className="text-gray-600 mb-6">
            We are a wholesale manufacturer to make different kinds of furniture and interior work for vendors.
          </p>
          
          {isSubmitted ? (
            <div className="text-green-600">
              <i className="ri-check-circle-line text-4xl mb-4"></i>
              <p className="text-lg font-semibold">Successfully subscribed!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Your Email Address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    SUBSCRIBING...
                  </span>
                ) : (
                  'SUBSCRIBE'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}