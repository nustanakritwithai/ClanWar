# Phase 3B-B1 Mobile Test Script — Projectile + Hit Shape Foundation

> A step-by-step test script for trying out Phase 3B-B1 on a real Android
> phone. **No technical background needed** — just follow the steps in
> order and note what you see. This is for manual QA of the
> live/preview build; it does not require reading any code.

---

## Before you start

- **Device**: An Android phone, using the **Chrome** browser.
- **Orientation**: Turn your phone **sideways (landscape)** before opening
  the game — the game is designed for landscape play.
- **Link**: Open the live or preview link provided by the team.
- Keep this checklist open in another tab/window (or print it) so you can
  tick things off as you go.

For each step, write **OK** if it works as described, or **PROBLEM** plus a
short note (and a screenshot/screen recording if possible) if something
looks wrong.

---

## Part 1 — Getting into a match

1. **Open the link** in Chrome on your phone, with the phone turned
   sideways (landscape).
   - ✅ Expected: The game loads and shows the **Start** screen.

2. **Tap Start.**
   - ✅ Expected: You move to the **Class Select** screen, showing the 5
     classes (Guardian, Warrior, Ranger, Mage, Priest).

3. **Pick any class** and confirm/start the match.
   - ✅ Expected: You enter the **Match** screen. You should see your
     character, a practice dummy, a movement joystick (usually
     bottom-left), and skill buttons (usually bottom-right).

---

## Part 2 — Basic movement and attack

4. **Move around** using the joystick (left thumb).
   - ✅ Expected: Your character moves smoothly in the direction you push
     the joystick.

5. **Walk up next to the practice dummy** and tap the **Attack** button a
   few times.
   - ✅ Expected: Your character hits the dummy, a damage number pops up,
     and the dummy's health bar goes down a little each time.

---

## Part 3 — Ranger Power Shot (only if you picked Ranger, or repeat with Ranger)

> If you didn't pick Ranger in Part 1, you can restart and pick Ranger for
> this part, or skip if testing a different class only.

6. **Stand a short distance away from the dummy** (not right next to it),
   facing toward it.

7. **Walk forward a little** (hold the joystick) while tapping the
   **Power Shot** skill button.
   - ✅ Expected: You can walk **and** fire Power Shot at roughly the same
     time — movement doesn't stop just because you tapped the skill
     button, and the skill still fires.

8. **Fire Power Shot at the dummy** (facing it, within range).
   - ✅ Expected: An arrow/projectile flies from your character toward the
     dummy. When it reaches the dummy, the dummy takes damage (health bar
     drops, damage number appears), and the arrow disappears.

9. **Turn away from the dummy and fire Power Shot** so it doesn't aim at
   the dummy.
   - ✅ Expected: The arrow flies off in that direction and **disappears**
     after traveling some distance — it does **not** stay on screen
     forever, and the dummy's health does not change.

---

## Part 4 — Mage Fireball (only if you picked Mage, or repeat with Mage)

> If you didn't pick Mage, restart and pick Mage for this part, or skip if
> testing a different class only.

10. **Stand a short distance away from the dummy**, facing toward it.

11. **Walk and fire Fireball at the same time** (hold joystick + tap
    Fireball button).
    - ✅ Expected: Same as step 7 — both movement and the skill work
      together without either one breaking.

12. **Fire Fireball at the dummy** (facing it, within range).
    - ✅ Expected: A fireball projectile flies toward the dummy. When it
      hits, the dummy takes damage and you see an impact effect. The
      fireball disappears after hitting.

13. **Fire Fireball away from the dummy** (not aimed at it).
    - ✅ Expected: The fireball flies off and disappears after traveling
      some distance, without affecting the dummy.

---

## Part 5 — Two-finger (multi-touch) controls

14. **Hold the joystick down with your left thumb** (so your character is
    moving), then **tap a skill button with your right thumb** while still
    holding the joystick.
    - ✅ Expected: Your character keeps moving **and** the skill fires —
      neither input cancels the other.

15. **While still holding both**, **lift your right thumb** (release the
    skill button) but **keep holding the joystick** with your left thumb.
    - ✅ Expected: Your character **keeps moving** — movement does not
      stop just because you lifted your other thumb.

16. **Now lift your left thumb** (release the joystick).
    - ✅ Expected: Your character **stops moving** cleanly. No skill
      accidentally fires just from releasing the joystick.

---

## Part 6 — Different screen sizes

> If you can, try this on more than one device, or use your browser's
> device-size/emulation tools if you have access. If you only have one
> phone, do your best with what you have and note your phone's screen
> size.

17. **Test on a "915 x 412" sized screen** (a common large-phone landscape
    size, e.g. Pixel-style phones).
    - ✅ Expected: Everything from Parts 1–5 still works. Joystick, skill
      buttons, dummy, projectiles, and damage numbers are all visible and
      usable — nothing overlaps awkwardly or runs off-screen.

18. **Test the Class Select screen on a "800 x 360" sized screen** (a
    common smaller-phone landscape size).
    - ✅ Expected: The Class Select screen still shows all 5 classes
      clearly, and you can tap to pick one and start a match without
      anything being cut off or overlapping.

19. **Turn your phone to portrait (upright) mode** while on the Menu or
    Match screen.
    - ✅ Expected: You see a message/hint asking you to **rotate your
      device to landscape** — the game does not try to display the full
      match UI in portrait mode.

---

## What to do with your results

- For each numbered step, write down **OK** or **PROBLEM**.
- For any **PROBLEM**, include:
  - What step number it was
  - What you expected vs. what actually happened
  - A screenshot or short screen recording if possible
  - Your phone model and screen size, if known

Send your results back to the team along with the PR number being tested.
