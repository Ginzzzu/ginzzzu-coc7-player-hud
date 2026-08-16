import { MODULE_ID } from "../../constants.js";

export class CharacteristicRollService {
  static async roll(definition) {
    const [result] = await this.rollMany([definition]);
    return result;
  }

  static async rollMany(definitions) {
    const validDefinitions = definitions.filter((definition) => (
      definition?.key && String(definition.formula ?? "").trim()
    ));
    if (!validDefinitions.length) return [];

    try {
      const results = [];
      const rolls = [];

      for (const definition of validDefinitions) {
        const roll = await new Roll(
          String(definition.formula),
          {},
          {flavor: definition.label}
        ).roll();
        rolls.push(roll);
        results.push({
          key: definition.key,
          total: Number(roll.total)
        });
      }

      await ChatMessage.create({
        user: game.user.id,
        speaker: {alias: game.user.name},
        rolls,
        whisper: ChatMessage.getWhisperRecipients("GM")
      });

      return results;
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to roll investigator characteristics`, error);
      throw error;
    }
  }
}
