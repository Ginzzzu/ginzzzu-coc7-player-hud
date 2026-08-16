import { BackstoryService } from "../services/backstory-service.js";
import { DraftService } from "../services/draft-service.js";

export async function setBackstoryField(application, {field, value}) {
  const current = application._draft?.toObject?.().backstory ?? {};
  const backstory = BackstoryService.update(current, field, value);

  try {
    application._draft = await DraftService.update(
      application._draft,
      {backstory}
    );
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftSave", error);
  }
}
