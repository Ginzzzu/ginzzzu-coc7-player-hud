import { MODULE_ID } from "../constants.js";

const CREATION_TEMPLATE_PATHS = Object.freeze([
  `modules/${MODULE_ID}/templates/creation/parts/sidebar.hbs`,
  `modules/${MODULE_ID}/templates/creation/parts/header.hbs`,
  `modules/${MODULE_ID}/templates/creation/parts/content.hbs`,
  `modules/${MODULE_ID}/templates/creation/parts/footer.hbs`,
  `modules/${MODULE_ID}/templates/creation/steps/setup.hbs`,
  `modules/${MODULE_ID}/templates/creation/steps/characteristics.hbs`,
  `modules/${MODULE_ID}/templates/creation/steps/age.hbs`,
  `modules/${MODULE_ID}/templates/creation/steps/derived.hbs`,
  `modules/${MODULE_ID}/templates/creation/steps/occupation.hbs`,
  `modules/${MODULE_ID}/templates/creation/steps/allocation.hbs`,
  `modules/${MODULE_ID}/templates/creation/steps/personal-interests.hbs`,
  `modules/${MODULE_ID}/templates/creation/steps/personal-data.hbs`,
  `modules/${MODULE_ID}/templates/creation/steps/review.hbs`
]);

export async function preloadCreationTemplates() {
  const loadTemplates = foundry.applications.handlebars?.loadTemplates ?? globalThis.loadTemplates;
  if (typeof loadTemplates !== "function") {
    throw new Error("Foundry Handlebars template loader is unavailable.");
  }
  await loadTemplates(CREATION_TEMPLATE_PATHS);
}
