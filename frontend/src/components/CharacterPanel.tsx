
/** 角色信息面板：第一版使用 CSS 占位头像，不依赖外部图片。 */
export default function CharacterPanel() {
  return (
    <aside className="character-panel">
      <div className="avatar-placeholder" aria-label="虚构角色头像">
        晴
      </div>

      <h2>晴晴</h2>
      <p className="character-subtitle">你的 AI 陪伴伙伴</p>

      <div className="status">
        <span className="status-dot" />
        在线 · 等待与你聊天
      </div>

      <p className="character-description">
        一个温柔、真诚、喜欢倾听的虚构成年角色。
      </p>
    </aside>
  );
}
