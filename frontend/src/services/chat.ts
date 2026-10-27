
const API_BASE = "http://127.0.0.1:8001/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Memory {
  id: number;
  content: string;
  created_at: string;
}

/** 发送聊天消息。 */
export async function sendMessage(
  sessionId: string,
  message: string,
): Promise<string> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      message,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? `请求失败：${response.status}`);
  }

  return data.reply;
}

/** 获取历史聊天记录。 */
export async function getHistory(
  sessionId: string,
): Promise<ChatMessage[]> {
  const response = await fetch(
    `${API_BASE}/history/${encodeURIComponent(sessionId)}`,
  );

  if (!response.ok) {
    throw new Error("无法读取聊天记录。");
  }

  const data = await response.json();
  return data.messages;
}

/** 获取长期记忆列表。 */
export async function getMemories(
  sessionId: string,
): Promise<Memory[]> {
  const response = await fetch(
    `${API_BASE}/memories/${encodeURIComponent(sessionId)}`,
  );

  if (!response.ok) {
    throw new Error("无法读取长期记忆。");
  }

  const data = await response.json();
  return data.memories;
}

/** 删除一条长期记忆。 */
export async function deleteMemory(
  sessionId: string,
  memoryId: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/memories/${encodeURIComponent(sessionId)}/${memoryId}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error("删除记忆失败。");
  }
}
