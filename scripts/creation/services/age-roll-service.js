import { MODULE_ID } from "../../constants.js";

function safe(value) {
  const escape = foundry.utils.escapeHTML ?? ((text) => String(text));
  return escape(String(value));
}

export class AgeRollService {
  static async rollEducation({currentEducation, count}) {
    const attempts = [];
    const rolls = [];
    let education = Number(currentEducation);

    try {
      for (let index = 0; index < count; index += 1) {
        const checkRoll = await new Roll("1d100").roll();
        rolls.push(checkRoll);
        const success = Number(checkRoll.total) > education;
        let gain = 0;

        if (success) {
          const gainRoll = await new Roll("1d10").roll();
          rolls.push(gainRoll);
          gain = Number(gainRoll.total);
          education += gain;
        }

        attempts.push({
          gain,
          roll: Number(checkRoll.total),
          success
        });
      }

      const rows = attempts.map((attempt, index) => game.i18n.format(
        attempt.success
          ? "GINZZZU_C7PH.Creation.Age.Chat.EducationSuccess"
          : "GINZZZU_C7PH.Creation.Age.Chat.EducationFailure",
        {
          gain: safe(attempt.gain),
          index: index + 1,
          roll: safe(attempt.roll)
        }
      ));

      await ChatMessage.create({
        content: `<div class="c7ph-age-chat-results">${rows.map((row) => `<p>${row}</p>`).join("")}</div>`,
        flavor: game.i18n.localize("GINZZZU_C7PH.Creation.Age.Chat.EducationTitle"),
        rolls,
        speaker: {alias: game.user.name},
        user: game.user.id,
        whisper: ChatMessage.getWhisperRecipients("GM")
      });

      return attempts;
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to roll education age improvements`, error);
      throw error;
    }
  }

  static async rollLuck({formula, label}) {
    try {
      const roll = await new Roll(String(formula), {}, {flavor: label}).roll();
      await ChatMessage.create({
        flavor: game.i18n.localize("GINZZZU_C7PH.Creation.Age.Chat.LuckTitle"),
        rolls: [roll],
        speaker: {alias: game.user.name},
        user: game.user.id,
        whisper: ChatMessage.getWhisperRecipients("GM")
      });
      return Number(roll.total);
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to roll second Luck value`, error);
      throw error;
    }
  }
}
