const DEFAULT_LIMIT = 10;

export class ChatPreviewService {
  static build({limit = DEFAULT_LIMIT} = {}) {
    const messages = (game.messages?.contents ?? [])
      .filter((message) => this.#isVisible(message))
      .slice(-Math.max(1, Number(limit) || DEFAULT_LIMIT))
      .map((message) => ({
        id: message.id
      }));

    return {
      chatMessages: messages,
      hasChatMessages: messages.length > 0
    };
  }

  static #isVisible(message) {
    return Boolean(
      message?.visible
      && (message.isContentVisible ?? message.visible)
    );
  }
}

