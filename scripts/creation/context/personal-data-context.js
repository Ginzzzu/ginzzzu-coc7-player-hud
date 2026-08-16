import { PersonalDataService } from "../services/personal-data-service.js";

export function preparePersonalDataContext(application) {
  const draft = application._draft?.toObject?.() ?? {};
  const validation = PersonalDataService.validate(draft.personalData);
  const genderOptions = [
    {
      label: game.i18n.localize("GINZZZU_C7PH.Creation.PersonalData.GenderSelect"),
      selected: !validation.personalData.gender,
      value: ""
    },
    ...["male", "female", "other"].map((value) => ({
      label: game.i18n.localize(`GINZZZU_C7PH.Creation.PersonalData.GenderOptions.${value}`),
      selected: validation.personalData.gender === value,
      value
    }))
  ];

  return {
    personalData: validation.personalData,
    personalDataComplete: validation.complete,
    personalDataGenderOptions: genderOptions
  };
}
