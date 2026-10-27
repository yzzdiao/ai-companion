
"""FastAPI 入口：聊天、历史记录与长期记忆接口。"""

import logging
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.database import init_db
from app.llm import generate_reply
from app.memory import (
    delete_memory,
    get_memories,
    get_recent_messages,
    save_memory,
    save_message,
)

logger = logging.getLogger(__name__)
app = FastAPI(title="AI Companion API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.on_event("startup")
def startup():
    """应用启动时初始化数据库。"""
    init_db()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str = Field(min_length=1, max_length=100)


class ChatResponse(BaseModel):
    reply: str


def validate_session_id(session_id: str) -> str:
    """限制会话 ID 的格式，避免异常输入。"""
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,100}", session_id):
        raise HTTPException(status_code=400, detail="session_id 格式不正确。")
    return session_id


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    session_id = validate_session_id(request.session_id)
    message = request.message.strip()

    if not message:
        raise HTTPException(status_code=422, detail="消息不能为空。")

    # 通过明确的“记住：”指令创建长期记忆。
    # 例如：记住：我喜欢晚上跑步。
    if message.startswith("记住：") or message.startswith("记住:"):
        content = message[3:].strip()

        if not content:
            raise HTTPException(
                status_code=422,
                detail="请在“记住：”后面填写需要保存的内容。",
            )

        if len(content) > 300:
            raise HTTPException(
                status_code=422,
                detail="单条记忆不能超过 300 个字符。",
            )

        save_memory(session_id, content)
        reply = f"好呀，我已经把这件事记下来了：{content}"

        save_message(session_id, "user", message)
        save_message(session_id, "assistant", reply)

        return ChatResponse(reply=reply)

    # 只读取最近 12 条消息，控制上下文长度。
    history = get_recent_messages(session_id, limit=12)

    # 当前消息还没入库，因此 history 不包含当前消息。
    memories = get_memories(session_id)

    try:
        reply = await generate_reply(
            message=message,
            history=history,
            memories=memories,
        )
    except Exception as exc:
        logger.exception(
            "Groq 调用失败，错误类型：%s",
            type(exc).__name__,
        )
        raise HTTPException(
            status_code=502,
            detail="暂时无法生成回复，请检查 Groq 配置或稍后重试。",
        ) from exc

    # 模型成功回复后再保存，避免把失败请求当成完整对话。
    save_message(session_id, "user", message)
    save_message(session_id, "assistant", reply)

    return ChatResponse(reply=reply)


@app.get("/api/history/{session_id}")
async def history(session_id: str):
    session_id = validate_session_id(session_id)
    return {"messages": get_recent_messages(session_id, limit=100)}


@app.get("/api/memories/{session_id}")
async def memories(session_id: str):
    session_id = validate_session_id(session_id)
    return {"memories": get_memories(session_id)}


@app.delete("/api/memories/{session_id}/{memory_id}")
async def remove_memory(session_id: str, memory_id: int):
    session_id = validate_session_id(session_id)

    if not delete_memory(session_id, memory_id):
        raise HTTPException(status_code=404, detail="未找到这条记忆。")

    return {"deleted": True}
