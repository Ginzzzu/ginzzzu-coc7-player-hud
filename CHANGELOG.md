# 0.8
- Fixed Sanity adjustments from Player HUD to properly update Daily Sanity Loss and trigger system insanity conditions via native `actor.setSan()`.
- Switched Player HUD chat preview to native `ChatMessage.renderHTML()` and connected native ApplicationV2 `expandRoll` action delegation to Foundry VTT 14 ChatLog.

# 0.7
- Fixed dashboard chat action buttons in roll card.

# 0.33.5

- Strengthened incomplete occupation-decision cards with an amber border, inset marker, tinted background, and explicit localized “Required choice” badge so they are not visually lost above the numeric allocation table.
- Highlighted each still-empty free-choice select independently and added responsive stacking for the decision-card status on narrow wizard layouts.

# 0.33.4

- Added an immediate non-blocking warning when a starting skill total exceeds 100, without restoring a hard skill cap or waiting for the full allocation pool to be spent.
- Highlighted both the editable allocation field and computed Total cell in red on the occupation and personal-interest steps, with a localized explanatory tooltip.

# 0.33.3

- Changed the occupation and personal allocation counters to use amber while points remain, green only for a fully valid allocation, and red only for overflow or another blocking validation error.
- Added explicit localized counter details for remaining points, overspending, complete allocation, and exact-pool allocations that still contain another error.

# 0.33.2

- Removed the module-specific cap of 80 on starting skill totals. Occupation and personal-interest allocations are now limited only by their available point pools, Credit Rating bounds, and the prohibition on assigning creation points to Cthulhu Mythos.
- Removed the obsolete cap notice and per-skill cap validation while preserving exact-pool validation and zero creation Experience.

# 0.32.7

- Matched the visible Dice So Nice timing of ordinary CoC7 checks for Combined rolls. CoC7 8.15 creates its Combined ChatMessage before rolling and drops `dicePool.newRolls` while rebuilding that message, so the result previously rendered before the 3D animation.
- After the native Combined roll resolves, the adapter now attaches one evaluated visualization `Roll` built only from the already-rolled CoC7 dice pool to the same ChatMessage. This lets Dice So Nice use its normal ChatMessage update pipeline instead of a separate `showForRoll()` call.
- While Dice So Nice's standard “display chat after animation” option is active, the complete Combined result content is temporarily treated as the new `.dice-roll` block, waits for `waitFor3DAnimationByMessageID()`, and is then restored without the temporary wrapper. No second random roll or custom result calculation is introduced.
- If message-level Dice So Nice integration fails, the previous direct visualization remains a guarded fallback and cannot invalidate a successful CoC7 check.

# 0.32.6

- Reworked Combined-check modifier controls into a vertical selected-check list, removing the horizontal scrollbar from both local Combined mode and editable incoming combined requests.
- Styled the compact modifier selects and their native option list to match the Player HUD dark brass/green surface treatment.
- Reordered per-check modifier choices to show bonus dice first: `+2`, `+1`, none, `-1`, `-2`. The modifier values and CoC7 roll behavior are unchanged.

# 0.32.5

- Added per-check bonus/penalty dice to Combined mode. Each selected skill, characteristic, or attribute now keeps its own `poolModifier` from -2 to +2 instead of forcing one modifier across the whole combination.
- The native CoC7 combined adapter now serializes each check's modifier into its own roll requisite, so CoC7 8.15 builds the shared percentile pool across the full modifier range and evaluates each check against the correct dice subset.
- Incoming combined requests preserve those per-check modifiers. If the Keeper locks request parameters they are read-only for the player; otherwise the player can adjust each check's bonus/penalty dice before rolling.
- The optional GM Dashboard composer contract now exposes generic modifier options per selected check; the Dashboard returns opaque `modifierValue` data and this CoC7 provider converts it to `poolModifier`, while the old global modifier remains a Single-mode control. Backward compatibility is retained for older combined payloads that only contain a global modifier.

# 0.32.4

- Fixed the Dice So Nice percentile visualization for combined checks so a normal roll produces exactly the standard two physical percentile dice. The fallback now supplies one evaluated `d100` result containing the already-rolled CoC7 percentile value; Dice So Nice decomposes that result into its tens (`d100`) and units (`d10`) dice itself.
- Removed the extra explicit `d10` term that caused three dice to appear. Bonus/penalty dice remain additional tens dice only.
- No reroll is performed: the visualization still reuses the native CoC7 `baseDie` and `unitDie` values.

# 0.32.3

- Corrected the Dice So Nice fallback for native CoC7 combined checks: the shared percentile result is now visualized as a `d100` tens die plus a `d10` units die instead of a tens-only custom die plus `d10`. Existing bonus/penalty tens dice remain additional decader dice.
- The visualization still reuses the already-resolved CoC7 dice-pool values and never performs a second random roll.

# 0.32.2

- Fixed native combined-card execution for CoC7 8.15 by dispatching a stable synthetic click event so the system handler can safely read `currentTarget` after its asynchronous message load.
- Added an isolated Dice So Nice fallback for combined checks when CoC7 does not attach its native `Roll` to the ChatMessage; the fallback reconstructs only the 3D visualization from the already-rolled CoC7 dice pool and does not reroll or recalculate the check.

# 0.32.1

- Fixed Combined-roll execution on installed CoC7 8.15 packages. The release manifest exposes only the bundled `system.js`, so the HUD no longer tries to dynamically import the source-only `coc7/apps/chat-combined-message.js` path.
- Combined checks now enter CoC7 through its runtime `CONFIG.CoC7Link.documentClass` bridge, create the native combined chat card, and trigger that card's native `rollActor` handler after CoC7 attaches its ownership-aware listeners. Parsing, the shared percentile pool, bonus/penalty dice, and `all`/`any` resolution remain owned by CoC7.
- Fixed focus restoration after partial Action Request rerenders: combined characteristics, request cards/specializations, operator buttons, and mode buttons are restored by their stable data identity instead of the first element sharing the same action. This removes the misleading focus frame from the first characteristic.

# 0.32.0

- Added **Combined** mode to the player Action Request shelf. The player can select two or more available request checks plus any of the eight characteristics, choose **All** or **At least one**, and resolve them with one shared CoC7 percentile roll.
- Added an isolated `Coc7CombinedRollService` adapter that delegates parsing, the shared dice pool, per-check success levels, and the combined `all`/`any` result to CoC7's own `CoC7ChatCombinedMessage` implementation instead of duplicating percentile-roll rules in the HUD.
- Combined selections are re-resolved against the current Actor before rendering and before rolling, so changed/deleted skills do not leave stale request data. Recently used skills are updated in one preferences write after a combined roll.
- Extended the optional GM interaction provider with a `combined-check-request` capability, characteristic descriptors, combined request payloads, incoming combined-request presentation, and execution through the same Player HUD service. GM Dashboard remains optional and no Dashboard code is imported into this module.
- Added synchronized Russian and English UI text and strictly scoped styles for combined selection, condition controls, and the compact combined-roll builder.

# 0.31.2

- Reordered the player HUD main navigation so Action Request is first, followed by Characteristics and Skills; Combat and Consequences retain their existing relative order.
- The change uses the existing `MAIN_SECTION_IDS` configuration only; no template, behavior, or CSS changes were introduced.

# 0.31.1

- Fixed the player Action Request search placeholder being visually clipped in the final category-grid cell by reclaiming the native browser search-decoration space and slightly tightening the field's internal spacing. Entered search text behavior is unchanged.

# 0.31.0

- Removed the former standard/expanded HUD layout and its mode-switch button. The player HUD now always uses the established compact layout.
- Kept the legacy `displayMode` preference field only for safe loading of settings saved by older versions; any legacy value is normalized to compact and no longer affects rendering.
- Moved Action Request search from the shelf header into the unused final cell of the category grid, producing a balanced 4 × 2 layout (2 columns on narrow screens).
- The GM interaction composer receives the matching search placement in GM Dashboard 1.3.2.

# 0.30.0

- Incoming Keeper requests now highlight the player `Request` button with a bright pulsing yellow outline.
- POW is shown in the top vital strip beside SAN and can launch the native CoC7 characteristic check.
- Removed Luck and POW from the action-request catalog; Luck remains in the vital strip and POW is now directly available there.
- Removed the separate `No special skill` request category: STR/CON/DEX actions moved to Physical, INT/EDU to Investigation, and APP to Social.
- Consequences now opens on hover like the other HUD shelves.
- Any in-shelf rerender suppresses the shelf entrance animation and restores scroll/focus, preventing visible reopen/flicker during internal actions.
- Skill values are not threshold-filtered: a real Actor skill at 1% (or 0%) remains eligible for action requests when the catalog can resolve that skill.

# 0.29.1

- Changed the Action Request shelf back to hover-open behavior on mouse/trackpad while preserving the existing click/touch fallback.
- Removed full HUD rerenders from Action Request category/search filtering; both now filter the already rendered cards in place, eliminating the visible flash when switching action types.
- Changed CoC7 skill resolution to prefer the system CoCID stored on embedded skill Items, with localized-name aliases only as a fallback. Added aliases matching the Russian investigator sheet, including «Внимание», «Чтение следов», «Работа в библиотеке», «Бухгалтерское дело», «Юриспруденция», «Средства», «Лазанье», «Прыжки», «Ориентирование» and «Взлом».
- Corrected the Russian social-skill mapping: Fast Talk resolves to «Красноречие», while Persuade resolves to «Убеждение».
- Action Request catalogues now omit actions whose required skill/specialization is not present on the current Actor instead of rendering disabled placeholder cards. This applies to both the player shelf and the GM interaction composer.
- Replaced horizontally clipped category strips with responsive category grids.

# 0.29.0

- Added the click-opened **Action Request** shelf between Skills and Combat. Players choose what their investigator is trying to do, while the HUD resolves the action to the current Actor's CoC7 skill, characteristic, or Luck value.
- Added the journal-based action catalogue for investigation, social interaction, physical actions, technology and transport, medicine, knowledge/crafts, and direct characteristic checks. Combat actions remain in the existing Combat shelf instead of being duplicated.
- Added search, category filters, live Actor values, and specialization selection for Science, Pilot, Other Language, Survival, and Art/Craft style skills.
- Added a CoC7 interaction provider that exposes the same catalogue to compatible GM interaction clients without copying CoC7 rules into them.
- Added incoming Keeper requests with a navigation counter, requested difficulty and bonus/penalty dice display, optional immediate-roll parameters, Roll/Dismiss actions, and sent/delivered/opened/completed/dismissed status flow through the GM Dashboard interaction API when available.
- Extended the existing native CoC7 roll service to pass supported difficulty and dice-pool options through to the system's characteristic, attribute, and skill checks; the existing CoC7 roll dialog remains the source of truth when immediate roll is not requested.
- Kept the new integration optional: the local Action Request shelf works without GM Dashboard, and the provider connects through the dashboard's public API/custom hook only when that module is present.

# 0.28.2

- Changed the player Chat shelf to the native Foundry chronological direction: older visible messages are shown above newer ones, with the newest of the last ten messages at the bottom.
- The Chat shelf now scrolls to the latest message whenever it opens or refreshes from a chat-message hook, matching the normal Foundry chat reading position.

# 0.28.1

- Preserved the internal skill-table scroll position while occupation-skill and personal-interest values are saved and the wizard rerenders.
- Preserved keyboard/mouse focus across those rerenders, including the next field reached with Tab or a click, so sequential numeric entry no longer jumps back to the top of the list.
- Preserved the occupation-decision panel scroll independently from the skill table without changing allocation calculations, validation, or draft persistence.

# 0.28.0

- Fixed investigator-wizard minimization by allowing native Foundry v14 `ApplicationV2.minimize()` to collapse the framed window to its header instead of being blocked by the wizard minimum-size CSS. Reopening a minimized wizard now uses native `maximize()`.
- Corrected creation-skill validation for characteristic-derived base values above 80: the existing base value is preserved and is valid, while occupation/personal creation points still cannot raise that skill any further. This resolves high-EDU Own Language and similar base-value cases without weakening the normal 80 allocation cap.
- Disabled occupation/personal allocation fields when a skill has no legal creation-point capacity left, while still allowing an existing non-zero allocation to be reduced.
- Stabilized the Keeper creation monitor during live Actor/User refreshes by preserving the selected player state, window position, main content scroll, player-tab horizontal position, skill-table scroll, open diagnostics, and keyboard focus.

# 0.27.0

- Added a hover-opened player rules-reference shelf as a `?` system action immediately after Dice and before Volume.
- Added a responsive two-column CoC7 quick reference for roll levels, opposed and pushed rolls, bonus/penalty dice, combat, damage/major wounds, First Aid, and Medicine.
- Kept the reference fully read-only, localized, and rendered as native module HTML/CSS rather than a raster image so it remains sharp at any UI scale.
- Added a dedicated strictly scoped `hud-reference.css` file without changing any existing roll, combat, chat, dice, volume, or creation behavior.

# 0.26.4

- Increased the continuous pause-panel focus animation so it is clearly visible during the entire paused state rather than reading as a static panel.
- Expanded the soft phase to a deliberate 1.8 px blur with lower brightness and contrast, then resolves to a brighter, sharper brass-highlighted state.
- Shortened the cycle to 4.8 seconds and added a restrained opacity and shadow transition without changing the approved panel layout, caption, or pause behavior.
- Kept reduced-motion handling and the client-side style toggle unchanged.

# 0.26.3

- Replaced the one-time pause entrance effect with a continuous restrained focus-breath animation that remains active for the entire paused state.
- Preserved the approved compact panel, inner brass frame, horizontal caption lines, localized caption, and fully hidden native pause symbol.
- The panel now slowly moves between a barely softened state and full clarity without scaling, flashing, or changing its position.
- Kept reduced-motion handling, the client setting, and native Foundry pause behavior unchanged.

# 0.26.2

- Restored the pause panel’s restrained inner brass frame and horizontal caption lines while keeping the native CoC7 pause symbol fully hidden.
- Fixed the entrance effect by listening to the native `pauseGame` hook and explicitly restarting the class-based animation every time Foundry enters pause.
- Added a two-frame display-state guard so the compact panel now visibly resolves from soft blur into full clarity instead of remaining static.
- Preserved the existing caption, client setting, native pause behavior, responsive layout, and reduced-motion handling.

# 0.26.1

- Removed the native CoC7 pause symbol and all decorative caption lines from the styled pause overlay, leaving only the compact panel and “The moment stands still” / «Мгновение застыло» caption.
- Replaced the unused continuous symbol animation with a short panel entrance that fades from a light blur into full clarity whenever the game is paused.
- Kept the existing client setting, native pause behavior, responsive layout, and reduced-motion handling unchanged.

# 0.26.0

- Added optional client-side styling for the native Foundry pause overlay without changing pause permissions or behavior.
- Replaced the system-wide black strip with a compact centered green-black panel, aged brass framing, restrained texture, and a softly breathing CoC7 pause symbol.
- Replaced the displayed caption with the localized phrase “The moment stands still” / «Мгновение застыло» while the style is enabled.
- Added a client setting enabled by default that immediately restores the system and CoC7 pause presentation when disabled.
- Scoped all visual overrides behind module-specific body and overlay classes and preserved reduced-motion accessibility.

# 0.25.0

- Added optional client-side styling for the native CoC7 bonus/penalty roll dialog without replacing its system template or roll workflow.
- Reworked the dialog into the HUD visual language with green-black layered surfaces, aged brass borders, compact readable labels, themed selects, a restrained red-neutral-green modifier scale, and a matching roll button.
- Added a client setting enabled by default that can restore the original CoC7 dialog appearance immediately.
- Scoped every override behind a module-specific body class and the exact CoC7 `bonus-selection` dialog selector so other system windows remain untouched.

# 0.24.1

- Replaced the large text inside each player Dice-shelf button with the matching built-in Font Awesome die icon.
- Kept only the concise `d3` through `d100` label below each icon, while the underlying public `1dX` formulas and roll behavior remain unchanged.
- Used the generic dice icon for `d3` and the `d10` shape for `d100`, preserving the existing four-by-two layout.

# 0.24.0

- Added a hover-opened Dice shelf between Recent Chat and Volume in the player HUD system controls.
- Added fixed public free-roll actions for `1d3`, `1d4`, `1d6`, `1d8`, `1d10`, `1d12`, `1d20`, and `1d100` in a compact four-by-two grid.
- Routed every action through the native Foundry `Roll` and `Roll.toMessage()` workflow with the assigned investigator as speaker, matching a public `/r 1dX` chat command and remaining compatible with chat history and dice-display modules.
- Kept the Dice shelf open during rolls and isolated the formula whitelist and roll creation in a focused service without changing native CoC7 checks.

# 0.23.4

- Completed a full runtime-reference audit of scripts, templates, styles, manifest entries, and creation-template preload paths.
- Removed the unused early-development placeholder template and the retired comment-only aggregate wizard stylesheet.
- Removed the localization entry used only by that placeholder; no player HUD, creation wizard, Keeper monitor, roll, combat, or chat behavior changed.
- Kept the legacy `collapsed` client-preference field solely for safe loading of settings saved by pre-0.23.3 versions; the HUD still exposes only standard and compact modes.

# 0.23.3

- Removed the impractical fully collapsed HUD state, its command-bar button, and the double-click collapse shortcut.
- Kept the standard and compact display modes unchanged, including all shelves and system actions.
- Retained the old client preference field only for safe compatibility with settings saved by earlier versions; it is no longer read or applied.

# 0.23.2

- Swapped the player HUD system-action order so Recent Chat appears before Volume, matching the GM Dashboard system block while preserving both shelves unchanged.

# 0.23.1

- Increased the recent-chat shelf from six to ten visible messages.
- Restored each roll card's native flavor text so the checked characteristic or skill and difficulty appear above the result.
- Replaced the unavailable sidebar `changeTab` call with the Foundry v14 ChatLog `activate()` API, retaining a guarded grouped-tab fallback.

# 0.23.0

- Added a read-only recent-chat shelf opened by hover from a new system action placed immediately after the volume control.
- Show the six latest messages whose content is visible to the current user, newest first, preserving native CoC7 card markup while removing all embedded action controls.
- Added a compact right-aligned scrolling layout and a direct action that restores the Foundry interface and opens the standard chat sidebar.
- Refresh the preview only while it is open when chat messages are created, updated, or deleted.

# 0.22.0

- Added the Amygdal `1920s (Points)` setup alongside the existing `1920s (Rolls)` setup on the first investigator-creation step.
- Added a separate point-allocation characteristic workflow using the setup's 460-point budget across the eight core characteristics, with Luck rolled separately from its native setup formula.
- Enforced creation bounds of 15–90, with INT and SIZ requiring at least 40, and prevented advancing until the budget is exactly allocated and Luck is present.
- Added direct numeric editing and compact decrement/increment controls, including Shift-click changes of 5, while preserving the complete roll, reroll, and within-group swap workflow unchanged for the roll setup.
- Stored the selected characteristic method and point budget in the versioned investigator draft, migrated existing drafts safely to the roll method, and reset only incompatible downstream creation state when the setup is intentionally changed.
- Extended final validation, Keeper progress snapshots, review summaries, age adjustments, derived values, occupation allocation, and Actor writing to work with either setup without duplicating those workflows.

# 0.21.0

- Moved the standard Foundry combat-participation block below combat skills and before weapon cards so the shelf prioritizes immediately usable character actions.
- Replaced the current-turn block's heavy left accent with a uniform border and restrained all-around inner emphasis.
- Added the first complete Lovecraft-inspired CSS treatment for the player HUD: green-black layered panels, aged brass borders, ivory text, subtle surface grain, vignette lighting, medallion portrait framing, catalogue-style section headings, and restrained eldritch hover/active states.
- Applied the same visual language to characteristics, skills, combat, conditions, consequences, and volume controls without changing the creation wizard or Keeper monitor.

# 0.20.0

- Added native Foundry combat participation controls to the Combat shelf: join with the assigned investigator token, leave the current combat, and resolve multiple scene tokens through the controlled token.
- Added CoC7 initiative display and rerolling through the system Combat document, preserving the world's standard or optional initiative rule.
- Added the native CoC7 `hasGun` combatant flag as a “Gun ready” toggle, including the same initiative recalculation behavior as the system combat tracker.
- Show the current combat round, waiting state, and a highlighted “Your turn” indicator without duplicating Foundry's turn-order tracker.
- Refresh the HUD after Combat, Combatant, token-control, and relevant token lifecycle changes.

# 0.19.1

- Fixed native CoC7 Attack cards failing with a Foundry Roll parser error when a legacy weapon stored descriptive or otherwise invalid text in its uses-per-round fields.
- Added a focused attack-preparation service that preserves valid formulas, extracts a valid leading roll formula from descriptive legacy values, and falls back safely before calling the native UUID-based `weaponCheck` flow.
- Moved the ammunition editor into the weapon header, removed the separate footer row, reduced icon and action heights, and placed alternative-skill checks in the same compact action grid.
- Kept empty-magazine highlighting, direct skill and damage rolls, and native CoC7 ammunition ownership unchanged.

# 0.19.0

- Changed the Consequences shelf to explicit click-to-open and click-to-close behavior on hover-capable devices; hovering the dock action no longer opens or closes this interactive shelf.
- Kept the Consequences shelf pinned while conditions change, while hook-driven refreshes of any open shelf now skip the entrance animation.
- Rebuilt weapon cards in the Combat shelf with separate native Attack, linked Skill Check, direct Damage Roll, and alternative-skill actions.
- Added current ammunition editing, read-only magazine capacity, empty-magazine warnings, and support for the CoC7 `disregardAmmo` world setting.
- Preserved the native CoC7 ranged-combat card as the authority for shot count and ammunition consumption, with a guarded repair only when the system card does not update the weapon Item.
- Added target count and attacks-per-round information to the Combat shelf and kept every roll action closing the shelf before opening its dialog or chat workflow.

# 0.18.1

- Coalesced the Actor and Active Effect updates produced by one native CoC7 condition toggle into a single HUD refresh.
- Removed the extra immediate condition render that competed with the system hooks and caused the open Consequences shelf to flash repeatedly.
- Routed hook-driven updates through the HUD render guard so hover shelves remain stable while their state is refreshed.

# 0.18.0

- Reworked the existing Consequences dock action into a native CoC7 condition shelf instead of adding another top-level button.
- Added all seven system conditions: Prone, Unconscious, Major Wound, Dying, Dead, Bout of Madness, and Indefinite Insanity, grouped into physical and mental sections.
- Show active condition icons directly in the dock button, with separate standard and compact previews plus an overflow counter.
- Toggle conditions through the system Actor `toggleCondition()` API and respect the CoC7 `statusPlayerEditable` world setting; read-only players still see every active state.
- Added the native CoC7 death check while Dying and preserved automatic shelf closing before the check opens.
- Kept other Active Effects in the same shelf as a read-only section while filtering native CoC7 status effects to avoid duplicate cards.
- Refresh condition state after Actor, Active Effect, User, and relevant system-setting updates.

# 0.17.6

- Close the currently opened HUD shelf before starting any attribute, characteristic, skill, or weapon check.
- Keep the top command bar visible while allowing the native CoC7 roll dialog to appear unobstructed above the canvas.
- Preserve Shift-click fast-forward checks and recent-skill tracking after the shelf closes.

# 0.17.5

- Raised the player HUD rendering layer above Foundry camera views so an opened shelf remains fully visible and interactive when video cameras overlap the top area.
- Kept the full-screen HUD host pointer-transparent outside the actual HUD shell, so cameras and the canvas remain interactive everywhere the HUD is not drawn.

# 0.17.4

- Added compact up/down controls directly to the Luck vital while preserving the main Luck-card click as the native CoC7 Luck check.
- A normal arrow click changes Luck by 1; Shift-click changes it by 5, with values clamped between 0 and 99 and written immediately to the assigned Actor.
- Disabled the corresponding arrow at the lower or upper boundary and added synchronized Russian and English tooltips.

# 0.17.3

- Recognize an already populated assigned CoC7 investigator as complete even when it was created outside this module and has no creation-progress snapshot.
- Hide and guard the player creation action when the Actor has all core characteristics and Luck, an occupation, and embedded skills, preventing the wizard from starting at step one over an existing sheet.
- Let Actor completeness override a stale unfinished snapshot so previously opened drafts do not re-enable creation for a filled investigator.
- Keep the Keeper monitor status consistent with the player HUD by applying the same read-only completion check.

# 0.17.2

- Added a full read-only Actor fallback for completed investigators whose creation progress has no stored draft.
- The Keeper monitor now reads investigator identity, characteristics, half/fifth values, derived values, occupation and personal point allocations, embedded skills, and biography/backstory directly from the assigned CoC7 Actor.
- Older or incomplete sheets show every available value with explicit empty states and a partial-data notice, without migration flags or any Actor writes.
- Corrected inferred completed-player point summaries to use the actual occupation and personal allocations stored on embedded skill Items, with Actor development totals as the pool limits.

# 0.17.1

- Fixed the Keeper monitor launcher so its standalone scene-control group behaves as a momentary action instead of remaining the active canvas control.
- The launcher now restores the previously selected scene control and tool after opening the monitor, allowing the same left-side button to be used again after the window is closed.

# 0.17.0

- Reworked the Keeper monitor into a summary-first layout: compact current-step, point-pool, issue, and nine-step indicators now appear above the investigator data.
- Moved the full creation-step and incomplete-section lists below the read-only investigator summary into compact collapsible diagnostics.
- Fixed reopening the Keeper monitor from its left scene-control button after the window has been closed; an already open monitor is now brought to the front instead of being toggled closed.
- Corrected the occupation free-choice hint so it describes the investigator's personal specialization rather than additional skills prescribed by the occupation.

# 0.16.9

- Fixed the player HUD creation action when no investigator Actor is assigned: it now shows “Create investigator” with the add icon instead of treating an unrelated saved user draft as resumable.
- Restored the assigned Actor progress snapshot as the sole source of the “Continue creation” state; only `inProgress` and `ready` snapshots use the edit icon.

# 0.16.8

- Added a full read-only summary of the selected player’s current creation draft to the Keeper monitor.
- Reused a shared final Review summary builder for investigator identity, characteristics, half/fifth values, derived values, skills, point pools, and non-empty backstory fields.
- Added progressive empty states for sections the player has not reached yet without adding Keeper editing or mutating player data.
- Kept older completed Actors without a stored draft outside this stage; the monitor explicitly marks their detailed summary as unavailable until the compatibility stage.

# 0.16.7

- Возвращена отдельная кнопка панели Хранителя в левую панель инструментов Foundry — в то же место и тем же способом, который был подтверждён рабочим в версии 0.16.1.
- Удалён экспериментальный вход через заголовок каталога актёров.
- Сохранены статусы «Создать / Продолжить / Завершено» и чтение завершённости без миграционных записей при запуске мира.
- Панель Хранителя снова открывается отдельной GM-only группой Scene Controls и не добавляется в инструменты токенов.

# 0.16.6

- Восстановлена кнопка открытия панели Хранителя без вмешательства в Scene Controls.
- Действие добавляется через штатный хук заголовочных элементов ApplicationV2 только в каталог актёров и только для Хранителя.
- Удалена зависимость от внутренней DOM-разметки футера каталога актёров.

# Changelog

## 0.26.5

- Slowed the persistent pause-overlay focus cycle to 10 seconds.
- Removed animated opacity, brightness, contrast, saturation, and shadow changes.
- Kept only a smooth blur-to-sharpness cycle while preserving the established panel styling.

## 0.16.5

- Removed every module hook and DOM injection related to Scene Controls to eliminate the `getSceneControlButtons` startup conflict.
- Moved the Keeper monitor entry point to a dedicated button in the Actor Directory footer, using the same stable `renderActorDirectory` pattern as CoC7.
- Removed the write-time legacy completion migration and all delayed migration scheduling.
- Kept completed-state detection read-only: current snapshots remain authoritative, while older module-created investigators are inferred from managed occupation and skill Items only when no draft exists.
- Kept the player creation action hidden for completed investigators and guarded direct wizard opening without mutating Actor data during startup.
- Made the Keeper monitor show inferred older investigators as completed without creating or changing flags.

## 0.16.4

- Removed the custom `getSceneControlButtons` control group that could break Foundry v14 scene-control preparation with `Cannot read properties of undefined (reading 'tokens')`.
- Reimplemented the Keeper monitor launcher as a standalone GM-only button inserted after the CoC7 Keeper controls during the native `renderSceneControls` hook.
- Kept the launcher visually separate from Token tools without registering a canvas control layer or active tool.
- Preserved all monitor synchronization, player tabs, creation-status logic, and completed-character migration behavior.

## 0.16.3

- Fixed a Foundry v14 startup race where the legacy completion migration updated the assigned Actor while scene controls were still being prepared, causing `getSceneControlButtons` to fail while reading the `tokens` control.
- Legacy completed investigators are now recognized synchronously without mutating the Actor, so the player creation action remains hidden immediately.
- Deferred the one-time persisted completion snapshot until the Canvas and scene controls are ready.


## 0.16.2

- Made the assigned Actor progress snapshot the source of truth for the player creation action.
- Hid the HUD creation button after a snapshot reaches `completed`, while unfinished snapshots now show “Continue creation” and untouched Actors show “Create investigator”.
- Guarded `InvestigatorWizard.open()` so API or stale UI calls cannot overwrite a completed snapshot or silently start a new process.
- Added a one-time migration for investigators completed before progress snapshots existed, detected only when the assigned Actor has both module-managed occupation and skill Items and no saved draft.
- Kept the migrated completed state visible to the Keeper monitor with all nine steps complete and the Actor development pools summarized.

## 0.16.1

- Moved the Keeper creation monitor out of the Token tool list into its own GM-only scene-control group.
- Rebuilt player tabs as explicit two-row buttons so the assigned Actor name and step progress remain inside the clickable tab boundary.
- Increased the tab's intrinsic height and removed the core button-height clipping without changing monitor data or synchronization.

## 0.16.0

- Added the first Keeper-facing session-zero creation monitor as a separate `ApplicationV2`.
- Added a GM-only tool to the Token scene controls for opening and closing the monitor.
- Added one tab per non-GM user with an assigned CoC7 investigator Actor, including online state, Actor name, current step, readiness, and completion status.
- Added a versioned `CreationProgressSnapshot` DataModel stored on the assigned Actor flag, with a stable serialized draft field for the later full read-only Review view.
- Published progress after draft changes with a 700 ms debounce, immediately on step transitions and window close, and retained a final completed snapshot after successful Actor finalization.
- Added Keeper-side automatic refresh through ordinary `updateActor`, `createActor`, `deleteActor`, and `updateUser` hooks without module socket requests.
- Added read-only step completion, validation issues, occupation/personal point totals, last-change time, manual refresh, and direct opening of the assigned Actor sheet.
- Kept the first monitor stage read-only and did not add Keeper editing or draft mutation.

## 0.15.3

- Replaced the generic “Specialization” caption for unnamed skill templates with context-aware labels and examples.
- `Art/Craft (Any)` now asks for an art or craft, `Language (Any)` asks for a language, `Own Language` asks for the native language, and `Survival (Any)` asks for an environment.
- Applied the same presentation helper to both Occupation Skills and Personal Interests without changing draft data, skill identity, allocation rules, or final Actor data.

## 0.15.2

- Fixed finalization so new occupation and skill Items are created through Foundry's static embedded-document batch API instead of the CoC7 Actor occupation processor, preventing the system from adding a second copy of required profession skills and Credit Rating.
- Added exact CoCID-based reconciliation for reused skills and occupations, including duplicate removal and stable module identities for repeat finalization.
- Added a guarded legacy repair for the Actor assigned to the current user: unambiguous duplicates created by version 0.15.1 are removed in one batch while the module-managed item with the completed allocation is preserved.
- Corrected skill data written through the bypass path by storing resolved Base, Personal, Occupation, and zero Experience adjustments explicitly, including formula-based Dodge and Own Language bases.
- Updated both the Actor name and prototype-token name while preserving the Keeper's portrait, token texture, dimensions, vision, bars, and other token settings.
- Stopped opening the native CoC7 sheet after completion, prevented the final action from propagating, and closes an already-open native CoC7 investigator wizard so the creation flow does not restart.
- Moved the setup's single required Own Language name to one clearly labelled field above the Personal Interests table; other profession languages remain ordinary separate skills.
- Changed the HUD's HP and MP indicators to show only their current values.

## 0.15.1

- Corrected finalization to write the completed investigator into the CoC7 Actor assigned to the current user through `game.user.character` instead of creating a second Actor.
- Removed the `ACTOR_CREATE` permission branch, Keeper socket request, timeout, and response flow; the Keeper does not need to confirm or answer finalization.
- Added explicit final checks for an assigned `character` Actor and Owner permission before enabling completion.
- Preserved the Keeper-configured Actor portrait and prototype-token data while updating the investigator name, characteristics, attributes, information, development pools, monetary configuration, and backstory.
- Reused matching embedded occupation and skill Items where possible, added missing Items in batches, and marked only newly imported Items for safe repeat finalization and stale-item cleanup.
- Added guarded rollback for Actor and embedded-Item changes if finalization fails, while keeping the creation draft intact.
- Updated Review messaging and the final action label to describe writing into the assigned character sheet.

## 0.15.0

- Replaced the final Review placeholder with a complete read-only summary of investigator identity, final characteristics, derived values, skill allocations, and non-empty backstory fields.
- Added focused edit links and final issue links that return directly to the relevant creation step.
- Added independent final validation for the setup, characteristics, age work, occupation, occupation points, personal-interest points, name, and gender.
- Added native CoC7 Actor creation from the real selected Amygdal setup, occupation, and skill documents instead of rebuilding system documents from local assumptions.
- Added the selected occupation as an embedded Actor item and created all skill items in one batch with separate personal and occupation adjustments, occupation flags, named specializations, and zero creation Experience.
- Added final Actor characteristics, Luck, Sanity, daily Sanity limit, investigator information, development pools, setup monetary configuration, biography/backstory, ownership, and a linked friendly prototype token.
- Added direct creation for users with `ACTOR_CREATE` permission and a guarded module-socket request to an active Keeper when the player cannot create Actors.
- Kept the draft until Actor and skill creation succeeds, removed incomplete Actors after an embedded-item failure, and opened the native CoC7 sheet after success.
- Required the setup's Own Language specialization before Personal Interests can be completed so the resulting CoC7 skill is not left unnamed.
- Added a strictly scoped review stylesheet and synchronized the manifest, documentation, and Russian/English localization.

## 0.14.0

- Merged the Backstory step into Investigator Data and reduced the creation flow from ten steps to nine.
- Replaced the free-text gender field with a localized dark-styled select and migrated known existing values to canonical options.
- Removed portrait and token controls from the player-facing creation wizard while preserving the existing draft fields for schema compatibility.
- Added persistent optional fields for personal description, ideology and beliefs, significant people, meaningful locations, treasured possessions, traits, and injuries and scars.
- Added focused backstory action, controller, context, and service modules without moving persistence or domain work into the ApplicationV2 class.
- Preserved unsaved textarea changes before navigation by waiting for pending personal-data and backstory save queues.
- Migrated drafts left on the former Backstory step safely to the combined Investigator Data page.

## 0.13.0

- Added the complete Investigator Data step for name, gender, birthplace, residence, portrait, and token image.
- Reused the existing versioned `personalData` draft schema without changing stored field types.
- Added native Foundry image pickers and separate live previews for the Actor portrait and prototype-token image.
- Kept the CoC7 wizard requirement model: name and gender are required to continue, while birthplace and residence remain optional.
- Preserved safe default images when an image path is empty.
- Added guarded progression, sidebar completion state, and a localized warning for incomplete required investigator data.
- Split the new implementation into focused action, controller, context, service, template, and stylesheet files.

## 0.12.0

- Added the complete Personal Interests step with a pool calculated from final Intelligence × 2.
- Loaded the personal-interest skill list from the selected Amygdal creation setup instead of duplicating system skill data.
- Kept occupation and personal allocations in separate draft fields while showing Base, Personal, Occupation, Experience, and computed Total together.
- Made only the Personal column editable on this step; occupation allocations remain visible and read-only, and Experience remains zero.
- Enforced the creation total cap of 80, exact personal-pool spending, Credit Rating limits, and the prohibition on increasing Cthulhu Mythos.
- Added named specializations for setup skills that require them and persisted every personal allocation and specialization in the existing versioned draft schema.
- Reconciled setup skills with selected occupation skills so profession changes clear old occupation points without discarding compatible personal allocations.
- Reused the accepted table-first allocation layout with a prominent `Points: spent / total` header counter.
- Changed occupation skill names to regular font weight.
- Fixed the Occupation Skills completion status so it clears immediately after points are reduced and the pool is no longer fully allocated.

## 0.11.1

- Reworked the Occupation Skills page around the allocation table instead of summary cards and notices.
- Added the selected occupation to the page heading and moved the prominent `Points: spent / total` counter into the header.
- Added the requested green state while points remain and red state when the occupation pool is fully spent.
- Reduced formula, Credit Rating, choice controls, source labels, completion state, and creation notes to compact supporting elements.
- Added sticky table headings and skill names, wider skill rows, stronger editable occupation fields, muted read-only Personal and Experience values, and compact accessible labels that no longer occupy a visible table cell.
- Ordered rows by Credit Rating, required skills, choice groups, and free choices.
- Styled occupation-skill selects and their options for the module's dark interface.
- Removed duplicate allocation CSS from the wizard shell so the allocation stylesheet remains the single owner of this page.

## 0.11.0

- Kept the age input on the main age page and removed the separate empty-state screen before an age is entered.
- Safely reset and recalculated age-dependent characteristic work and occupation-skill bases/formulas when age changes.
- Preserved the occupation search query and scroll position across partial renders and occupation selection.
- Removed the misleading chevron from occupation cards, added a dynamic occupation heading, and strengthened the selected-card state.
- Added the complete Occupation Skills step using the full selected CoC7 occupation document and Amygdal setup skills.
- Added required skills, group choices, free occupation choices, named specializations, Credit Rating limits, and optional characteristic choices in occupation-point formulas.
- Added persistent Base, Personal, Occupation, Experience, and computed Total rows; Experience remains zero and Cthulhu Mythos cannot receive creation points.
- Enforced the 80 creation cap and professional-point budget in domain services while preserving unspent points.
- Extended the versioned draft schema without changing existing field types.

## 0.10.0

- Added the complete age step for investigators aged 15–89 using the same age bands and adjustments as the CoC7 system wizard.
- Added age-based Education improvement checks, teenage Luck rerolls, fixed characteristic reductions, and distributed STR/CON/DEX or STR/SIZ deductions.
- Persisted every age choice and roll in the versioned investigator draft and reset stale age work after characteristic rerolls or swaps.
- Added guarded progression so later creation steps remain locked until all required age actions are complete.
- Added the derived-values step with final characteristics, half/fifth values, HP, SAN, MP, MOV, Damage Bonus, and Build.
- Reused CoC7 Actor calculation methods when available and kept matching fallbacks isolated in a dedicated service.
- Added separate age and derived context, action, service, controller, template, and stylesheet files.

## 0.9.2

- Refactored the investigator wizard into focused context, controller, template-part, and CSS files.
- Added purple styling for the 3D6 swap group and blue styling for the (2D6 + 6) swap group.
- Added group-colored drag targets when both swap groups are enabled.
- Changed swapped characteristic cards to use a dashed border in their group color.
- Retired the monolithic investigator wizard stylesheet.

## 0.9.1

- Replaced the overlapping “Swapped” text badge with a compact icon before the characteristic name.
- Gave all currently swappable cards a clear green border and background treatment.
- Highlighted valid drop targets with a stronger green glow while dragging.
- Dimmed invalid groups and Luck during a characteristic drag operation.
- Added a distinct hover state for the exact card that will receive the dropped value.

## 0.9.0

- Increased the visual emphasis of full characteristic names and rolled values.
- Added one optional value swap for the `3D6 × 5` characteristic group and one for the `(2D6 + 6) × 5` group.
- Excluded Luck from all swap groups even though its roll formula is `3D6 × 5`.
- Added native drag-and-drop swapping between eligible characteristic cards in the same enabled group.
- Stored original rolls separately from their current assigned values so swaps can be undone safely.
- Added per-group permission toggles, used-state indicators, and undo actions.
- Reset a group's swap automatically when any characteristic in that group is rerolled.
- Migrated existing 0.8 drafts to the new schema without losing rolled values.

## 0.8.0

- Fixed the investigator-wizard frame controls by limiting module button typography to the window content instead of the outer ApplicationV2 frame.
- Corrected the creation-setup card height and containment so all setup content stays inside the selected card.
- Added individual characteristic and Luck rolls using the formulas stored in the selected setup.
- Added a single action for rolling all remaining values.
- Stored every roll result in the versioned user draft and restored it after reloads.
- Added regular, half, and fifth values to the characteristic cards.
- Sent creation rolls to the Keeper in the same private-chat pattern used by the native CoC7 investigator wizard.
- Locked later creation steps until the setup is selected and all nine values are rolled.
- Added completion state and progress tracking to the Characteristics step.
- Changed Russian HUD abbreviations from HP, SAN, and MP to ПЗ, РАС, and ПМ.

## 0.7.0

- Moved the Volume shelf button into the right-side system action group.
- Reworked the three Foundry volume channels into one horizontal control row.
- Added a Clear Recent action to the Recent Skills view without affecting pinned skills.
- Added the first `ApplicationV2` investigator-creation wizard shell.
- Added automatic loading of the Amygdal `Персонаж 1920-е (Бросок)` setup.
- Added automatic loading of occupations from `Книга Сыщика` and `Книга Хранителя`.
- Added searchable occupation cards with source, credit-rating, point-formula, and skill metadata.
- Added a versioned user-flag draft `DataModel` with setup, occupation, characteristics, personal data, backstory, and skill-allocation fields.
- Reserved separate Base, Personal, Occupation, Experience, and computed Total skill columns.
- Added a domain validation service for the creation-time final skill cap of 80; Experience remains zero during creation.
- Added wizard access from the HUD system actions, the empty investigator identity block, and the public `openCreation` API.

## 0.6.0

- Kept all skill filters on a single horizontal line and prevented filter-label wrapping.
- Reduced the skill-search field width before allowing the filter strip to scroll horizontally.
- Moved Combat Skills above Weapons in the Combat shelf.
- Implemented local Foundry volume controls for music, ambience, and interface sounds.
- Added per-channel mute buttons that restore the previous non-zero level.
- Added a dedicated, strictly scoped Volume shelf stylesheet.

## 0.5.0

- Reordered the main shelves to Characteristics, Skills, Combat, Consequences, and Volume.
- Added native CoC7 occupation-skill markers based on `skill.system.flags.occupation`.
- Added the Occupation Skills filter and occupation-skill counts.
- Added the read-only Consequences shelf for Actor and embedded-Item Active Effects.
- Matched the CoC7 effect categories: Temporary, Passive, Inactive, Suppressed, and Status.
- Added effect source, duration, and readable change summaries.
- Kept the Consequences navigation button disabled until at least one effect exists.
- Added live refreshes for Active Effects embedded in owned Items.

## 0.4.0

- Removed the secondary investigator-source caption below the character name.
- Changed characteristic cards to show only the full localized characteristic name and value.
- Added the Combat shelf with responsive weapon and combat-skill cards.
- Added native CoC7 weapon attacks through the Actor `weaponCheck` API.
- Added current canvas-target information to the Combat shelf.
- Added skill search with partial ApplicationV2 rerendering.
- Added pinned skills and the eight most recently used skills.
- Added a versioned preferences-schema migration for pinned and recent skill UUIDs.
- Added live refreshes for embedded skill and weapon changes and canvas target changes.

## 0.3.1

- Reworked the Characteristics and Skills shelves into responsive card grids.
- Made card-column counts adapt automatically to the current shelf width.
- Added a constrained shelf height and internal scrolling for long skill lists.
- Kept the interaction hint visible below the scrolling card area.
- Improved card hierarchy, value badges, hover states, and narrow-width readability.

## 0.3.0

- Removed the duplicate investigator-sheet quick-action button; the portrait and investigator name remain the sheet entry point.
- Added the Characteristics shelf with the eight native CoC7 characteristics.
- Added native CoC7 characteristic checks using the Actor API.
- Added fast-forward rolls with `Shift + click`.
- Added Sanity and Luck checks directly from the vital-statistics row.
- Added a dedicated roll service and characteristic presentation service.
- Kept shelf controls usable in compact mode without shrinking shelf action cards.

## 0.2.0

- Added hover-opened shelves with delayed closing and touch/click fallback.
- Added assigned-investigator resolution with a safe single-owned fallback.
- Added investigator portrait, name, HP, SAN, MP, Luck, and status indicators.
- Added live HUD refreshes for Actor, User, and Active Effect changes.
- Added investigator-sheet access from the identity block.

## 0.1.0

- Added the standalone Foundry VTT v14 module foundation.
- Added an `ApplicationV2` top-mounted player HUD.
- Added standard, compact, and collapsed display modes.
- Added a versioned `DataModel` for client preferences.
- Added distraction-free core UI hiding with a safe restore action.
- Added the emergency `Ctrl+Shift+H` keybinding.
- Added localized placeholder shelves for Characteristics, Skills, and Volume.
