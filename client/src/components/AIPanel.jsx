import React, { useState, useRef, useEffect } from "react";
import {
  reviewCode,
  explainCode,
  fixCode,
  generateTests,
  chatWithAI,
} from "../services/aiService";
import toast from "react-hot-toast";

function AIPanel({ code, language, onApplyFix }) {
  const [activeTab, setActiveTab] = useState("chat");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleReview = async () => {
    setLoading(true);
    setActiveTab("result");
    try {
      const data = await reviewCode(code, language);
      setResult({ type: "review", data: data.review });
    } catch (err) {
      toast.error("Review failed");
      setResult({ type: "error", data: "Failed to review code" });
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async () => {
    setLoading(true);
    setActiveTab("result");
    try {
      const data = await explainCode(code, language);
      setResult({ type: "explain", data: data.explanation });
    } catch (err) {
      toast.error("Explanation failed");
      setResult({ type: "error", data: "Failed to explain code" });
    } finally {
      setLoading(false);
    }
  };

  const handleFix = async () => {
    setLoading(true);
    setActiveTab("result");
    try {
      const data = await fixCode(code, language);
      setResult({ type: "fix", data: data.fix });
    } catch (err) {
      toast.error("Fix failed");
      setResult({ type: "error", data: "Failed to fix code" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTests = async () => {
    setLoading(true);
    setActiveTab("result");
    try {
      const data = await generateTests(code, language);
      setResult({ type: "tests", data: data.tests });
    } catch (err) {
      toast.error("Test generation failed");
      setResult({ type: "error", data: "Failed to generate tests" });
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setLoading(true);

    try {
      const history = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const data = await chatWithAI(chatInput, code, language, history);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (loading) {
      return (
        <div className="ai-loading">
          <div className="spinner"></div>
          <p>AI is thinking...</p>
        </div>
      );
    }

    if (!result) return <p className="ai-hint">Use the buttons above to get started.</p>;

    if (result.type === "error") {
      return <div className="ai-error">{result.data}</div>;
    }

    if (result.type === "review" && typeof result.data === "object" && !result.data.raw) {
      return (
        <div className="ai-review">
          {["bugs", "performance", "security", "refactoring"].map(
            (category) =>
              result.data[category]?.length > 0 && (
                <div key={category} className="review-category">
                  <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                  {result.data[category].map((item, i) => (
                    <div key={i} className={`review-item severity-${item.severity}`}>
                      <span className="severity-badge">{item.severity}</span>
                      <p>{item.description}</p>
                      {item.suggestion && (
                        <p className="suggestion">💡 {item.suggestion}</p>
                      )}
                    </div>
                  ))}
                </div>
              )
          )}
        </div>
      );
    }

    if (result.type === "fix" && result.data?.fixedCode) {
      return (
        <div className="ai-fix">
          <h4>Fixed Code</h4>
          <pre className="code-block">{result.data.fixedCode}</pre>
          <button
            className="btn-primary btn-sm"
            onClick={() => onApplyFix?.(result.data.fixedCode)}
          >
            Apply Fix
          </button>
          {result.data.changes?.map((change, i) => (
            <p key={i} className="change-item">✅ {change.description}</p>
          ))}
        </div>
      );
    }

    // Generic text result (explain, tests, raw review)
    const text = typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2);
    return <pre className="ai-text-result">{text}</pre>;
  };

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <h3>🤖 AI Assistant</h3>
      </div>

      {/* AI Action Buttons */}
      <div className="ai-actions">
        <button onClick={handleReview} disabled={loading} className="ai-btn review">
          Review Code
        </button>
        <button onClick={handleExplain} disabled={loading} className="ai-btn explain">
          Explain Code
        </button>
        <button onClick={handleFix} disabled={loading} className="ai-btn fix">
          Fix Errors
        </button>
        <button onClick={handleGenerateTests} disabled={loading} className="ai-btn tests">
          Gen Tests
        </button>
      </div>

      {/* Tab switcher */}
      <div className="ai-tabs">
        <button
          className={`ai-tab ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          Chat
        </button>
        <button
          className={`ai-tab ${activeTab === "result" ? "active" : ""}`}
          onClick={() => setActiveTab("result")}
        >
          Results
        </button>
      </div>

      {/* Content area */}
      <div className="ai-content">
        {activeTab === "chat" ? (
          <div className="ai-chat">
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <p className="ai-hint">
                  Ask me anything about your code!
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.role}`}>
                  <span className="msg-role">
                    {msg.role === "user" ? "You" : "AI"}
                  </span>
                  <div className="msg-content">
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="chat-msg assistant">
                  <span className="msg-role">AI</span>
                  <div className="msg-content typing">Thinking...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleChat}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your code..."
                disabled={loading}
              />
              <button type="submit" disabled={loading || !chatInput.trim()}>
                Send
              </button>
            </form>
          </div>
        ) : (
          <div className="ai-result-pane">{renderResult()}</div>
        )}
      </div>
    </div>
  );
}

export default AIPanel;
