import { BackstoryService } from "../services/backstory-service.js";

export function prepareBackstoryContext(application) {
  const draft = application._draft?.toObject?.() ?? {};
  return {
    backstory: BackstoryService.normalize(draft.backstory)
  };
}
