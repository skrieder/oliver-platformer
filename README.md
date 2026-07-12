# Oliver's Hero Adventure 🎮

### ▶️ [Play it now!](https://skrieder.github.io/oliver-platformer/)

A simple, friendly platform game made for Oliver. Play right in your browser
at the link above — or download this folder and **double-click `index.html`**.

## How to play
- **Arrow keys** (or WASD) to run, **Up / Space** to jump
- On a tablet: big touch buttons appear automatically
- Collect the treats, reach the flag. You can never lose —
  falling in the water just pops you back out!

## The heroes (all original, inspired by favorites)
| Hero | Inspired by | Special |
|------|-------------|---------|
| Rusty the Rescue Pup | rescue-puppy shows | Well-rounded and brave |
| Webby the Spider Kid | friendly spider heroes | **Double jump** (press jump again in the air!) |
| Art the Apprentice | young-wizard tales | Highest jump, holds his sword up |

## Changing the game (the fun part!)
Almost everything lives in **`config.js`**:

- **Heroes** — names, colors, speed, jump power, double-jump, what they collect.
  Copy a block to add a new hero.
- **Levels** — drawn with letters, one letter per block:
  `#` ground · `=` platform · `o` treat · `!` powerup ⚡ · `^` spring ·
  `T` friendly turtle · `F` flag · `P` start. Add more rows of text = new level!
- **Powerups** — grab a ⚡ to run faster and jump higher for a while
  (rainbow glow!). While powered up, treats become **SUPER DIAMONDS** 💎.
  Tune it all in `POWERUP` (duration, speed boost, jump boost).
- **Game feel** — `FEEL.gravity` lower = floatier, `coyoteTime` higher = more forgiving jumps.

Edit, save, refresh the browser. That's it.

`game.js` is the engine (drawing + physics) — only needs changing for new
kinds of things (new hero *shapes*, new block types, enemies, etc.).

## Ideas for when Oliver asks
- "Make Rusty faster!" → bump `speed` in config.js
- "I want a pink puppy!" → change `colors.body`
- "More levels!" → copy a level block and redraw the map
- "A flying level / snow level!" → change the `sky` colors and map
