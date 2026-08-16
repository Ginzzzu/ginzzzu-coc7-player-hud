import { DraftService } from "../services/draft-service.js";
import { PersonalInterestService } from "../services/personal-interest-service.js";

async function updatePersonalInterestState(application, buildChanges) {
  try {
    const changes = buildChanges();
    if (!changes) return;
    application._draft = await DraftService.update(application._draft, changes);
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}

export async function setPersonalInterestPoints(application, {slotId, value}) {
  await updatePersonalInterestState(application, () => (
    PersonalInterestService.setPersonalPoints({
      draft: application._draft,
      slotId,
      value
    })
  ));
}

export async function setPersonalInterestSpecialization(application, {slotId, value}) {
  await updatePersonalInterestState(application, () => (
    PersonalInterestService.setSpecialization({
      draft: application._draft,
      skillOptions: application._sources?.skills ?? [],
      slotId,
      value
    })
  ));
}
