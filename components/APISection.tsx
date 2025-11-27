'use client';

interface APISectionProps {
  currentLanguage: string;
}

const translations = {
  en: {
    title: "API Integration",
    subtitle: "Seamless integration with our powerful tax processing API",
    inputTitle: "Sample Input",
    outputTitle: "Sample Output",
    description: "Our REST API processes tax documents and returns structured data with calculations, validations, and recommendations."
  },
  es: {
    title: "Integración de API",
    subtitle: "Integración perfecta con nuestra poderosa API de procesamiento de impuestos",
    inputTitle: "Entrada de Muestra",
    outputTitle: "Salida de Muestra",
    description: "Nuestra API REST procesa documentos fiscales y devuelve datos estructurados con cálculos, validaciones y recomendaciones."
  },
  fr: {
    title: "Intégration API",
    subtitle: "Intégration transparente avec notre puissante API de traitement fiscal",
    inputTitle: "Entrée d'Exemple",
    outputTitle: "Sortie d'Exemple",
    description: "Notre API REST traite les documents fiscaux et renvoie des données structurées avec calculs, validations et recommandations."
  },
  ar: {
    title: "تكامل API",
    subtitle: "تكامل سلس مع API معالجة الضرائب القوي لدينا",
    inputTitle: "مدخل عينة",
    outputTitle: "مخرج عينة",
    description: "تعالج API REST الخاصة بنا المستندات الضريبية وترجع بيانات منظمة مع الحسابات والتحققات والتوصيات."
  },
  ru: {
    title: "Интеграция API",
    subtitle: "Бесшовная интеграция с нашим мощным API обработки налогов",
    inputTitle: "Пример Входных Данных",
    outputTitle: "Пример Выходных Данных",
    description: "Наш REST API обрабатывает налоговые документы и возвращает структурированные данные с расчетами, проверками и рекомендациями."
  },
  zh: {
    title: "API集成",
    subtitle: "与我们强大的税务处理API无缝集成",
    inputTitle: "示例输入",
    outputTitle: "示例输出",
    description: "我们的REST API处理税务文档并返回带有计算、验证和建议的结构化数据。"
  },
  hi: {
    title: "API एकीकरण",
    subtitle: "हमारे शक्तिशाली कर प्रसंस्करण API के साथ निर्बाध एकीकरण",
    inputTitle: "नमूना इनपुट",
    outputTitle: "नमूना आउटपुट",
    description: "हमारा REST API कर दस्तावेजों को संसाधित करता है और गणना, सत्यापन और सिफारिशों के साथ संरचित डेटा लौटाता है।"
  }
};

export default function APISection({ currentLanguage }: APISectionProps) {
  const t = translations[currentLanguage as keyof typeof translations] || translations.en;

  const sampleInput = `{
  "document_type": "W2",
  "tax_year": 2024,
  "taxpayer": {
    "name": "John Doe",
    "ssn": "***-**-1234",
    "filing_status": "single"
  },
  "income": {
    "wages": 75000,
    "federal_tax_withheld": 12500,
    "state_tax_withheld": 3750
  },
  "deductions": {
    "standard_deduction": true,
    "itemized": []
  }
}`;

  const sampleOutput = `{
  "status": "success",
  "tax_calculation": {
    "adjusted_gross_income": 75000,
    "taxable_income": 61350,
    "federal_tax_owed": 8742,
    "refund_amount": 3758,
    "effective_tax_rate": 11.66
  },
  "recommendations": [
    "Consider contributing to IRA for additional deductions",
    "You may qualify for Earned Income Tax Credit"
  ],
  "compliance_check": {
    "valid": true,
    "warnings": [],
    "required_forms": ["1040", "W2"]
  }
}`;

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.title}</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">{t.subtitle}</p>
          <p className="text-gray-600 max-w-4xl mx-auto">{t.description}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <i className="ri-code-line mr-2"></i>
                {t.inputTitle}
              </h3>
            </div>
            <div className="p-6">
              <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="language-json text-gray-800">{sampleInput}</code>
              </pre>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <i className="ri-code-s-slash-line mr-2"></i>
                {t.outputTitle}
              </h3>
            </div>
            <div className="p-6">
              <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="language-json text-gray-800">{sampleOutput}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center bg-blue-50 rounded-full px-6 py-3 border border-blue-200">
            <i className="ri-shield-check-line text-blue-600 mr-2"></i>
            <span className="text-blue-800 font-medium">Bank-level Security • 99.9% Uptime • Global Coverage</span>
          </div>
        </div>
      </div>
    </section>
  );
}