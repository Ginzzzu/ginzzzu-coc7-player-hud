# Ginzzzu's CoC7 Player HUD

![GitHub Release](https://img.shields.io/github/v/release/Ginzzzu/ginzzzu-coc7-player-hud?label=Version)
![Total Downloads](https://img.shields.io/github/downloads/Ginzzzu/ginzzzu-coc7-player-hud/ginzzzu-coc7-player-hud.zip?label=Total%20Downloads)
![Latest Release Downloads](https://img.shields.io/github/downloads/Ginzzzu/ginzzzu-coc7-player-hud/latest/ginzzzu-coc7-player-hud.zip?label=Latest%20Release)

A compact player HUD for **Call of Cthulhu 7th Edition** on **Foundry VTT v14**.

Ginzzzu's CoC7 Player HUD gives investigators fast access to characteristics, skills, combat, conditions, dice, recent chat, action requests and investigator creation without constantly opening the character sheet.

The module uses the native CoC7 system workflows wherever possible, keeping rolls, combat actions, conditions and investigator data compatible with the system itself.

---

## Download & Installation

### Install through Foundry VTT

Open:

**Add-on Modules → Install Module**

and paste the following Manifest URL:

```text
https://github.com/Ginzzzu/ginzzzu-coc7-player-hud/releases/latest/download/module.json
```

### Download Latest Release

**[Download Ginzzzu's CoC7 Player HUD](https://github.com/Ginzzzu/ginzzzu-coc7-player-hud/releases/latest/download/ginzzzu-coc7-player-hud.zip)**

### Manual Installation

1. Download the latest ZIP archive.
2. Extract it into your Foundry VTT modules directory:

```text
FoundryVTT/Data/modules/ginzzzu-coc7-player-hud
```

3. Restart Foundry VTT.
4. Open your Call of Cthulhu 7th Edition world.
5. Enable **Ginzzzu's CoC7 Player HUD** in **Manage Modules**.

---

## Main Features

### Player HUD

* Compact HUD designed specifically for Call of Cthulhu 7th Edition.
* Investigator portrait and name with quick access to the character sheet.
* Current Hit Points, Sanity, Power, Magic Points and Luck.
* Full localized names for all eight characteristics.
* Native CoC7 characteristic, Sanity, Luck and skill checks.
* Occupation skill filtering, pinned skills, search and recently used skills.
* Responsive layout designed to remain compact during play.
* Russian and English localization.

### Action Requests

The **Action Request** shelf lets a player describe what their investigator wants to do without first knowing which mechanical skill should be rolled.

The HUD resolves available actions against the investigator's actual skills, characteristics and specializations.

Supported modes:

* **Single Check**
* **Combined Check**
* **All checks must succeed**
* **At least one check must succeed**
* individual bonus or penalty dice for selected checks
* characteristics and skills in the same combined check

Combined checks use the native CoC7 roll logic rather than replacing the system's success calculations.

### Combat

The Combat shelf provides quick access to:

* combat skills;
* weapons;
* attacks;
* linked skill checks;
* direct damage rolls;
* alternative weapon skills;
* current ammunition;
* magazine capacity;
* attacks per round;
* current targets;
* joining or leaving Foundry combat;
* CoC7 initiative;
* the **Gun Ready** state;
* current combat round and personal turn.

Weapon actions remain connected to the native CoC7 combat workflow.

### Consequences & Conditions

The Consequences shelf displays and controls the investigator's native CoC7 conditions.

Supported states include physical and mental consequences, with active condition icons shown directly on the HUD.

The shelf also provides:

* native condition toggles;
* the CoC7 death check while Dying;
* a read-only list of other Actor and Item Active Effects.

### Dice

A compact free-dice shelf provides quick public rolls from:

* d3
* d4
* d6
* d8
* d10
* d12
* d20
* d100

Rolls use Foundry's native Roll workflow.

### Recent Chat

The HUD includes a read-only preview of the latest visible chat messages.

The newest messages remain in view automatically, and the full Foundry Chat Log can be opened directly from the HUD.

### Rules Reference

A built-in quick-reference shelf provides convenient access to frequently used Call of Cthulhu mechanics during play, including:

* core checks;
* combat;
* wounds;
* treatment.

### Volume Controls

The HUD provides local controls for:

* music;
* ambience;
* interface sounds;
* mute/unmute.

These controls affect only the current user's Foundry client.

### Interface Mode

The module includes a distraction-free interface mode for players while preserving Foundry dialogs, chat messages, pause behavior and canvas effects.

An emergency shortcut is also available:

```text
Ctrl + Shift + H
```

---

## Investigator Creation

Ginzzzu's CoC7 Player HUD includes a staged investigator-creation wizard for the 1920s setup.

The wizard supports:

* characteristic rolls;
* 460-point characteristic allocation;
* separately rolled Luck;
* age adjustments from 15 to 89;
* Education improvement checks;
* teenage Luck rerolls;
* derived characteristics;
* occupation selection;
* occupation skill allocation;
* Credit Rating limits;
* skill specializations;
* Personal Interest points;
* investigator personal data;
* backstory;
* final validation and review.

Character creation works directly with the investigator Actor assigned to the player.

Keeper-configured portrait and prototype-token settings are preserved when investigator data is finalized.

---

## Keeper Session-Zero Monitor

The module also includes a Keeper-facing monitor for investigator creation.

The Keeper can see the progress of players with assigned investigator Actors, including:

* online status;
* current creation step;
* completed and incomplete sections;
* validation issues;
* occupation point totals;
* personal-interest point totals;
* readiness for final creation;
* completed investigator data.

The monitor is read-only and does not modify the player's draft.

It can also display existing completed investigators when no stored creation draft is available.

---

## Optional GM Dashboard Integration

Ginzzzu's CoC7 Player HUD can integrate with **Ginzzzu's GM Dashboard**.

When the Dashboard is installed, the Keeper can send CoC7 Action Requests to connected players, including:

* requested action or check;
* difficulty;
* bonus or penalty dice;
* combined checks;
* **All / At least one** combined-check conditions.

The Player HUD remains fully usable without GM Dashboard.

All Call of Cthulhu-specific action resolution and roll execution stays inside the Player HUD.

---

## Compatibility

| Component                   | Version |
| --------------------------- | ------- |
| Foundry Virtual Tabletop    | v14     |
| Verified Foundry build      | 14.365  |
| Call of Cthulhu 7th Edition | 8.15+   |

The **CoC7** system is required.

---

## Community & Support

**Discord:**
https://discord.gg/bHA7JhVUCX

**Boosty:**
https://boosty.to/ginzzzu

**GitHub:**
https://github.com/Ginzzzu/ginzzzu-coc7-player-hud

---

## For Developers

The public module API exposes:

```js
game.modules.get("ginzzzu-coc7-player-hud").api
```

Available API methods include:

```text
open
close
toggle
openCreation
openKeeperMonitor
actor
application
```

A GM can open module interfaces from the console, for example:

```js
await game.modules.get("ginzzzu-coc7-player-hud").api.open();
await game.modules.get("ginzzzu-coc7-player-hud").api.openCreation();
await game.modules.get("ginzzzu-coc7-player-hud").api.openKeeperMonitor();
```

Detailed implementation changes and version history are maintained in:

**[CHANGELOG.md](https://github.com/Ginzzzu/ginzzzu-coc7-player-hud/blob/main/CHANGELOG.md)**

---

## License & Credits

Ginzzzu's CoC7 Player HUD is an independent module for Foundry Virtual Tabletop and the Call of Cthulhu 7th Edition game system.

Foundry Virtual Tabletop and Call of Cthulhu are the property of their respective owners.
