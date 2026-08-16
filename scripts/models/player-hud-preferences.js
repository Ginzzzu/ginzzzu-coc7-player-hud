import {
  COMPACT_DISPLAY_MODE,
  PREFERENCES_SCHEMA_VERSION
} from "../constants.js";

const {
  ArrayField,
  BooleanField,
  NumberField,
  StringField
} = foundry.data.fields;

export class PlayerHudPreferences extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      activeSection: new StringField({
        required: false,
        nullable: true,
        initial: null
      }),
      autoHideInterface: new BooleanField({
        required: true,
        nullable: false,
        initial: true
      }),
      collapsed: new BooleanField({
        required: true,
        nullable: false,
        initial: false
      }),
      // Compatibility-only field for settings saved by older HUD versions.
      // Runtime layout is always compact from v0.31.0 onward.
      displayMode: new StringField({
        required: true,
        nullable: false,
        initial: COMPACT_DISPLAY_MODE
      }),
      favoriteSkillUuids: new ArrayField(
        new StringField({required: true, nullable: false}),
        {required: true, nullable: false, initial: []}
      ),
      hideCameras: new BooleanField({
        required: true,
        nullable: false,
        initial: true
      }),
      recentSkillUuids: new ArrayField(
        new StringField({required: true, nullable: false}),
        {required: true, nullable: false, initial: []}
      ),
      schemaVersion: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 1,
        initial: PREFERENCES_SCHEMA_VERSION
      })
    };
  }
}
