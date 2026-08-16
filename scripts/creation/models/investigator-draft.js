import {
  CHARACTERISTIC_KEYS,
  CHARACTERISTIC_SWAP_GROUPS,
  CREATION_CHARACTERISTIC_METHODS,
  CREATION_DRAFT_SCHEMA_VERSION,
  CREATION_STEP_ORDER,
  CREATION_STEPS
} from "../constants.js";

const {
  ArrayField,
  BooleanField,
  NumberField,
  SchemaField,
  StringField
} = foundry.data.fields;

function nullableString() {
  return new StringField({required: false, nullable: true, initial: null});
}

function nonNegativeInteger(initial = 0) {
  return new NumberField({
    required: true,
    nullable: false,
    integer: true,
    min: 0,
    initial
  });
}

function characteristicField() {
  return new SchemaField({
    ageAdjustment: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0
    }),
    formula: new StringField({required: true, nullable: false, initial: ""}),
    assignedValue: new NumberField({
      required: false,
      nullable: true,
      integer: true,
      min: 0,
      initial: null
    }),
    rolledValue: new NumberField({
      required: false,
      nullable: true,
      integer: true,
      min: 0,
      initial: null
    })
  });
}

function characteristicSwapField() {
  return new SchemaField({
    enabled: new BooleanField({
      required: true,
      nullable: false,
      initial: false
    }),
    sourceKey: nullableString(),
    targetKey: nullableString()
  });
}

function educationCheckField() {
  return new SchemaField({
    gain: nonNegativeInteger(),
    roll: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: 1,
      max: 100,
      initial: 1
    }),
    success: new BooleanField({
      required: true,
      nullable: false,
      initial: false
    })
  });
}

function ageProcessField() {
  return new SchemaField({
    ageAtCalculation: new NumberField({
      required: false,
      nullable: true,
      integer: true,
      min: 15,
      max: 89,
      initial: null
    }),
    educationChecks: new ArrayField(educationCheckField(), {
      required: true,
      nullable: false,
      initial: []
    }),
    luckSecondRoll: new NumberField({
      required: false,
      nullable: true,
      integer: true,
      min: 0,
      max: 100,
      initial: null
    })
  });
}

function setupReferenceField() {
  return new SchemaField({
    characteristicMethod: new StringField({
      required: true,
      nullable: false,
      choices: Object.values(CREATION_CHARACTERISTIC_METHODS),
      initial: CREATION_CHARACTERISTIC_METHODS.ROLL
    }),
    cocid: nullableString(),
    documentId: nullableString(),
    img: nullableString(),
    name: nullableString(),
    pack: nullableString(),
    pointBudget: nonNegativeInteger(),
    source: nullableString(),
    uuid: nullableString()
  });
}

function occupationReferenceField() {
  return new SchemaField({
    cocid: nullableString(),
    creditMax: new NumberField({
      required: false,
      nullable: true,
      integer: true,
      min: 0,
      initial: null
    }),
    creditMin: new NumberField({
      required: false,
      nullable: true,
      integer: true,
      min: 0,
      initial: null
    }),
    documentId: nullableString(),
    img: nullableString(),
    name: nullableString(),
    pack: nullableString(),
    source: nullableString(),
    uuid: nullableString()
  });
}

function groupSelectionField() {
  return new SchemaField({
    cocids: new ArrayField(new StringField({required: true, nullable: false, initial: ""}), {
      required: true,
      nullable: false,
      initial: []
    }),
    groupIndex: nonNegativeInteger()
  });
}

function personalSelectionField() {
  return new SchemaField({
    cocid: nullableString(),
    slotIndex: nonNegativeInteger()
  });
}

function occupationProcessField() {
  return new SchemaField({
    groupSelections: new ArrayField(groupSelectionField(), {
      required: true,
      nullable: false,
      initial: []
    }),
    occupationUuid: nullableString(),
    personalSelections: new ArrayField(personalSelectionField(), {
      required: true,
      nullable: false,
      initial: []
    }),
    pointCharacteristic: nullableString()
  });
}

function skillAllocationField() {
  return new SchemaField({
    base: nonNegativeInteger(),
    cocid: nullableString(),
    developmentMarked: new BooleanField({
      required: true,
      nullable: false,
      initial: false
    }),
    documentId: nullableString(),
    experience: nonNegativeInteger(),
    isOccupation: new BooleanField({
      required: true,
      nullable: false,
      initial: false
    }),
    name: new StringField({required: true, nullable: false, initial: ""}),
    occupation: nonNegativeInteger(),
    personal: nonNegativeInteger(),
    requiresName: new BooleanField({required: true, nullable: false, initial: false}),
    slotId: nullableString(),
    sourceCocid: nullableString(),
    specialization: nullableString(),
    uuid: nullableString()
  });
}

export class InvestigatorDraft extends foundry.abstract.DataModel {
  static defineSchema() {
    const characteristicSchema = {};
    for (const key of CHARACTERISTIC_KEYS) characteristicSchema[key] = characteristicField();

    return {
      age: new NumberField({
        required: false,
        nullable: true,
        integer: true,
        min: 15,
        max: 89,
        initial: null
      }),
      ageProcess: ageProcessField(),
      backstory: new SchemaField({
        description: new StringField({required: true, nullable: false, initial: ""}),
        ideology: new StringField({required: true, nullable: false, initial: ""}),
        injuries: new StringField({required: true, nullable: false, initial: ""}),
        meaningfulLocations: new StringField({required: true, nullable: false, initial: ""}),
        significantPeople: new StringField({required: true, nullable: false, initial: ""}),
        traits: new StringField({required: true, nullable: false, initial: ""}),
        treasuredPossessions: new StringField({required: true, nullable: false, initial: ""})
      }),
      characteristics: new SchemaField(characteristicSchema),
      characteristicSwaps: new SchemaField({
        [CHARACTERISTIC_SWAP_GROUPS.THREE_D6]: characteristicSwapField(),
        [CHARACTERISTIC_SWAP_GROUPS.TWO_D6_PLUS_SIX]: characteristicSwapField()
      }),
      currentStep: new StringField({
        required: true,
        nullable: false,
        choices: CREATION_STEP_ORDER,
        initial: CREATION_STEPS.SETUP
      }),
      occupation: occupationReferenceField(),
      occupationProcess: occupationProcessField(),
      personalData: new SchemaField({
        avatar: new StringField({
          required: true,
          nullable: false,
          initial: "icons/svg/mystery-man.svg"
        }),
        birthplace: new StringField({required: true, nullable: false, initial: ""}),
        gender: new StringField({required: true, nullable: false, initial: ""}),
        name: new StringField({required: true, nullable: false, initial: ""}),
        residence: new StringField({required: true, nullable: false, initial: ""}),
        token: new StringField({
          required: true,
          nullable: false,
          initial: "icons/svg/mystery-man.svg"
        })
      }),
      schemaVersion: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 1,
        initial: CREATION_DRAFT_SCHEMA_VERSION
      }),
      setup: setupReferenceField(),
      skills: new ArrayField(skillAllocationField(), {
        required: true,
        nullable: false,
        initial: []
      })
    };
  }
}
