
"""聊天历史与长期记忆的读写操作。"""

from app.database import get_connection


def save_message(
    session_id: str,
    role: str,
    content: str,
) -> None:
    """保存一条聊天消息。"""
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO messages (session_id, role, content)
            VALUES (?, ?, ?)
            """,
            (session_id, role, content),
        )


def get_recent_messages(
    session_id: str,
    limit: int = 12,
) -> list[dict]:
    """读取最近的聊天消息，按时间正序返回。"""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT role, content
            FROM (
                SELECT id, role, content
                FROM messages
                WHERE session_id = ?
                ORDER BY id DESC
                LIMIT ?
            )
            ORDER BY id ASC
            """,
            (session_id, limit),
        ).fetchall()

    return [
        {"role": row["role"], "content": row["content"]}
        for row in rows
    ]


def save_memory(session_id: str, content: str) -> bool:
    """保存长期记忆；相同内容不会重复插入。"""
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT OR IGNORE INTO memories (session_id, content)
            VALUES (?, ?)
            """,
            (session_id, content),
        )
        return cursor.rowcount > 0


def get_memories(session_id: str) -> list[dict]:
    """查询当前会话的长期记忆。"""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, content, created_at
            FROM memories
            WHERE session_id = ?
            ORDER BY id DESC
            """,
            (session_id,),
        ).fetchall()

    return [dict(row) for row in rows]


def delete_memory(session_id: str, memory_id: int) -> bool:
    """只删除当前会话中的指定记忆。"""
    with get_connection() as conn:
        cursor = conn.execute(
            """
            DELETE FROM memories
            WHERE session_id = ? AND id = ?
            """,
            (session_id, memory_id),
        )
        return cursor.rowcount > 0
