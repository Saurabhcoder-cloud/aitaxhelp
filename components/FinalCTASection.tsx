'use client';

export default function FinalCTASection() {
  return (
    <section className="py-16 bg-blue-700 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Filing Your Taxes Today</h2>
        <p className="text-lg md:text-xl text-blue-100 mb-8">
          Affordable, multilingual, AI-powered tax preparation for everyone.
        </p>
        <div className="flex justify-center">
          <a
            href="#"
            className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-white text-blue-700 font-semibold text-lg shadow-md hover:shadow-lg transition-shadow"
          >
            Start Now
          </a>
        </div>
      </div>
    </section>
  );
}
