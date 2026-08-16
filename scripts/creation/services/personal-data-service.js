const DEFAULT_IMAGE = "icons/svg/mystery-man.svg";

const GENDER_ALIASES = Object.freeze({
  female: new Set(["female", "f", "woman", "женский", "женщина"]),
  male: new Set(["male", "m", "man", "мужской", "мужчина"]),
  other: new Set(["other", "другой", "другое", "иной", "иная"])
});

export class PersonalDataService {
  static fieldNames = Object.freeze([
    "birthplace",
    "gender",
    "name",
    "residence"
  ]);

  static normalize(personalData = {}) {
    return {
      avatar: this.#normalizeImage(personalData.avatar),
      birthplace: this.#normalizeText(personalData.birthplace),
      gender: this.#normalizeGender(personalData.gender),
      name: this.#normalizeText(personalData.name),
      residence: this.#normalizeText(personalData.residence),
      token: this.#normalizeImage(personalData.token)
    };
  }

  static update(personalData = {}, field, value) {
    const normalized = this.normalize(personalData);
    if (!this.fieldNames.includes(field)) return normalized;

    normalized[field] = field === "gender"
      ? this.#normalizeGender(value)
      : this.#normalizeText(value);
    return normalized;
  }

  static validate(personalData = {}) {
    const normalized = this.normalize(personalData);
    const missing = [];
    if (!normalized.name) missing.push("name");
    if (!normalized.gender) missing.push("gender");

    return {
      complete: missing.length === 0,
      missing,
      personalData: normalized
    };
  }

  static #normalizeGender(value) {
    const normalized = this.#normalizeText(value).toLocaleLowerCase();
    if (!normalized) return "";

    for (const [canonical, aliases] of Object.entries(GENDER_ALIASES)) {
      if (aliases.has(normalized)) return canonical;
    }
    return "other";
  }

  static #normalizeImage(value) {
    const normalized = String(value ?? "").trim();
    return normalized || DEFAULT_IMAGE;
  }

  static #normalizeText(value) {
    return String(value ?? "").trim();
  }
}
