# Ginzzzu's CoC7 Player HUD

![GitHub Release](https://img.shields.io/github/v/release/Ginzzzu/ginzzzu-coc7-player-hud?label=Version)
![Total Downloads](https://img.shields.io/github/downloads/Ginzzzu/ginzzzu-coc7-player-hud/ginzzzu-coc7-player-hud.zip?label=Total%20Downloads)
![Latest Release Downloads](https://img.shields.io/github/downloads/Ginzzzu/ginzzzu-coc7-player-hud/latest/ginzzzu-coc7-player-hud.zip?label=Latest%20Release)

A standalone player HUD for Call of Cthulhu 7th Edition on Foundry VTT v14.

## Version 0.33.5

The Action Request shelf supports native CoC7 combined checks. The current adapter uses the installed CoC7 8.15 runtime bridge, preserves native combined-result logic, and repairs the system's missing Combined ChatMessage roll attachment for Dice So Nice. The already-resolved CoC7 percentile dice are attached as one evaluated visualization `Roll`, so Dice So Nice can use its normal chat hide/animate/reveal lifecycle without a second random roll.

The current development version includes:

- native `ApplicationV2` HUD;
- a single compact HUD layout; the former standard/expanded mode and its mode-switch button have been removed;
- hover-opened shelves with touch/click fallback, including Consequences; internal rerenders suppress entrance animation and restore scroll/focus so open shelves remain visually stable;
- Action Request category filters and search share one balanced 4×2 control grid (2 columns on narrow screens), placing search in the final grid cell instead of a separate header row;
- Action Request has **Single / Combined** modes; Combined mode keeps the existing action catalogue, adds all eight characteristics as selectable checks, gives every selected check its own bonus/penalty dice control in a compact vertical list (bonus choices first), deduplicates the underlying Actor checks, and resolves **All / At least one** with one shared CoC7 roll;
- automatic shelf closing before attribute, characteristic, skill, and weapon checks so native CoC7 roll dialogs are never covered;
- HUD shelves rendered above Foundry camera views while the unused full-screen HUD layer remains pointer-transparent;
- a restrained Lovecraft-inspired CSS theme with green-black surfaces, aged brass trim, ivory text, subtle grain, vignette lighting, and catalogue-style section headings;
- optional client-side styling for the native CoC7 bonus/penalty roll dialog, matching the HUD palette without replacing the system template or roll logic;
- optional client-side styling for the native Foundry pause overlay, replacing the wide strip with a compact Lovecraft-inspired panel, restrained inner brass framing and the localized caption “The moment stands still” / «Мгновение застыло»; while pause remains active, the panel continuously shifts only between soft focus and full sharpness over a restrained 10-second cycle, without changing opacity, brightness, contrast, glow, or pause behavior;
- a read-only last-ten Chat shelf in native Foundry order, with older messages above and the newest message at the bottom and automatically in view when the shelf opens or refreshes;
- assigned-investigator resolution with a safe single-owned fallback;
- investigator portrait, name, current HP, SAN, POW, current MP, Luck, and status indicators;
- inline Luck adjustment with compact up/down controls while the Luck card itself remains a native CoC7 check;
- investigator-sheet access from the portrait and name;
- responsive card grids for characteristics, skills, weapons, combat skills, and consequences;
- the eight native CoC7 characteristics shown by their full localized names;
- native CoC7 characteristic, Sanity, Luck, skill, and weapon checks;
- a Combat shelf ordered as combat skills, standard Foundry combat participation, then enhanced weapon cards;
- compact weapon cards with ammunition in the header and separate native Attack, linked Skill Check, direct Damage Roll, and alternative-skill actions;
- editable current ammunition, read-only magazine capacity, empty-magazine protection, and native CoC7 shot-count synchronization without double spending;
- guarded normalization of malformed legacy uses-per-round text before CoC7 builds its native combat card, preventing Foundry Roll parser errors without replacing the system combat workflow;
- current canvas-target count and attacks-per-round information in the Combat shelf;
- native standard-combat controls in the Combat shelf: join or leave with the investigator token, determine CoC7 initiative, toggle the system “Gun ready” flag, and see the current round or highlighted personal turn;
- a Consequences shelf with all seven native CoC7 investigator conditions grouped into physical and mental states;
- active condition icons shown directly in the Consequences dock button, including compact overflow handling;
- native CoC7 `toggleCondition()` updates that respect the system `statusPlayerEditable` permission and stay synchronized with Actor and token status effects;
- coalesced condition refreshes and animation-free shelf refreshes that keep the hover-opened Consequences shelf stable while multiple states are changed;
- the native CoC7 death check while the investigator is Dying;
- a read-only list of other Actor and embedded-Item Active Effects below the condition controls, without duplicating CoC7 condition effects;
- a single-line skill toolbar with a compact search field, occupation-skill filtering and markers, pinned skills, and eight most recently used skills;
- fast-forward checks with `Shift + click` where supported by CoC7;
- width-aware card columns and internal scrolling for long lists;
- client-side state stored in a versioned `DataModel` setting;
- distraction-free interface mode based on unique body classes;
- preservation of Foundry chat messages, native pause behavior, dialogs, and canvas effects;
- a hover-opened read-only preview of the ten latest visible chat cards, including native roll flavor text and a Foundry v14 ChatLog action for opening the full chat;
- the Recent Chat action placed before Volume in the right-side system controls;
- a hover-opened free-dice shelf between Recent Chat and Volume, with built-in die-shape icons, concise `d3` through `d100` labels, and public `1dX` rolls sent through the native Foundry Roll workflow;
- a hover-opened **Action Request** shelf between Skills and Combat where a player chooses an intended action instead of first knowing the mechanical skill, with in-place category/search filtering, current Actor values, CoCID-first skill resolution, specialization selection, automatic omission of actions unavailable to that Actor, and no separate characteristic-only category;
- an optional CoC7 interaction provider for Ginzzzu's GM Dashboard, allowing the Keeper to propose the same action/check to a connected player with difficulty and bonus/penalty-die parameters while the final roll still uses native CoC7 APIs;
- a hover-opened `?` rules-reference shelf immediately after Dice, with a responsive two-column quick reference for core CoC7 roll, combat, wound, and treatment rules;
- local Foundry music, ambience, and interface volume controls in one horizontal row with reversible mute;
- standard Foundry interface toggle;
- emergency `Ctrl+Shift+H` keybinding;
- a clear action for the recent-skill history;
- the investigator-creation wizard with explicit Amygdal setup selection and automatic occupation and skill loading;
- native Foundry v14 minimization/maximization for the investigator-creation wizard, including a true header-only minimized state;
- a versioned user draft for the staged creation workflow and reserved Base, Personal, Occupation, Experience, and Total skill columns;
- setup-driven skill allocation without a module-specific starting-skill cap;
- working setup-driven characteristic and Luck rolls with persistent regular, half, and fifth values;
- optional drag-and-drop swaps within the separate `3D6 × 5` and `(2D6 + 6) × 5` characteristic groups, with Luck excluded;
- green visual guidance for eligible characteristic swap cards and drop targets, with compact swap icons after use;
- guarded progression through setup, characteristics, age, and derived values;
- a complete age step for ages 15–89 with Education improvement checks, teenage Luck rerolls, distributed characteristic deductions, fixed Appearance/Education reductions, and movement penalties;
- a derived-values review with final characteristics, half/fifth values, HP, SAN, MP, MOV, Damage Bonus, and Build;
- an age page that always keeps the age field visible and reveals recalculated adjustments in place;
- occupation selection that preserves search and scroll state, uses a dynamic “Occupation: selection/name” heading, and clearly marks the active card;
- a working occupation-skills step driven by the selected CoC7 occupation document, including required skills, choice groups, free occupation choices, named specializations, Credit Rating limits, optional characteristic formulas, and persistent allocations;
- context-aware naming fields for unnamed templates such as Art/Craft, Language, Own Language, and Survival instead of a generic specialization caption;
- occupation free-choice guidance that identifies these choices as the investigator's personal specialization rather than skills prescribed by the occupation;
- a table-first occupation-skills layout with a dynamic occupation heading, prominent point counter, compact decision controls, sticky table headers and skill names, and dark module-styled selects;
- a working Personal Interests step using final Intelligence × 2, the setup skill list, persistent personal allocations and specializations, exact pool validation, a single clearly labelled Own Language field, and the same table-first layout;
- separate read-only occupation values and editable personal values on the Personal Interests page, with Credit Rating limits, zero Experience, and Cthulhu Mythos protection enforced by domain logic;
- a combined Investigator Data and Backstory step with persistent name, selected gender, birthplace, residence, and seven optional native CoC7 backstory fields;
- guarded progression requiring only the investigator name and gender, with portrait and token assignment intentionally left to the Keeper outside the player-facing wizard;
- a complete final Review step with investigator details, final characteristics, derived values, point totals, the full skill table, non-empty backstory fields, and direct links back to every editable section;
- independent final validation before creation, including exact occupation and personal pools, Credit Rating, specializations, zero Experience, and Cthulhu Mythos protection;
- finalization into the CoC7 investigator Actor assigned to the current user, using the real selected setup, occupation, and skill documents;
- direct writing to the assigned owned Actor without `ACTOR_CREATE` permission, Keeper confirmation, or module socket requests;
- preservation of Keeper-configured portrait and prototype-token settings while synchronizing the Actor and token names and transferring characteristics, attributes, investigator information, biography/backstory, monetary configuration, occupation, and skills;
- safe batch reuse/import of occupation and skill Items without invoking CoC7 occupation auto-processing, exact duplicate reconciliation, guarded rollback, and automatic repair of the unambiguous duplicates created by version 0.15.1;
- a first Keeper-facing session-zero monitor opened from a separate GM-only standalone scene-control button, with one tab per non-GM user who has an assigned investigator Actor;
- debounced, versioned progress snapshots stored on the assigned Actor, including the serialized draft, current step, completed steps, validation issues, point-pool totals, readiness, completion state, and timestamps;
- automatic Keeper-side refresh through ordinary Actor and User hooks, with player online status, current step, incomplete sections, occupation/personal point totals, and direct access to the assigned sheet, while preserving the selected player, scroll positions, open diagnostics, and keyboard focus during live updates;
- a full read-only draft summary in the selected Keeper tab, reusing the final Review data builder for investigator identity, characteristics, derived values, skills, point pools, and backstory;
- a summary-first Keeper layout with compact progress, point, and issue indicators above the investigator data, while full step and issue lists remain available in collapsible diagnostics;
- a momentary Keeper-monitor launcher that restores the previously selected scene control, does not remain highlighted, and can reopen the window after it is closed;
- progressive empty states for creation sections the player has not reached yet, without Keeper-side editing or draft mutation;
- a full read-only Actor fallback for completed investigators without a stored draft, including identity, characteristics, derived values, skill allocations, point pools, and biography/backstory;
- explicit partial-data and empty states for older or incomplete investigator sheets, without startup migrations or Actor writes;
- two-row player tabs that keep the assigned Actor name and step progress inside the clickable tab boundary;
- read-only completed-state detection for older module-created investigators, without startup migrations or Actor writes;
- creation-action state derived from the assigned Actor progress snapshot and the assigned sheet itself: start for untouched Actors, continue for unfinished drafts, and no player creation button after completion or when an existing CoC7 Actor is already populated;
- public module API: `open`, `close`, `toggle`, `openCreation`, `openKeeperMonitor`, `actor`, and `application`;
- two 1920s investigator setup methods: characteristic rolls or strict 460-point allocation with separately rolled Luck;
- Russian and English localization;
- strictly scoped CSS.


## Installation for development

Place the `ginzzzu-coc7-player-hud` directory in Foundry's `Data/modules` directory and enable the module in a world using the `CoC7` system.

The HUD opens automatically for non-GM users. A GM can preview it from the console:

```js
await game.modules.get("ginzzzu-coc7-player-hud").api.open();
await game.modules.get("ginzzzu-coc7-player-hud").api.openCreation();
await game.modules.get("ginzzzu-coc7-player-hud").api.openKeeperMonitor();
```

## Development archive policy

- The first archive contains every project file.
- Later archives contain only new or modified files, preserving their project-relative directory structure.

## 0.28.1 creation usability fix

Occupation-skill and personal-interest allocation tables now keep their scroll position and active field while values are saved, so entering several skills in sequence no longer jumps the list back to the top.
## Action Request and GM interaction

The Action Request catalogue lives in this CoC7 module and maps player intent to the assigned investigator's actual skills, characteristics, and specializations. It does not decide whether a roll is required: the Keeper remains responsible for calling for checks and setting the situation.

Combined mode is owned entirely by Player HUD. A player can select at least two available checks, add any of the eight characteristics, assign each selected check its own bonus/penalty dice value from -2 to +2, choose whether **all** checks or **at least one** must succeed, and make one shared percentile roll. The HUD does not reimplement the CoC7 outcome rules: a focused adapter enters the bundled CoC7 runtime through `CONFIG.CoC7Link.documentClass`, creates the native combined chat card, and triggers the card's own `rollActor` action so CoC7 remains responsible for parsing, building the shared dice-pool range required by the per-check modifiers, individual success levels, and the combined result.

When `ginzzzu-gm-dashboard` exposes its Interaction API, this module registers a CoC7 provider through the public module API/custom hook. The provider accepts combined request payloads with the `all`/`any` condition and converts the Dashboard’s generic per-selection `modifierValue` into the CoC7 `poolModifier` for every selected check. Locked requests keep those modifiers fixed; unlocked requests let the player adjust them before the roll. GM Dashboard remains optional and system-agnostic; all CoC7 catalogue resolution and combined-roll execution stays in Player HUD. Without GM Dashboard, the local Combined mode remains fully usable.
