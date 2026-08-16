import { CreationSourceService } from "../services/creation-source-service.js";
import { DraftService } from "../services/draft-service.js";
import { OccupationSkillService } from "../services/occupation-skill-service.js";

async function updateOccupationState(application, buildChanges) {
  try {
    const definition = await CreationSourceService.getOccupationDefinition(
      application._draft.occupation.uuid
    );
    if (!definition) {
      application._notifyWarning("GINZZZU_C7PH.Creation.Warnings.OccupationSkillsLoad");
      return;
    }

    const changes = buildChanges(definition);
    if (!changes) return;

    application._draft = await DraftService.update(application._draft, changes);
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}

export async function selectOccupationPointCharacteristic(application, target) {
  await updateOccupationState(application, (definition) => (
    OccupationSkillService.setPointCharacteristic({
      definition,
      draft: application._draft,
      key: target.dataset.characteristicKey
    })
  ));
}

export async function toggleOccupationGroupSkill(application, target) {
  await updateOccupationState(application, (definition) => (
    OccupationSkillService.toggleGroupSkill({
      cocid: target.dataset.skillCocid,
      definition,
      draft: application._draft,
      groupIndex: Number(target.dataset.groupIndex)
    })
  ));
}

export async function setOccupationPersonalSkill(application, {cocid, slotIndex}) {
  await updateOccupationState(application, (definition) => (
    OccupationSkillService.setPersonalSkill({
      cocid,
      definition,
      draft: application._draft,
      slotIndex
    })
  ));
}

export async function setOccupationSpecialization(application, {slotId, value}) {
  await updateOccupationState(application, (definition) => (
    OccupationSkillService.setSpecialization({
      definition,
      draft: application._draft,
      slotId,
      value
    })
  ));
}

export async function setOccupationPoints(application, {slotId, value}) {
  await updateOccupationState(application, (definition) => (
    OccupationSkillService.setOccupationPoints({
      definition,
      draft: application._draft,
      slotId,
      value
    })
  ));
}
