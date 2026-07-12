// ============================================================
//  OLIVER'S HERO ADVENTURE — CONFIG
//  This is the fun file to change! Heroes, levels, and game
//  feel all live here. Edit and refresh the browser.
// ============================================================

// ---------- HEROES ----------
// Each hero is original but inspired by things Oliver loves.
// To add a hero: copy one of these blocks, change the values,
// and add a matching drawing style ("puppy", "spider", "wizard")
// or reuse an existing style with new colors.
const HEROES = [
  {
    id: "rusty",
    name: "Rusty the Rescue Pup",
    tagline: "A brave puppy on a rescue mission!",
    style: "puppy",            // which drawing to use
    colors: {
      body: "#c98a4b",         // fur
      belly: "#f3d9b1",
      accent: "#e3350d",       // hero collar
      badge: "#ffd700",
    },
    speed: 4.2,                // how fast he runs
    jumpPower: 13.5,           // how high he jumps
    doubleJump: false,
    collectible: "bone",       // what he collects
    collectibleName: "bones",
  },
  {
    id: "webby",
    name: "Webby the Spider Kid",
    tagline: "Jumps twice — like a web swing!",
    style: "spider",
    colors: {
      body: "#d62828",         // suit
      belly: "#1d3557",        // blue parts
      accent: "#f1faee",       // web lines / eyes
      badge: "#111111",
    },
    speed: 4.6,
    jumpPower: 12.5,
    doubleJump: true,          // press jump again in the air!
    collectible: "star",
    collectibleName: "stars",
  },
  {
    id: "zoom",
    name: "Zoom the Hedgehog",
    tagline: "The fastest hero ever — zoom zoom!",
    style: "hedgehog",
    colors: {
      body: "#2563eb",         // blue spikes
      belly: "#f6d7b0",        // tan tummy & face
      accent: "#e3350d",       // speedy red shoes
      badge: "#ffffff",
    },
    speed: 5.4,                // fastest in the game!
    jumpPower: 12.5,
    doubleJump: false,
    collectible: "hedgehog",   // collects tiny hedgehog friends!
    collectibleName: "hedgehogs",
  },
  {
    id: "arthur",
    name: "Art the Apprentice",
    tagline: "A young wizard with a magic sword!",
    style: "wizard",
    colors: {
      body: "#4361ee",         // robe
      belly: "#ffe066",        // stars on robe
      accent: "#7b2cbf",       // hat
      badge: "#c0c0c0",        // sword
    },
    speed: 4.0,
    jumpPower: 15,             // biggest jump of all!
    doubleJump: false,
    collectible: "gem",
    collectibleName: "gems",
  },
];

// ---------- GAME FEEL ----------
// Make the game easier or harder here.
const FEEL = {
  gravity: 0.55,          // lower = floatier jumps
  coyoteTime: 10,         // frames you can still jump after walking off a ledge (generous!)
  respawnFlash: 60,       // frames of sparkle after respawning
};

// ---------- POWERUP ----------
// Grab a ⚡ in a level and you play BETTER for a little while:
// run faster, jump higher, and glow with rainbow sparkles!
// While powered up, treats turn into SUPER DIAMONDS 💎 — extra special!
const POWERUP = {
  duration: 600,          // how long it lasts, in frames (60 = 1 second)
  speedBoost: 1.5,        // 1.5 = 50% faster running
  jumpBoost: 1.15,        // 1.15 = 15% higher jumps
};

// ---------- LEVELS ----------
// Levels are drawn with letters! Each letter is one block:
//   #  = grass block          =  = floating platform
//   o  = collectible          F  = flag (the goal!)
//   P  = where the hero starts
//   !  = powerup ⚡ (run faster + jump higher for a while!)
//   ^  = super spring (bounces you high)
//   T  = friendly turtle (bounce on top, he doesn't mind)
//   (space) = air              (gaps in the floor = water you respawn from, no harm!)
//
// To make a level easier: add more blocks. Longer: add more columns.
// To add a level: add another block of text to this list.
const LEVELS = [
  {
    name: "Sunny Meadow",
    sky: ["#7ec8ff", "#cdeeff"],
    map: [
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                  o                                         ",
      "                 ===                        o o o           ",
      "         o                    o            =====            ",
      "        ===        o         ===                        F   ",
      "  P     !      o  ===   o           ^                  ===  ",
      "############# ############### ###### ######################",
      "############# ############### ###### ######################",
    ],
  },
  {
    name: "Cloud Hop",
    sky: ["#8ed6ff", "#e8f7ff"],
    map: [
      "                                                                  ",
      "                                                                  ",
      "                 o o                          o                   ",
      "                =====                        ===                  ",
      "        o                   o o        o            o o       F  ",
      "       ===       T         =====      ===          =====     ====",
      "  P                             !                                 ",
      "#########  ########## ############ ######## ######################",
      "#########  ########## ############ ######## ######################",
    ],
  },
  {
    name: "Castle Finish",
    sky: ["#ffb45e", "#ffe3b3"],
    map: [
      "                                                                      ",
      "                                                            o         ",
      "                    o                 o o                  ===        ",
      "                   ===               =====                            ",
      "          o                  o                   o o o          F     ",
      "         ===        T       ===       ^         ======         ====   ",
      "  P              o                 !                                  ",
      "##########  ########### ########  ######## ###########################",
      "##########  ########### ########  ######## ###########################",
    ],
  },
];
