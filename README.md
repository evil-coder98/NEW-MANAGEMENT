# NEW MANAGEMENT — V0.2

## Run
Open `index.html` in a modern browser, or upload the contents of this folder to a GitHub Pages repository.

## V0.2 changes
- Shift 1 begins immediately after the title screen; the only abnormality is One Sin, One Hundred Good Deeds.
- Employees start at exactly 25/50 sanity.
- Employees continuously wander around their own floor using a waypoint path network, and can be redirected while walking.
- Hallway routing uses door/junction waypoints rather than diagonal shortcuts through the facility. Employees do not change floors during idle wandering.
- One Sin has permanent `???` sanity, cannot breach, and can be assigned all four exercises.
- Exercises take 30 seconds, with a visible countdown in the containment room. Abnormality sanity changes gradually during the exercise according to its preferences.
- Abnormality sanity is clamped to 0–100 and decreases over time when not being exercised; Class 1 has permanent unmeasurable sanity.
- Energy is accumulated from the displayed energy-per-minute rate. Room bars use 1500 energy/minute as the full scale.
- Exercise penalties cannot kill employees except when a Class 4 or 5 abnormality dislikes the exercise and the employee's sanity is exhausted. Sacrifice remains an explicit separate action.
- Modal employee selection is scoped to the modal, preventing clicks on wandering employee sprites from accidentally triggering assignment actions.
- Generated employee names are checked case-insensitively for duplicates.

## V0.2.1 hotfix
- Fixed the starting abnormality not rendering: One Sin now receives explicit `floor: 1` and `side: "left"` placement data required by the facility renderer.

## Editable content
- `data.js`: intro text, starting money, sanity values, movement speeds, class colours, class stat ranges, names, abnormality generation and audio paths.
- `style.css`: interface palette, room appearance, floor layout, typography, sprites and responsive styling.
- `audio.js`: music and sound-effect playback.
- `game.js`: simulation, pathfinding, exercises, breaches, suppression and economy.

## Facility layout
Each floor has one central main room, Hall 1 and Hall 2, one containment chamber connected to each hall, and a vertical floor connector. Employees wander only on their assigned floor unless a future explicit floor-transfer order is implemented.

## Known scope limits
This remains an evolving prototype. Abnormality-specific breach movement/targeting, full combat behaviours, equipment inventory, floor-transfer commands, save/load and expanded animation/audio remain future development tasks.
