import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, PhoneCall, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
};

const ChatbotDemo = () => {
  const [messages, setMessages] = useState<Message[]>([{
    id: 1,
    sender: 'bot',
    text: "Hello! I'm **SafetyBot**, your AI assistant for public safety in Indianapolis.\n\nHow can I help you today?",
    timestamp: new Date()
  }]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessage, setTypingMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [safetyMode, setSafetyMode] = useState<'home' | 'workplace' | 'child' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, suggestions]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (typingMessage) {
      let i = 0;
      interval = setInterval(() => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.isTyping) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...last,
              text: typingMessage.slice(0, i + 1)
            };
            return updated;
          }
          return prev;
        });
        i++;
        if (i >= typingMessage.length) clearInterval(interval);
      }, 20);
    }
    return () => clearInterval(interval);
  }, [typingMessage]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMessage: Message = {
      id: messages.length + 1,
      sender: 'user',
      text,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setSuggestions([]);

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode: safetyMode })
      });

      const data = await response.json();
      const replyText = data.reply || 'Sorry, I couldn’t understand that.';
      const followUps: string[] = Array.isArray(data.followUps) ? data.followUps : [];

      const typingPlaceholder: Message = {
        id: messages.length + 2,
        sender: 'bot',
        text: '',
        timestamp: new Date(),
        isTyping: true
      };

      setMessages((prev) => [...prev, typingPlaceholder]);
      setTypingMessage(replyText);

      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.isTyping ? { ...msg, text: replyText, isTyping: false } : msg
          )
        );
        setSuggestions(followUps);
        setIsLoading(false);
      }, replyText.length * 20 + 300);
    } catch (err) {
      console.error('Error:', err);
      setMessages((prev) => [...prev, {
        id: messages.length + 2,
        sender: 'bot',
        text: '⚠️ Something went wrong. Please try again later.',
        timestamp: new Date()
      }]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage(inputText);
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => alert(`📍 Latitude: ${pos.coords.latitude}, Longitude: ${pos.coords.longitude}`),
        () => alert('❌ Location permission denied.')
      );
    } else {
      alert('Geolocation not supported.');
    }
  };

  const quickActions = [
    'Fire emergency procedures',
    'Report suspicious activity',
    'Natural disaster guidance',
    'Emergency contacts'
  ];

  const sendQuickMessage = (text: string) => {
    handleSendMessage(text);
  };

  if (emergencyMode) {
    return (
      <section className="bg-red-50 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="bg-white shadow-2xl rounded-3xl max-w-2xl w-full p-8 sm:p-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-red-600 mb-6">
            🚨 Emergency Mode Activated
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            If you're in immediate danger, dial <span className="font-bold text-black">911</span> now.
          </p>
          <ul className="space-y-4 text-gray-800 text-base list-disc list-inside">
            <li>Stay calm and move to a safe location.</li>
            <li>Alert others nearby.</li>
            <li>Call emergency services and share your location.</li>
            <li>
              <button onClick={handleShareLocation} className="inline-flex items-center gap-2 text-blue-600 hover:underline">
                <MapPin className="w-5 h-5" /> Share My Location
              </button>
            </li>
            <li>
              <a href="tel:911" className="inline-flex items-center gap-2 text-red-600 hover:underline">
                <PhoneCall className="w-5 h-5" /> Call 911 Now
              </a>
            </li>
          </ul>
          <div className="mt-10 flex justify-center">
            <button onClick={() => setEmergencyMode(false)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold">
              Exit Emergency Mode
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gray-50" id="demo">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Try SafetyBot Demo</h2>
          <p className="text-gray-600">Ask about public safety in Indianapolis</p>
        </div>

        <div className="mb-4 text-center space-x-2">
          <button onClick={() => setEmergencyMode(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700">
            🚨 Emergency
          </button>
          {['home', 'workplace', 'child'].map((mode) => (
            <button
              key={mode}
              onClick={() => setSafetyMode(mode as any)}
              className={`px-4 py-2 rounded-lg font-semibold ${safetyMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {mode === 'home' && '🏠 Home'}
              {mode === 'workplace' && '🏢 Workplace'}
              {mode === 'child' && '🚸 Child Safety'}
            </button>
          ))}
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="bg-blue-600 text-white p-4 flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">SafetyBot</h3>
              <p className="text-xs text-blue-200">Public Safety AI</p>
            </div>
          </div>

          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-2 max-w-[75%] ${m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`p-2 rounded-full ${m.sender === 'user' ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    {m.sender === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-gray-600" />}
                  </div>
                  <div className={`p-3 rounded-lg ${m.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                    <div className={`text-xs mt-1 ${m.sender === 'user' ? 'text-blue-200 text-right' : 'text-gray-500 text-left'}`}>
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about public safety..."
                disabled={isLoading}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
              />
              <button
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => sendQuickMessage(qa)}
                  disabled={isLoading}
                  className="bg-gray-100 px-3 py-1 rounded-full text-sm hover:bg-gray-200"
                >
                  {qa}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendQuickMessage(s)}
                  className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm hover:bg-blue-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChatbotDemo;
