'use client';

import { useState } from 'react';
import Link from 'next/link';

interface HeroSectionProps {
  currentLanguage: string;
}

const translations = {
  en: {
    title: "AI-Powered Tax Filing for Everyone — Simple, Accurate, Affordable",
    subtitle:
      "File your taxes with a multilingual AI assistant designed for gig workers, families, seniors, immigrants, and low-income households.",
    supportLine:
      "Upload your W-2, 1099, or receipts — get instant calculations — file with confidence.",
    uploadBtn: "Start Filing Now",
    startBtn: "Upload Tax Documents",
    dragText: "Drag & drop your tax documents here or click to browse",
    supportedFiles: "Supports PDF, JPG, PNG (Max 10MB)",
    features: ["Bank-level Security", "Global Coverage", "24/7 Support"]
  },
  es: {
    title: "AI-Powered Tax Filing for Everyone — Simple, Accurate, Affordable",
    subtitle:
      "File your taxes with a multilingual AI assistant designed for gig workers, families, seniors, immigrants, and low-income households.",
    supportLine:
      "Upload your W-2, 1099, or receipts — get instant calculations — file with confidence.",
    uploadBtn: "Start Filing Now",
    startBtn: "Upload Tax Documents",
    dragText: "Arrastra y suelta tus documentos fiscales aquí o haz clic para navegar",
    supportedFiles: "Soporta PDF, JPG, PNG (Máx 10MB)",
    features: ["Seguridad Bancaria", "Cobertura Global", "Soporte 24/7"]
  },
  fr: {
    title: "AI-Powered Tax Filing for Everyone — Simple, Accurate, Affordable",
    subtitle:
      "File your taxes with a multilingual AI assistant designed for gig workers, families, seniors, immigrants, and low-income households.",
    supportLine:
      "Upload your W-2, 1099, or receipts — get instant calculations — file with confidence.",
    uploadBtn: "Start Filing Now",
    startBtn: "Upload Tax Documents",
    dragText: "Glissez-déposez vos documents fiscaux ici ou cliquez pour parcourir",
    supportedFiles: "Supporte PDF, JPG, PNG (Max 10MB)",
    features: ["Sécurité Bancaire", "Couverture Mondiale", "Support 24/7"]
  },
  ar: {
    title: "AI-Powered Tax Filing for Everyone — Simple, Accurate, Affordable",
    subtitle:
      "File your taxes with a multilingual AI assistant designed for gig workers, families, seniors, immigrants, and low-income households.",
    supportLine:
      "Upload your W-2, 1099, or receipts — get instant calculations — file with confidence.",
    uploadBtn: "Start Filing Now",
    startBtn: "Upload Tax Documents",
    dragText: "اسحب وأفلت مستنداتك الضريبية هنا أو انقر للتصفح",
    supportedFiles: "يدعم PDF, JPG, PNG (حد أقصى 10 ميجابايت)",
    features: ["أمان مصرفي", "تغطية عالمية", "دعم 24/7"]
  },
  ru: {
    title: "AI-Powered Tax Filing for Everyone — Simple, Accurate, Affordable",
    subtitle:
      "File your taxes with a multilingual AI assistant designed for gig workers, families, seniors, immigrants, and low-income households.",
    supportLine:
      "Upload your W-2, 1099, or receipts — get instant calculations — file with confidence.",
    uploadBtn: "Start Filing Now",
    startBtn: "Upload Tax Documents",
    dragText: "Перетащите налоговые документы сюда или нажмите для просмотра",
    supportedFiles: "Поддерживает PDF, JPG, PNG (Макс 10МБ)",
    features: ["Банковская Безопасность", "Глобальное Покрытие", "Поддержка 24/7"]
  },
  zh: {
    title: "AI-Powered Tax Filing for Everyone — Simple, Accurate, Affordable",
    subtitle:
      "File your taxes with a multilingual AI assistant designed for gig workers, families, seniors, immigrants, and low-income households.",
    supportLine:
      "Upload your W-2, 1099, or receipts — get instant calculations — file with confidence.",
    uploadBtn: "Start Filing Now",
    startBtn: "Upload Tax Documents",
    dragText: "将税务文档拖放到此处或点击浏览",
    supportedFiles: "支持PDF、JPG、PNG（最大10MB）",
    features: ["银行级安全", "全球覆盖", "24/7支持"]
  },
  hi: {
    title: "AI-Powered Tax Filing for Everyone — Simple, Accurate, Affordable",
    subtitle:
      "File your taxes with a multilingual AI assistant designed for gig workers, families, seniors, immigrants, and low-income households.",
    supportLine:
      "Upload your W-2, 1099, or receipts — get instant calculations — file with confidence.",
    uploadBtn: "Start Filing Now",
    startBtn: "Upload Tax Documents",
    dragText: "अपने कर दस्तावेज़ों को यहाँ खींचें और छोड़ें या ब्राउज़ करने के लिए क्लिक करें",
    supportedFiles: "PDF, JPG, PNG समर्थित (अधिकतम 10MB)",
    features: ["बैंक-स्तरीय सुरक्षा", "वैश्विक कवरेज", "24/7 सहायता"]
  }
};

export default function HeroSection({ currentLanguage }: HeroSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const t = translations[currentLanguage as keyof typeof translations] || translations.en;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size <= 10 * 1024 * 1024) {
        console.log('File uploaded:', file.name);
      }
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{
          backgroundImage: `url('https://readdy.ai/api/search-image?query=Professional%20modern%20office%20workspace%20with%20digital%20tax%20forms%20floating%20in%20the%20air%2C%20AI%20automation%20symbols%2C%20clean%20minimalist%20background%20with%20soft%20blue%20and%20white%20colors%2C%20people%20working%20on%20laptops%20with%20tax%20documents%2C%20futuristic%20technology%20interface%2C%20high-tech%20financial%20dashboard%2C%20professional%20business%20environment&width=1920&height=1080&seq=hero-bg&orientation=landscape')`
        }}
      />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {t.title}
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed mb-4">{t.subtitle}</p>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">{t.supportLine}</p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/file-taxes">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg whitespace-nowrap">
                  <i className="ri-upload-cloud-line mr-2"></i>
                  {t.uploadBtn}
                </button>
              </Link>
              <Link href="/register">
                <button className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 whitespace-nowrap">
                  {t.startBtn}
                </button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-6">
              {t.features.map((feature, index) => (
                <div key={index} className="flex items-center text-gray-700">
                  <i className="ri-check-line text-green-500 mr-2 text-xl"></i>
                  <span className="font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400 bg-white'
                } shadow-lg`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-blue-100 rounded-full">
                  <i className="ri-file-upload-line text-2xl text-blue-600"></i>
                </div>
                <p className="text-gray-700 font-medium mb-2">{t.dragText}</p>
                <p className="text-sm text-gray-500 mb-4">{t.supportedFiles}</p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  id="file-upload"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      console.log('File selected:', e.target.files[0].name);
                    }
                  }}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors duration-300 whitespace-nowrap"
                >
                  <i className="ri-folder-open-line mr-2"></i>
                  Browse Files
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}