
import { useEffect, useState, type FormEvent } from "react";
import CharacterPanel from "./components/CharacterPanel";
import {
  deleteMemory,
  getHistory,
  getMemories,
  sendMessage,
  type ChatMessage,
  type Memory,
} from "./services/chat";
import "./App.css";

const STORAGE_KEY = "ai-companion-session-id";

function getSessionId(): string {
  // 首次打开时生成一个随机会话 ID，后续刷新保持不变。
  let id = localStorage.getItem(STORAGE_KEY);

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }

  return id;
}

export default function App() {
  const [sessionId] = useState(getSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "你好呀，今天过得怎么样？我在这里听你说。",
    },
  ]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMemories, setShowMemories] = useState(false);

  // 页面启动时，从后端数据库恢复聊天历史和长期记忆。
  useEffect(() => {
    async function loadData() {
      try {
        const [history, savedMemories] = await Promise.all([
          getHistory(sessionId),
          getMemories(sessionId),
        ]);

        if (history.length > 0) {
          setMessages(history);
        }

        setMemories(savedMemories);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "加载历史记录失败。",
        );
      }
    }

    void loadData();
  }, [sessionId]);

  async function refreshMemories() {
    setMemories(await getMemories(sessionId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();
    if (!message || loading) return;

    setInput("");
    setError("");
    setLoading(true);

    setMessages((current) => [
      ...current,
      { role: "user", content: message },
    ]);

    try {
      const reply = await sendMessage(sessionId, message);

      setMessages((current) => [
        ...current,
        { role: "assistant", content: reply },
      ]);

      // “记住：...”成功后刷新记忆列表。
      if (/^记住[：:]/.test(message)) {
        await refreshMemories();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "请求失败，请重试。",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMemory(memoryId: number) {
    try {
      await deleteMemory(sessionId, memoryId);
      await refreshMemories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "删除记忆失败。",
      );
    }
  }

  return (
    <main className="app-shell">
      <CharacterPanel />

      <section className="chat-panel">
        <header className="chat-header">
          <div>
            <h1>与晴晴聊天</h1>
            <p>AI 陪伴 · 长期记忆版</p>
          </div>

          <button
            className="memory-toggle"
            type="button"
            onClick={() => setShowMemories((value) => !value)}
          >
            {showMemories ? "返回聊天" : `我的记忆 (${memories.length})`}
          </button>
        </header>

        {showMemories ? (
          <section className="memory-panel">
            <h2>晴晴记住的事</h2>
            <p>你可以查看并删除不再需要的记忆。</p>

            {memories.length === 0 && (
              <p>目前还没有长期记忆。可以在聊天框输入“记住：我喜欢夜跑”。</p>
            )}

            {memories.map((memory) => (
              <article className="memory-item" key={memory.id}>
                <span>{memory.content}</span>
                <button
                  type="button"
                  onClick={() => void handleDeleteMemory(memory.id)}
                >
                  删除
                </button>
              </article>
            ))}
          </section>
        ) : (
          <>
            <div className="message-list" aria-live="polite">
              {messages.map((message, index) => (
                <article
                  key={`${index}-${message.role}`}
                  className={`message-row ${message.role}`}
                >
                  <div className="message-bubble">
                    {message.content}
                  </div>
                </article>
              ))}

              {loading && (
                <div className="loading-text">晴晴正在思考……</div>
              )}
            </div>

            <form className="chat-form" onSubmit={handleSubmit}>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="聊天，或输入“记住：我喜欢夜跑”"
                maxLength={2000}
                disabled={loading}
                aria-label="聊天消息"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
              >
                {loading ? "发送中" : "发送"}
              </button>
            </form>
          </>
        )}

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <footer className="chat-footer">
          长期记忆仅保存你明确要求记录的内容。
        </footer>
      </section>
    </main>
  );
}
