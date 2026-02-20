import { useState, useRef, useEffect } from "react";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import { Send, X, Sparkles, Loader2, CalendarPlus, BookPlus } from "lucide-react";

interface ChatAction {
  type: string;
  details: {
    subject?: string;
    date?: string;
    name?: string;
    topic?: string;
    priority?: string;
  };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
}

export default function RobotChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      
      if (data.reply) {
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: data.reply,
          actions: data.actions || []
        }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I couldn't process that. Please try again!" },
        ]);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Oops! Something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Robot Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Open chatbot"
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-primary/40 rounded-full blur-xl animate-pulse" />
          
          {/* Flying robot container */}
          <div className="relative animate-float">
            {/* Robot body */}
            <div className="w-16 h-16 bg-gradient-to-br from-primary via-primary to-accent rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
              {/* Robot face */}
              <div className="relative">
                {/* Eyes */}
                <div className="flex gap-2 mb-1">
                  <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-slate-800 rounded-full animate-look" />
                  </div>
                  <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-slate-800 rounded-full animate-look" />
                  </div>
                </div>
                {/* Mouth */}
                <div className="w-5 h-2 bg-white/80 rounded-full mx-auto" />
              </div>
              
              {/* Antenna */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="w-1 h-3 bg-primary rounded-full" />
                <div className="w-2 h-2 bg-accent rounded-full -mt-0.5 -ml-0.5 animate-pulse" />
              </div>
            </div>
            
            {/* Jet flames */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              <div className="w-2 h-4 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-full opacity-80 animate-flame" />
              <div className="w-2 h-5 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-full opacity-80 animate-flame delay-75" />
              <div className="w-2 h-4 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-full opacity-80 animate-flame delay-150" />
            </div>
          </div>
          
          {/* Notification badge when closed */}
          {!isOpen && messages.length === 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center animate-bounce">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl shadow-primary/20 border border-border overflow-hidden">
            {/* Header */}
            <div className="gradient-primary p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mini robot icon */}
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <div className="relative">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                    <div className="w-4 h-1.5 bg-white/80 rounded-full mt-0.5 mx-auto" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Study Buddy</h3>
                  <p className="text-xs text-white/70">Ask me anything!</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-muted/30 to-white">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Hi! I'm your study buddy robot. Ask me any question about your subjects!
                  </p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {/* Show action badges */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[80%]">
                      {msg.actions.map((action, actionIdx) => (
                        <div
                          key={actionIdx}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"
                        >
                          {action.type === "exam_added" && (
                            <>
                              <CalendarPlus className="w-3 h-3" />
                              <span>Added exam: {action.details.subject}</span>
                            </>
                          )}
                          {action.type === "topic_added" && (
                            <>
                              <BookPlus className="w-3 h-3" />
                              <span>Added topic: {action.details.topic}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask a question..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                  className="gradient-primary text-white px-4 rounded-xl"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
