import { DraftService } from "../services/draft-service.js";
import { PersonalDataService } from "../services/personal-data-service.js";

export async function setPersonalDataField(application, {field, value}) {
  const current = application._draft?.toObject?.().personalData ?? {};
  const personalData = PersonalDataService.update(current, field, value);

  try {
    application._draft = await DraftService.update(
      application._draft,
      {personalData}
    );
    await application.render({parts: ["main"]});
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}
