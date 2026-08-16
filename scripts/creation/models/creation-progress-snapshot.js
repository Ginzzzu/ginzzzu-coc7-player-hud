import {
  CREATION_PROGRESS_SCHEMA_VERSION,
  CREATION_PROGRESS_STATUSES,
  CREATION_STEP_ORDER,
  CREATION_STEPS
} from "../constants.js";

const {
  ArrayField,
  BooleanField,
  NumberField,
  ObjectField,
  SchemaField,
  StringField
} = foundry.data.fields;

function nullableNumber() {
  return new NumberField({
    required: false,
    nullable: true,
    integer: true,
    min: 0,
    initial: null
  });
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

function pointPoolField() {
  return new SchemaField({
    spent: nonNegativeInteger(),
    total: nonNegativeInteger()
  });
}

function issueField() {
  return new SchemaField({
    key: new StringField({required: true, nullable: false, initial: ""}),
    step: new StringField({
      required: true,
      nullable: false,
      choices: CREATION_STEP_ORDER,
      initial: CREATION_STEPS.SETUP
    })
  });
}

export class CreationProgressSnapshot extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      actorId: new StringField({required: true, nullable: false, initial: ""}),
      completedAt: nullableNumber(),
      completedSteps: new ArrayField(new StringField({
        required: true,
        nullable: false,
        choices: CREATION_STEP_ORDER,
        initial: CREATION_STEPS.SETUP
      }), {
        required: true,
        nullable: false,
        initial: []
      }),
      currentStep: new StringField({
        required: true,
        nullable: false,
        choices: CREATION_STEP_ORDER,
        initial: CREATION_STEPS.SETUP
      }),
      draft: new ObjectField({required: true, nullable: false, initial: {}}),
      investigatorName: new StringField({required: true, nullable: false, initial: ""}),
      isValid: new BooleanField({required: true, nullable: false, initial: false}),
      issues: new ArrayField(issueField(), {
        required: true,
        nullable: false,
        initial: []
      }),
      occupationName: new StringField({required: true, nullable: false, initial: ""}),
      occupationPoints: pointPoolField(),
      personalPoints: pointPoolField(),
      schemaVersion: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 1,
        initial: CREATION_PROGRESS_SCHEMA_VERSION
      }),
      startedAt: nonNegativeInteger(),
      status: new StringField({
        required: true,
        nullable: false,
        choices: Object.values(CREATION_PROGRESS_STATUSES),
        initial: CREATION_PROGRESS_STATUSES.IN_PROGRESS
      }),
      updatedAt: nonNegativeInteger(),
      userId: new StringField({required: true, nullable: false, initial: ""})
    };
  }
}
