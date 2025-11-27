
'use client';

import { useState } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const taxResponses = [
  "Based on current federal tax laws, the standard deduction for 2024 is $14,600 for single filers and $29,200 for married filing jointly.",
  "Tax rates vary by state. Some states like Texas and Florida have no state income tax, while others like California have rates up to 13.3%.",
  "The Child Tax Credit provides up to $2,000 per qualifying child under 17. Income limits apply for higher earners.",
  "IRA contribution limits for 2024 are $7,000, or $8,000 if you're 50 or older. These contributions may be tax-deductible.",
  "I can help you understand tax laws and calculations. For specific refund estimates, please provide your income and withholding details.",
  "Federal tax brackets for 2024 range from 10% to 37%. Your effective tax rate depends on your total taxable income.",
  "State tax submission addresses vary by state. I can provide the correct address once you specify which state you're filing in."
];

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Hello! I\'m your AI tax assistant. I can help you understand tax laws, filing requirements, and calculations. How can I assist you today?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getRandomTaxResponse = () => {
    return taxResponses[Math.floor(Math.random() * taxResponses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText.toLowerCase();
    setInputText('');
    setIsLoading(true);

    setTimeout(() => {
      let responseText = getRandomTaxResponse();
      
      // Provide specific responses based on user input
      if (currentInput.includes('refund')) {
        responseText = "I can help calculate potential refunds when you provide specific income and withholding information. Refund amounts depend on your total tax liability versus what was withheld from your paychecks.";
      } else if (currentInput.includes('state') && currentInput.includes('law')) {
        responseText = "State tax laws vary significantly. Please specify which state you're interested in, and I can provide relevant tax information and filing requirements for that state.";
      } else if (currentInput.includes('address') || currentInput.includes('submit')) {
        responseText = "Tax return submission addresses depend on your state. Federal returns go to the IRS processing center, while state returns go to your state's tax department. Which state are you filing in?";
      } else if (currentInput.includes('deduction')) {
        responseText = "For 2024, the standard deduction is $14,600 (single) or $29,200 (married filing jointly). You can itemize if your deductions exceed these amounts.";
      }

      const aiResponse: Message = {
        id: Date.now() + 1,
        text: responseText,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg h-96 flex flex-col">
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <h3 className="font-semibold flex items-center">
          <div className="w-5 h-5 flex items-center justify-center mr-2">
            <i className="ri-robot-line"></i>
          </div>
          AI Tax Assistant
        </h3>
        <p className="text-xs text-blue-100 mt-1">Ask about tax laws, filing requirements, and calculations</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about tax laws, deductions, filing..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-send-plane-line"></i>
            </div>
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          💡 Try asking: "What are the tax brackets?" or "How do I calculate my refund?"
        </div>
      </div>
    </div>
  );
}
