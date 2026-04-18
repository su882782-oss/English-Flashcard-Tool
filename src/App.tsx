/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  RefreshCw, 
  Trash2, 
  Code,
  Volume2,
  AlertCircle,
  CheckCircle2,
  Info,
  Sparkles,
  Play
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface FlashcardData {
  word: string;
  phonetic: string;
  example: string;
  translation: string;
}

const DEFAULT_DATA: FlashcardData[] = [
  { 
    word: "Perspective", 
    phonetic: "/pəˈspektɪv/", 
    example: "The exhibition offers a unique perspective on the war.", 
    translation: "觀點；角度" 
  },
  { 
    word: "Innovation", 
    phonetic: "/ˌɪn.əˈveɪ.ʃən/", 
    example: "Technical innovation is the key to business success.", 
    translation: "創新" 
  },
  {
    word: "Resilience",
    phonetic: "/rɪˈzɪl.jəns/",
    example: "The plant showed great resilience to the harsh winter.",
    translation: "韌性；生命力"
  }
];

export default function App() {
  const [cards, setCards] = useState<FlashcardData[]>(DEFAULT_DATA);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [wordsInput, setWordsInput] = useState(DEFAULT_DATA.map(c => c.word).join('\n'));
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const prevWordsInputRef = useRef(wordsInput);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('vocab_flip_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCards(parsed);
        setWordsInput(parsed.map((c: FlashcardData) => c.word).join('\n'));
      } catch (e) {
        console.error("Failed to load saved data", e);
      }
    }
  }, []);

  const handleUpdateData = async () => {
    const lines = wordsInput.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setErrorMessage("請輸入至少一個單字");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `對以下單字列表生成閃卡數據：\n${lines.join(', ')}`,
        config: {
          systemInstruction: "你是一位英語教學專家。請為用戶提供的單字列表生成閃卡數據。對每個單字提供：1. 國際音標 (phonetic)，2. 中文翻譯 (translation)，3. 一個簡單實用的例句 (example)。請確保數據準確且適合學習者。輸出格式必須為 JSON 數組。",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                example: { type: Type.STRING },
                translation: { type: Type.STRING }
              },
              required: ["word", "phonetic", "example", "translation"]
            }
          }
        }
      });

      const parsed = JSON.parse(response.text);
      setCards(parsed);
      setCurrentIndex(0);
      setIsFlipped(false);
      localStorage.setItem('vocab_flip_data', JSON.stringify(parsed));
      setSuccessMessage("字庫已透過 AI 更新！");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error("AI Generation Error:", e);
      setErrorMessage("生成過程中發生錯誤，請檢查網路或單字格式。");
    } finally {
      setIsGenerating(false);
    }
  };

  const playPronunciation = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const nextCard = useCallback(() => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, isFlipped ? 150 : 0);
  }, [cards.length, isFlipped]);

  const prevCard = useCallback(() => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, isFlipped ? 150 : 0);
  }, [cards.length, isFlipped]);

  const flipCard = () => setIsFlipped(!isFlipped);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'ArrowRight') nextCard();
      if (e.key === 'ArrowLeft') prevCard();
      if (e.key === ' ') {
        e.preventDefault();
        flipCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextCard, prevCard]);

  const currentCard = cards[currentIndex] || DEFAULT_DATA[0];

  return (
    <div className="min-h-screen bg-bg-polish text-text-main font-serif selection:bg-blue-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-10 py-5 bg-white border-b border-border-polish flex justify-between items-center shrink-0">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl font-bold text-primary-polish tracking-tight"
        >
          Vocabulary Flashcards
        </motion.h1>
        <div className="text-sm text-secondary-polish font-medium">
          Card {currentIndex + 1} of {cards.length}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 p-5 overflow-hidden">
        
        {/* Flashcard Section */}
        <section className="flex flex-col items-center justify-center p-4 space-y-8 overflow-y-auto">
          <div className="perspective-1000 w-full max-w-[500px] h-[320px] cursor-pointer" onClick={flipCard}>
            <motion.div
              className="relative w-full h-full preserve-3d"
              initial={false}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, cubicBezier: [0.4, 0, 0.2, 1] }}
            >
              {/* Front Side */}
              <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-[24px] shadow-polish border border-border-polish flex flex-col items-center justify-center p-10 text-center">
                <div className="flex flex-col items-center group">
                  <h2 className="text-[3.5rem] font-extrabold text-text-main mb-2 leading-none">
                    {currentCard.word}
                  </h2>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      playPronunciation(currentCard.word);
                    }}
                    className="mt-2 p-2 rounded-full text-primary-polish hover:bg-blue-50 transition-colors flex items-center space-x-1"
                    title="播放發音"
                  >
                    <Volume2 size={24} />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Listen</span>
                  </button>
                </div>
                <div className="font-mono text-primary-polish text-lg mb-6">
                  {currentCard.phonetic}
                </div>
                <p className="text-text-sub italic leading-relaxed text-balance max-w-[80%]">
                  "{currentCard.example}"
                </p>
              </div>

              {/* Back Side */}
              <div 
                className="absolute inset-0 w-full h-full backface-hidden bg-[#f8fafc] rounded-[24px] shadow-polish border border-border-polish flex flex-col items-center justify-center p-10 text-center rotate-y-180"
              >
                <h2 className="text-[2.5rem] font-semibold text-primary-polish leading-tight">
                  {currentCard.translation}
                </h2>
              </div>
            </motion.div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={prevCard}
                className="px-6 py-3 bg-white border border-border-polish rounded-xl text-text-main font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center space-x-2 active:scale-95"
              >
                <ChevronLeft size={18} />
                <span>Previous</span>
              </button>
              <button 
                onClick={flipCard}
                className="px-8 py-3 bg-primary-polish text-white font-semibold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center space-x-2 active:scale-95"
              >
                <RefreshCw size={18} className={isFlipped ? "rotate-180 transition-transform duration-500" : ""} />
                <span>Flip Card</span>
              </button>
              <button 
                onClick={nextCard}
                className="px-6 py-3 bg-white border border-border-polish rounded-xl text-text-main font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center space-x-2 active:scale-95"
              >
                <span>Next</span>
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="text-xs text-secondary-polish font-medium flex items-center space-x-2 bg-white/50 px-3 py-1 rounded-full border border-border-polish/50">
              <Info size={14} />
              <span>Click the card or press 'Space' to flip</span>
            </div>
          </div>
        </section>

        {/* Data Management Section (Sidebar) */}
        <aside className="bg-white rounded-[20px] border border-border-polish shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-border-polish flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-base text-text-main uppercase tracking-tight">單字編輯器</h3>
              <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[0.7rem] font-black uppercase rounded flex items-center space-x-1">
                <Sparkles size={10} />
                <span>AI Powered</span>
              </span>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col min-h-0 space-y-4">
            <div className="relative flex-1 min-h-0">
              <textarea
                value={wordsInput}
                onChange={(e) => setWordsInput(e.target.value)}
                disabled={isGenerating}
                className="w-full h-full p-4 font-sans text-[0.95rem] bg-[#f8fafc] border border-border-polish rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none placeholder:text-slate-300"
                placeholder="輸入單字，每行一個。AI 將自動生成音標、翻譯與例句..."
              />
              <AnimatePresence>
                {isGenerating && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/80 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center space-y-3 z-10"
                  >
                    <RefreshCw className="animate-spin text-primary-polish" size={32} />
                    <p className="font-bold text-primary-polish animate-pulse">AI 正在生成中...</p>
                  </motion.div>
                )}
                {errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-4 left-4 right-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg flex items-center space-x-2 text-sm shadow-md"
                  >
                    <AlertCircle size={16} />
                    <span className="font-medium truncate">{errorMessage}</span>
                  </motion.div>
                )}
                {successMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-4 left-4 right-4 bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-2 rounded-lg flex items-center space-x-2 text-sm shadow-md"
                  >
                    <CheckCircle2 size={16} />
                    <span className="font-medium">{successMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex flex-col space-y-2 shrink-0">
              <button
                onClick={handleUpdateData}
                disabled={isGenerating}
                className="w-full py-4 bg-primary-polish text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 shadow-md shadow-blue-100"
              >
                {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                <span>更新字庫 (AI 生成)</span>
              </button>
              
              <div className="flex space-x-2">
                <button 
                  onClick={() => {
                    const defaultWords = DEFAULT_DATA.map(c => c.word).join('\n');
                    setWordsInput(defaultWords);
                    setErrorMessage(null);
                  }}
                  disabled={isGenerating}
                  className="flex-1 py-2 text-xs font-bold text-secondary-polish bg-slate-50 border border-border-polish rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center space-x-1"
                >
                  <RefreshCw size={12} />
                  <span>恢復預存單字</span>
                </button>
                <button 
                  onClick={() => setWordsInput("")}
                  disabled={isGenerating}
                  className="flex-1 py-2 text-xs font-bold text-secondary-polish bg-slate-50 border border-border-polish rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center space-x-1"
                >
                  <Trash2 size={12} />
                  <span>清空內容</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
