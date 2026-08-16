export class BackstoryService {
  static fieldNames = Object.freeze([
    "description",
    "ideology",
    "injuries",
    "meaningfulLocations",
    "significantPeople",
    "traits",
    "treasuredPossessions"
  ]);

  static normalize(backstory = {}) {
    return Object.fromEntries(
      this.fieldNames.map((field) => [field, this.#normalizeText(backstory[field])])
    );
  }

  static update(backstory = {}, field, value) {
    const normalized = this.normalize(backstory);
    if (!this.fieldNames.includes(field)) return normalized;

    normalized[field] = this.#normalizeText(value);
    return normalized;
  }

  static #normalizeText(value) {
    return String(value ?? "").trim();
  }
}
