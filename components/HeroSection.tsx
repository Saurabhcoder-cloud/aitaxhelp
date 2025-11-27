'use client';

import { useState } from 'react';
import Link from 'next/link';

interface HeroSectionProps {
  currentLanguage: string;
}

const translations = {
  en: {
    title: "AI-Powered Global Tax Filing Made Simple",
    subtitle: "Automate your tax filing process with advanced AI technology. Upload documents, get instant calculations, and file with confidence.",
    uploadBtn: "Upload Your Tax Documents",
    startBtn: "Start Free",
    dragText: "Drag & drop your tax documents here or click to browse",
    supportedFiles: "Supports PDF, JPG, PNG (Max 10MB)",
    features: ["Bank-level Security", "Global Coverage", "24/7 Support"]
  },
  es: {
    title: "Declaración de Impuestos Global con IA Simplificada",
    subtitle: "Automatiza tu proceso de declaración de impuestos con tecnología de IA avanzada. Sube documentos, obtén cálculos instantáneos y presenta con confianza.",
    uploadBtn: "Subir Documentos Fiscales",
    startBtn: "Comenzar Gratis",
    dragText: "Arrastra y suelta tus documentos fiscales aquí o haz clic para navegar",
    supportedFiles: "Soporta PDF, JPG, PNG (Máx 10MB)",
    features: ["Seguridad Bancaria", "Cobertura Global", "Soporte 24/7"]
  },
  fr: {
    title: "Déclaration Fiscale Mondiale IA Simplifiée",
    subtitle: "Automatisez votre processus de déclaration fiscale avec une technologie IA avancée. Téléchargez des documents, obtenez des calculs instantanés et déclarez en toute confiance.",
    uploadBtn: "Télécharger Documents Fiscaux",
    startBtn: "Commencer Gratuit",
    dragText: "Glissez-déposez vos documents fiscaux ici ou cliquez pour parcourir",
    supportedFiles: "Supporte PDF, JPG, PNG (Max 10MB)",
    features: ["Sécurité Bancaire", "Couverture Mondiale", "Support 24/7"]
  },
  ar: {
    title: "تقديم الضرائب العالمي بالذكاء الاصطناعي مبسط",
    subtitle: "أتمت عملية تقديم الضرائب الخاصة بك بتقنية الذكاء الاصطناعي المتقدمة. ارفع المستندات، احصل على حسابات فورية، وقدم بثقة.",
    uploadBtn: "رفع المستندات الضريبية",
    startBtn: "ابدأ مجاناً",
    dragText: "اسحب وأفلت مستنداتك الضريبية هنا أو انقر للتصفح",
    supportedFiles: "يدعم PDF, JPG, PNG (حد أقصى 10 ميجابايت)",
    features: ["أمان مصرفي", "تغطية عالمية", "دعم 24/7"]
  },
  ru: {
    title: "Глобальная Подача Налогов с ИИ Упрощена",
    subtitle: "Автоматизируйте процесс подачи налогов с передовой технологией ИИ. Загружайте документы, получайте мгновенные расчеты и подавайте с уверенностью.",
    uploadBtn: "Загрузить Налоговые Документы",
    startBtn: "Начать Бесплатно",
    dragText: "Перетащите налоговые документы сюда или нажмите для просмотра",
    supportedFiles: "Поддерживает PDF, JPG, PNG (Макс 10МБ)",
    features: ["Банковская Безопасность", "Глобальное Покрытие", "Поддержка 24/7"]
  },
  zh: {
    title: "AI驱动的全球税务申报简化版",
    subtitle: "使用先进的AI技术自动化您的税务申报流程。上传文档，获得即时计算，并自信地申报。",
    uploadBtn: "上传税务文档",
    startBtn: "免费开始",
    dragText: "将税务文档拖放到此处或点击浏览",
    supportedFiles: "支持PDF、JPG、PNG（最大10MB）",
    features: ["银行级安全", "全球覆盖", "24/7支持"]
  },
  hi: {
    title: "AI-संचालित वैश्विक कर फाइलिंग सरल बनाई गई",
    subtitle: "उन्नत AI तकनीक के साथ अपनी कर फाइलिंग प्रक्रिया को स्वचालित करें। दस्तावेज़ अपलोड करें, तत्काल गणना प्राप्त करें, और आत्मविश्वास के साथ फाइल करें।",
    uploadBtn: "अपने कर दस्तावेज़ अपलोड करें",
    startBtn: "मुफ्त शुरू करें",
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
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              {t.subtitle}
            </p>
            
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