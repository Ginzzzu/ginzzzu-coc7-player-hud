const DEFAULT_LIMIT = 10;

export class ChatPreviewService {
  static build({limit = DEFAULT_LIMIT} = {}) {
    const messages = (game.messages?.contents ?? [])
      .filter((message) => this.#isVisible(message))
      .slice(-Math.max(1, Number(limit) || DEFAULT_LIMIT))
      .map((message) => this.#present(message));

    return {
      chatMessages: messages,
      hasChatMessages: messages.length > 0
    };
  }

  static #isVisible(message) {
    return Boolean(
      message?.visible
      && (message.isContentVisible ?? message.visible)
      && typeof message.content === "string"
      && message.content.trim().length > 0
    );
  }

  static #present(message) {
    const timestamp = Number(message.timestamp) || Date.now();
    const date = new Date(timestamp);

    const flavor = typeof message.flavor === "string" ? message.flavor.trim() : "";

    return {
      content: message.content,
      flavor,
      hasFlavor: flavor.length > 0,
      id: message.id,
      speaker: message.speaker?.alias || message.author?.name || game.i18n.localize("GINZZZU_C7PH.Sections.Chat.UnknownSpeaker"),
      timeLabel: this.#formatTime(date),
      timestampIso: date.toISOString()
    };
  }

  static #formatTime(date) {
    const now = new Date();
    const sameDay = date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();

    return new Intl.DateTimeFormat(game.i18n.lang, sameDay
      ? {hour: "2-digit", minute: "2-digit"}
      : {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"}
    ).format(date);
  }
}
