'use client';

interface WorkflowSectionProps {
  currentLanguage: string;
}

const translations = {
  en: {
    title: "How TaxHelp AI Works",
    subtitle: "Our advanced AI system guides you through every step of the tax filing process",
    steps: [
      {
        title: "Language Detection",
        description: "AI automatically detects your document language"
      },
      {
        title: "Upload Tax Documents",
        description: "Securely upload W-2, 1099, and other tax forms"
      },
      {
        title: "OCR + Classification",
        description: "Advanced OCR extracts and classifies your data"
      },
      {
        title: "Data Extraction + Validation",
        description: "AI validates and organizes your tax information"
      },
      {
        title: "Adaptive Q&A",
        description: "Smart questions to maximize your deductions"
      },
      {
        title: "Tax & Benefits Engine",
        description: "Calculate taxes and identify all eligible benefits"
      },
      {
        title: "Draft Return Builder",
        description: "Generate your complete tax return draft"
      },
      {
        title: "Review & Export",
        description: "Review and export your finalized tax return"
      },
      {
        title: "Consent & Retention",
        description: "Secure storage with your consent for future use"
      }
    ]
  },
  es: {
    title: "Cómo Funciona TaxHelp AI",
    subtitle: "Nuestro sistema de IA avanzado te guía a través de cada paso del proceso de declaración de impuestos",
    steps: [
      {
        title: "Detección de Idioma",
        description: "La IA detecta automáticamente el idioma de tu documento"
      },
      {
        title: "Subir Documentos Fiscales",
        description: "Sube de forma segura W-2, 1099 y otros formularios fiscales"
      },
      {
        title: "OCR + Clasificación",
        description: "OCR avanzado extrae y clasifica tus datos"
      },
      {
        title: "Extracción + Validación de Datos",
        description: "La IA valida y organiza tu información fiscal"
      },
      {
        title: "Q&A Adaptativo",
        description: "Preguntas inteligentes para maximizar tus deducciones"
      },
      {
        title: "Motor de Impuestos y Beneficios",
        description: "Calcula impuestos e identifica todos los beneficios elegibles"
      },
      {
        title: "Constructor de Borrador de Declaración",
        description: "Genera tu borrador completo de declaración de impuestos"
      },
      {
        title: "Revisar y Exportar",
        description: "Revisa y exporta tu declaración de impuestos finalizada"
      },
      {
        title: "Consentimiento y Retención",
        description: "Almacenamiento seguro con tu consentimiento para uso futuro"
      }
    ]
  },
  fr: {
    title: "Comment Fonctionne TaxHelp AI",
    subtitle: "Notre système IA avancé vous guide à travers chaque étape du processus de déclaration fiscale",
    steps: [
      {
        title: "Détection de Langue",
        description: "L'IA détecte automatiquement la langue de votre document"
      },
      {
        title: "Télécharger Documents Fiscaux",
        description: "Téléchargez en toute sécurité W-2, 1099 et autres formulaires fiscaux"
      },
      {
        title: "OCR + Classification",
        description: "OCR avancé extrait et classifie vos données"
      },
      {
        title: "Extraction + Validation des Données",
        description: "L'IA valide et organise vos informations fiscales"
      },
      {
        title: "Q&R Adaptatif",
        description: "Questions intelligentes pour maximiser vos déductions"
      },
      {
        title: "Moteur Fiscal et Avantages",
        description: "Calcule les impôts et identifie tous les avantages éligibles"
      },
      {
        title: "Constructeur de Brouillon de Déclaration",
        description: "Génère votre brouillon complet de déclaration fiscale"
      },
      {
        title: "Réviser et Exporter",
        description: "Révisez et exportez votre déclaration fiscale finalisée"
      },
      {
        title: "Consentement et Rétention",
        description: "Stockage sécurisé avec votre consentement pour usage futur"
      }
    ]
  },
  ar: {
    title: "كيف يعمل TaxHelp AI",
    subtitle: "نظام الذكاء الاصطناعي المتقدم لدينا يرشدك خلال كل خطوة من عملية تقديم الضرائب",
    steps: [
      {
        title: "كشف اللغة",
        description: "الذكاء الاصطناعي يكتشف تلقائياً لغة مستندك"
      },
      {
        title: "رفع المستندات الضريبية",
        description: "ارفع بأمان W-2، 1099 ونماذج ضريبية أخرى"
      },
      {
        title: "OCR + التصنيف",
        description: "OCR متقدم يستخرج ويصنف بياناتك"
      },
      {
        title: "استخراج البيانات + التحقق",
        description: "الذكاء الاصطناعي يتحقق وينظم معلوماتك الضريبية"
      },
      {
        title: "أسئلة وأجوبة تكيفية",
        description: "أسئلة ذكية لتعظيم خصوماتك"
      },
      {
        title: "محرك الضرائب والمزايا",
        description: "احسب الضرائب وحدد جميع المزايا المؤهلة"
      },
      {
        title: "منشئ مسودة الإقرار",
        description: "أنشئ مسودة إقرارك الضريبي الكاملة"
      },
      {
        title: "مراجعة وتصدير",
        description: "راجع وصدّر إقرارك الضريبي المنجز"
      },
      {
        title: "الموافقة والاحتفاظ",
        description: "تخزين آمن بموافقتك للاستخدام المستقبلي"
      }
    ]
  },
  ru: {
    title: "Как Работает TaxHelp AI",
    subtitle: "Наша передовая система ИИ проводит вас через каждый шаг процесса подачи налогов",
    steps: [
      {
        title: "Определение Языка",
        description: "ИИ автоматически определяет язык вашего документа"
      },
      {
        title: "Загрузка Налоговых Документов",
        description: "Безопасно загружайте W-2, 1099 и другие налоговые формы"
      },
      {
        title: "OCR + Классификация",
        description: "Продвинутый OCR извлекает и классифицирует ваши данные"
      },
      {
        title: "Извлечение + Проверка Данных",
        description: "ИИ проверяет и организует вашу налоговую информацию"
      },
      {
        title: "Адаптивные Вопросы-Ответы",
        description: "Умные вопросы для максимизации ваших вычетов"
      },
      {
        title: "Налоговый Движок и Льготы",
        description: "Рассчитывает налоги и определяет все доступные льготы"
      },
      {
        title: "Конструктор Черновика Декларации",
        description: "Генерирует полный черновик вашей налоговой декларации"
      },
      {
        title: "Проверка и Экспорт",
        description: "Проверьте и экспортируйте вашу финальную налоговую декларацию"
      },
      {
        title: "Согласие и Хранение",
        description: "Безопасное хранение с вашего согласия для будущего использования"
      }
    ]
  },
  zh: {
    title: "TaxHelp AI 如何工作",
    subtitle: "我们先进的AI系统指导您完成税务申报流程的每一步",
    steps: [
      {
        title: "语言检测",
        description: "AI自动检测您文档的语言"
      },
      {
        title: "上传税务文档",
        description: "安全上传W-2、1099和其他税务表格"
      },
      {
        title: "OCR + 分类",
        description: "先进的OCR提取并分类您的数据"
      },
      {
        title: "数据提取 + 验证",
        description: "AI验证并整理您的税务信息"
      },
      {
        title: "自适应问答",
        description: "智能问题以最大化您的扣除额"
      },
      {
        title: "税务和福利引擎",
        description: "计算税款并识别所有符合条件的福利"
      },
      {
        title: "申报草稿构建器",
        description: "生成您完整的税务申报草稿"
      },
      {
        title: "审查和导出",
        description: "审查并导出您最终的税务申报"
      },
      {
        title: "同意和保留",
        description: "经您同意的安全存储以供将来使用"
      }
    ]
  },
  hi: {
    title: "TaxHelp AI कैसे काम करता है",
    subtitle: "हमारी उन्नत AI प्रणाली आपको कर फाइलिंग प्रक्रिया के हर चरण में मार्गदर्शन करती है",
    steps: [
      {
        title: "भाषा पहचान",
        description: "AI स्वचालित रूप से आपके दस्तावेज़ की भाषा का पता लगाता है"
      },
      {
        title: "कर दस्तावेज़ अपलोड करें",
        description: "W-2, 1099 और अन्य कर फॉर्म सुरक्षित रूप से अपलोड करें"
      },
      {
        title: "OCR + वर्गीकरण",
        description: "उन्नत OCR आपके डेटा को निकालता और वर्गीकृत करता है"
      },
      {
        title: "डेटा निष्कर्षण + सत्यापन",
        description: "AI आपकी कर जानकारी को सत्यापित और व्यवस्थित करता है"
      },
      {
        title: "अनुकूली प्रश्नोत्तर",
        description: "आपकी कटौती को अधिकतम करने के लिए स्मार्ट प्रश्न"
      },
      {
        title: "कर और लाभ इंजन",
        description: "करों की गणना करें और सभी योग्य लाभों की पहचान करें"
      },
      {
        title: "ड्राफ्ट रिटर्न बिल्डर",
        description: "अपना पूरा कर रिटर्न ड्राफ्ट तैयार करें"
      },
      {
        title: "समीक्षा और निर्यात",
        description: "अपने अंतिम कर रिटर्न की समीक्षा करें और निर्यात करें"
      },
      {
        title: "सहमति और प्रतिधारण",
        description: "भविष्य के उपयोग के लिए आपकी सहमति से सुरक्षित भंडारण"
      }
    ]
  }
};

export default function WorkflowSection({ currentLanguage }: WorkflowSectionProps) {
  const t = translations[currentLanguage as keyof typeof translations] || translations.en;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.title}</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{t.subtitle}</p>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-blue-200 h-full"></div>
          
          <div className="space-y-12">
            {t.steps.map((step, index) => (
              <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
                
                <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full border-4 border-white shadow-lg">
                  <span className="text-white font-bold text-lg">{index + 1}</span>
                </div>
                
                <div className="w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}