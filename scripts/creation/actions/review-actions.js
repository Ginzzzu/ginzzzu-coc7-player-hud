import { MODULE_ID } from "../../constants.js";
import { CreationProgressService } from "../services/creation-progress-service.js";
import { DraftService } from "../services/draft-service.js";
import { InvestigatorCreationService } from "../services/investigator-creation-service.js";

const COC7_INVESTIGATOR_WIZARD_ID = "investigator-wizard-application";

async function closeCoc7InvestigatorWizard() {
  try {
    const application = foundry.applications.instances.get(COC7_INVESTIGATOR_WIZARD_ID);
    if (application) await application.close();
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to close the native CoC7 investigator wizard`, error);
  }
}

export async function createInvestigator(application) {
  if (application._creationPending) return;
  application._creationPending = true;
  let completed = false;

  try {
    await application.render({parts: ["main"]});
    await Promise.all([
      application._backstory?.saveQueue,
      application._personalData?.saveQueue
    ].filter(Boolean));

    const result = await InvestigatorCreationService.create({draft: application._draft});
    if (!result.ok) {
      application._notifyWarning(
        result.errorKey ?? "GINZZZU_C7PH.Creation.Errors.ActorCreate"
      );
      return;
    }

    try {
      await CreationProgressService.markCompleted(application._draft);
      application._progressFinalized = true;
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to mark investigator creation as completed`, error);
      application._progressFinalized = true;
    }

    try {
      application._draft = await DraftService.reset({preserveProgress: true});
    } catch (error) {
      application._notifyError("GINZZZU_C7PH.Creation.Errors.DraftClear", error);
    }

    completed = true;
    await closeCoc7InvestigatorWizard();
    ui.notifications.info(game.i18n.localize("GINZZZU_C7PH.Creation.Review.Created"));
    await application.close();
  } catch (error) {
    application._notifyError("GINZZZU_C7PH.Creation.Errors.ActorCreate", error);
  } finally {
    application._creationPending = false;
    if (!completed && foundry.applications.instances.get(application.id)) {
      try {
        await application.render({parts: ["main"]});
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to restore creation review state`, error);
      }
    }
  }
}
