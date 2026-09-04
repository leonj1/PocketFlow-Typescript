---
name: PocketFlow Rooms
description: A research-laboratory workspace for ordered, signal-seeking agent conversations.
colors:
  paper: "#edf3f2"
  paper-bright: "#f8fbfa"
  paper-blue: "#e3ebed"
  ink: "#13262d"
  ink-soft: "#52656a"
  rule: "#bdcbce"
  rule-strong: "#8ba0a5"
  cobalt: "#174fc9"
  cobalt-dark: "#103b95"
  cobalt-soft: "#dbe6ff"
  amber: "#d87818"
  amber-soft: "#ffebcc"
  red: "#a83232"
  green: "#1f785d"
typography:
  display:
    fontFamily: "Archivo Variable, Arial Narrow, sans-serif"
    fontSize: "clamp(34px, 5vw, 64px)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Archivo Variable, Arial Narrow, sans-serif"
    fontSize: "clamp(34px, 4vw, 58px)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Archivo Variable, Arial Narrow, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Archivo Variable, Arial Narrow, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.68
  label:
    fontFamily: "Archivo Variable, Arial Narrow, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    letterSpacing: "0.06em"
rounded:
  square: "0"
  round: "50%"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "#ffffff"
    rounded: "{rounded.square}"
    padding: "0 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-dark}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0 18px"
    height: "44px"
  field:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "12px 13px"
    height: "45px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    size: "34px"
  icon-button-strong:
    backgroundColor: "{colors.cobalt}"
    textColor: "#ffffff"
    rounded: "{rounded.square}"
    size: "34px"
---

# Design System: PocketFlow Rooms

## Overview

**Creative North Star: "The Observation Bench"**

PocketFlow Rooms treats a multi-agent conversation as a research-laboratory observation ledger. Pale mineral surfaces, carbon ink, cobalt instruments, amber assay states, ruled registers, and numbered specimen rails make sequential evaluation tangible without imitating a conventional messenger.

The system is dense, calm, and operational. Information is separated by tonal fields and hairline rules; square controls feel like instruments; color appears only when it communicates control, identity, progress, or outcome. The transcript remains the dominant reading surface while surrounding panes expose room history and evaluation order.

**Key Characteristics:**

- Pale mineral surfaces organized as ruled registers.
- Carbon text with restrained cobalt controls and agent markers.
- Amber activity, green success, and red failure states used semantically.
- Square controls and containers paired with circular sequence markers.
- Compact uppercase metadata supporting larger editorial headings.

## Colors

The palette combines cool laboratory papers with near-black blue-green ink, a decisive cobalt control color, and sparing assay-state accents.

### Primary

- **Instrument Cobalt** (`colors.cobalt`): Primary actions, strong icon controls, active navigation details, agent-origin markers, and selected mobile tabs.
- **Deep Instrument Cobalt** (`colors.cobalt-dark`): Hover state for cobalt actions.
- **Washed Cobalt** (`colors.cobalt-soft`): Focus halo around editable fields.

### Secondary

- **Assay Amber** (`colors.amber`): Global keyboard focus, running evaluation markers, the header rule, and exceptional attention states.
- **Dilute Amber** (`colors.amber-soft`): Text-selection background.

### Tertiary

- **Verified Green** (`colors.green`): Responded evaluations and connected status.
- **Failure Red** (`colors.red`): Failed evaluations, errors, and destructive controls.

### Neutral

- **Mineral Paper** (`colors.paper`): App-level background.
- **Bright Ledger** (`colors.paper-bright`): Transcript, register, active row, and field surfaces.
- **Blue Laboratory Paper** (`colors.paper-blue`): Supporting panes and mobile pane navigation.
- **Carbon Ink** (`colors.ink`): Primary text and the dark application header.
- **Soft Carbon** (`colors.ink-soft`): Supporting copy, metadata, placeholders, and inactive states.
- **Hairline Rule** (`colors.rule`): Routine dividers and pane boundaries.
- **Structural Rule** (`colors.rule-strong`): Input strokes, specimen outlines, and stronger separations.

### Named Rules

**The Instrument-and-Assay Rule.** Cobalt identifies controls and agent-origin cues; amber is reserved for focus and work actively under evaluation.

**The Tonal Ledger Rule.** Separate regions with the three paper tones and hairline rules before introducing shadow.

## Typography

**Display Font:** Archivo Variable (with Arial Narrow and sans-serif fallbacks)
**Body Font:** Archivo Variable (with Arial Narrow and sans-serif fallbacks)
**Label/Mono Font:** Archivo Variable; model identifiers deliberately remain in the same family

**Character:** A single variable grotesk keeps the workspace clinical and coherent. Large, tightly tracked headings provide editorial confidence, while compact uppercase labels and tabular numerals make controls and evaluation records easy to scan.

### Hierarchy

- **Display** (700, `typography.display`): The lobby proposition, with the tightest line height and tracking.
- **Headline** (700, `typography.headline`): Agent-management page title and other major operational headings.
- **Title** (700, `typography.title`): Room titles and section headings.
- **Body** (400, `typography.body`): Transcript content and explanatory copy; transcript lines stop at 72 characters.
- **Label** (650, `typography.label`, uppercase where used): Field labels, message metadata, status text, pane counts, and action captions.

### Named Rules

**The One-Instrument Typeface Rule.** Use Archivo across prose, controls, labels, models, and numerals; hierarchy comes from scale, tracking, weight, and case rather than a decorative pairing.

**The Metadata Compression Rule.** Uppercase labels are compact and tracked, never used for transcript prose or long descriptions.

## Layout

The primary workspace is a fixed-height observation bench beneath a 74px header. At full width it uses three columns: a 220–268px room index, a flexible transcript no narrower than 420px, and a 280–326px agent rail. The center pane owns the remaining width and keeps its composer anchored below a vertically scrolling transcript. Transcript entries use a 72ch reading measure; the outer gutters expand responsively up to 72px.

At 980px and below, the columns contract to 220px / flexible / 275px and the header drops nonessential brand and key labels. At 760px and below, the header becomes a 118px two-row control block and a 46px, three-option pane switcher exposes one workspace pane at a time. The agent-management split changes from a 44% form panel plus register to one vertically scrolling column. Coarse-pointer controls expand to a minimum 44px target without changing the visual grammar.

**The Dominant Transcript Rule.** On wide screens, preserve the complete three-pane sequence while granting flexible space to the transcript; on narrow screens, show one readable pane rather than compressing all three.

## Elevation & Depth

The system is flat by default. Paper-tone changes, rules, inset fields, and dark rectangular seals establish hierarchy; shadow is limited to a selected room row, the connected-key status glow, and the animated running assay marker.

### Shadow Vocabulary

- **Selected Record** (`0 7px 19px rgba(45, 63, 68, .08)`): Lifts only the active room row from the room index.
- **Connected Signal** (`0 2px 9px rgba(111, 224, 178, .35)`): Soft glow behind the credential-ready indicator.
- **Running Assay** (`0 2px 5px rgba(216, 120, 24, .15)` to `0 5px 18px rgba(216, 120, 24, .5)`): Pulses around the agent currently evaluating.

### Named Rules

**The Flat-Bench Rule.** Surfaces remain flat at rest; use rules and paper tones for structure, reserving shadow for selection or live state.

## Shapes

The form language is rectilinear and instrument-like. Fields, buttons, header marks, seals, records, and panes use square corners (`rounded.square`). Circles (`rounded.round`) belong only to signal lamps, loading dots, and numbered nodes on the evaluation rail. Hairline borders remain visible and functional rather than ornamental.

**The Circle-Means-State Rule.** Circular geometry marks position or live status; general controls and containers stay square.

## Components

Controls are compact laboratory instruments: square, direct, and stateful, with labels that explain function rather than decorate the surface.

### Buttons

- **Shape:** Square corners with a minimum 44px height for text actions; icon actions are 34px square and grow to 44px on coarse pointers.
- **Primary:** Instrument Cobalt with white text, semibold weight, and 18px horizontal padding (`components.button-primary`).
- **Hover / Focus:** Primary actions deepen to Deep Instrument Cobalt; every keyboard-focused control receives the 3px Assay Amber outline with a 3px offset.
- **Secondary:** Transparent Bright Ledger context, Structural Rule border, Carbon Ink text (`components.button-secondary`).
- **Icon:** Transparent at rest with a soft Carbon Ink wash on hover; strong icon actions use Instrument Cobalt, while destructive actions use Failure Red text.

### Cards / Containers

- **Corner Style:** Square throughout.
- **Background:** Bright Ledger for transcripts and registers; Blue Laboratory Paper for supporting panes; a slightly cooler paper distinguishes the composer and roster.
- **Shadow Strategy:** Flat by default; only the selected room record lifts.
- **Border:** Hairline Rule for routine boundaries and Structural Rule for stronger register divisions.
- **Internal Padding:** Compact rows use 10–14px; major register records use 22–28px depending on viewport.

### Inputs / Fields

- **Style:** Bright Ledger fill, 1px Structural Rule stroke, square corners, Carbon Ink text, and Soft Carbon placeholders.
- **Focus:** Border shifts to Instrument Cobalt with a 2px Washed Cobalt halo; the global Assay Amber keyboard outline remains available around the focused control.
- **Error / Disabled:** Errors use Failure Red text and an alert role; disabled actions lose saturation and show a not-allowed cursor.

### Navigation

The dark Carbon Ink header holds full-height text links. Links are muted at rest, white on hover and active, and active links gain a 3px cobalt underline. On narrow screens, the workspace adds a three-part paper tab bar whose selected tab uses Carbon Ink text, semibold weight, and the same 3px cobalt edge.

### Numbered Agent Sequence

Each agent occupies a ruled rail with a 24px circular number node, name, model, uppercase status, and compact reorder/remove controls. Queued rows fade; running nodes turn amber and pulse; responded nodes turn green; passed nodes return to Blue Laboratory Paper; failed nodes turn red. The vertical connector makes evaluation order visible before a run begins.

### Transcript Entries

Messages are ledger entries rather than bubbles: transparent, square, separated by a hairline rule, and capped at 72ch. Agent contributions indent and receive an 8px cobalt specimen marker; user messages retain the main left edge. Metadata is uppercase, tracked, and separated from 15px content with a 1.68 line height.

## Do's and Don'ts

### Do:

- **Do** preserve the three paper tones and ruled boundaries as the primary spatial hierarchy.
- **Do** use cobalt for operable controls, active navigation, and agent-origin markers.
- **Do** reserve amber for keyboard focus and the agent actively under evaluation.
- **Do** keep transcript content readable at no more than 72ch and reveal one pane at a time below 760px.
- **Do** keep status text explicit alongside color and maintain 44px coarse-pointer targets.

### Don't:

- **Don't** turn transcript entries into rounded chat bubbles or floating cards.
- **Don't** add corner rounding to general controls, fields, panes, or register rows.
- **Don't** use shadow as routine decoration; it signals selection, connectivity, or live evaluation.
- **Don't** use circular geometry for general actions or containers.
- **Don't** use color alone to communicate queued, running, passed, responded, or failed states.
