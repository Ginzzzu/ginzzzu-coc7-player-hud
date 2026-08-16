import { BODY_CLASSES } from "../constants.js";

export class UiVisibilityService {
  static activate({collapseSidebar = false, hideCameras = true, resetCoreInterface = false} = {}) {
    if (collapseSidebar && ui.sidebar?.expanded) ui.sidebar.collapse();

    document.body.classList.add(BODY_CLASSES.ACTIVE);
    document.body.classList.toggle(BODY_CLASSES.HIDE_CAMERAS, hideCameras);
    if (resetCoreInterface) document.body.classList.remove(BODY_CLASSES.CORE_VISIBLE);
  }

  static deactivate() {
    document.body.classList.remove(
      BODY_CLASSES.ACTIVE,
      BODY_CLASSES.CORE_VISIBLE,
      BODY_CLASSES.HIDE_CAMERAS
    );
  }

  static showCoreInterface() {
    document.body.classList.add(BODY_CLASSES.CORE_VISIBLE);
    return true;
  }

  static toggleCoreInterface() {
    const visible = document.body.classList.toggle(BODY_CLASSES.CORE_VISIBLE);
    if (!visible && ui.sidebar?.expanded) ui.sidebar.collapse();
    return visible;
  }

  static get coreInterfaceVisible() {
    return document.body.classList.contains(BODY_CLASSES.CORE_VISIBLE);
  }
}
