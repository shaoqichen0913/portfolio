# Portfolio

This context defines the language for Shaoqi Chen's personal technical portfolio visual redesign.

## Language

**Engineering Field Notes**:
A visual system for the portfolio, based on the FinTrack lineage HTML draft's paper-toned technical memo style.
_Avoid_: Paper Theme, Technical Blog, Data Engineering Portfolio

**Document Canvas**:
A full-page paper-toned surface where hierarchy comes from spacing, typography, rules, and content modules rather than card containers.
_Avoid_: Card UI, Paper Cards

**Semantic Content Block**:
A bounded content object such as a code block, callout, table, diagram, or figure that may use a subtle border or background because the boundary carries meaning.
_Avoid_: Decorative Card, Section Card

**Light-First Paper**:
The visual mode where warm paper, dark ink, faint rules, and restrained accent colors remain stable regardless of system color preference.
_Avoid_: Automatic Dark Mode

**Engineering Memo Typography**:
A sans-first type system where body text, headings, navigation, and metadata read like a technical memo rather than a serif editorial essay.
_Avoid_: Serif Essay Typography

**Wide Canvas, Readable Prose**:
A layout rule where the page canvas is wide enough for technical artifacts while prose lines stay constrained for reading.
_Avoid_: Narrow Global Container, Full-Width Prose

**Rule-Based Separation**:
A hierarchy pattern where sections and list rows are separated with subtle horizontal rules and spacing instead of cards.
_Avoid_: Card-Based Separation

**Document Chrome**:
Minimal site navigation that belongs to the document surface, using the same width, typography, color tokens, and rule-based separation as the page.
_Avoid_: App Toolbar, Floating Navbar

**Metadata Text**:
Small mono or muted text used for dates, tags, sections, language links, and technical labels without chip-like borders.
_Avoid_: UI Chips, Tag Pills

**Icon Color Trial**:
A visual experiment allowing compact colored technology icons only when they do not overpower the document hierarchy.
_Avoid_: Logo Cloud, Colorful Badge Wall

## Relationships

- **Engineering Field Notes** applies the FinTrack lineage draft's typography, color, spacing, rules, code blocks, tables, and callouts to the portfolio UI.
- **Document Canvas** is the page-level surface for **Engineering Field Notes**.
- **Semantic Content Blocks** may be bordered inside the **Document Canvas**.
- **Light-First Paper** is the color mode for **Engineering Field Notes**.
- **Engineering Memo Typography** is the type system for **Engineering Field Notes**.
- **Wide Canvas, Readable Prose** is the layout rule for **Document Canvas**.
- **Rule-Based Separation** replaces card-based layout hierarchy in **Document Canvas**.
- **Document Chrome** is the navigation treatment for **Document Canvas**.
- **Metadata Text** is the default treatment for tags, dates, tech labels, and section labels.
- **Icon Color Trial** may be used in compact metadata contexts if the page still reads as **Document Canvas** first.

## Example Dialogue

> **Dev:** "Should each section sit inside its own bordered paper card?"
> **Domain expert:** "No — **Document Canvas** means the whole page is the paper surface, and sections are separated by rules and spacing."
> **Dev:** "Can a code block still have a background and border?"
> **Domain expert:** "Yes — a code block is a **Semantic Content Block**, not a decorative card."
> **Dev:** "Should the site switch to a dark palette when the OS is in dark mode?"
> **Domain expert:** "No — **Light-First Paper** keeps the paper-toned visual system stable."
> **Dev:** "Should long pages keep the old serif body text?"
> **Domain expert:** "No — **Engineering Memo Typography** uses sans-first text across the site."
> **Dev:** "Should the global container remain narrow for every page element?"
> **Domain expert:** "No — **Wide Canvas, Readable Prose** lets technical artifacts use a wider canvas while prose stays constrained."
> **Dev:** "If cards go away, how do sections stay visually distinct?"
> **Domain expert:** "**Rule-Based Separation** uses subtle horizontal rules and spacing as the main hierarchy."
> **Dev:** "Should navigation feel like an app toolbar above the document?"
> **Domain expert:** "No — **Document Chrome** makes navigation part of the same paper surface."
> **Dev:** "Should tags remain bordered rounded pills?"
> **Domain expert:** "No — tags are **Metadata Text**, not UI chips."
> **Dev:** "Can technology icons keep their brand colors?"
> **Domain expert:** "Only as an **Icon Color Trial**; if they read as a logo cloud or overpower the document hierarchy, they should be muted."

## Flagged Ambiguities

- "This style" was used to mean visual appearance, content structure, and portfolio positioning — resolved: the canonical concept is **Engineering Field Notes**.
- "Engineering Field Notes" briefly drifted into content strategy — resolved: this session is limited to visual style migration.
- "Paper" could imply card containers — resolved: the site uses **Document Canvas**, not card UI.
- "Bordered surface" could mean either a decorative card or a meaningful content boundary — resolved: only **Semantic Content Blocks** get bounded treatment.
- "Dark mode" was available in the existing UI — resolved: the redesign uses **Light-First Paper** and defers automatic dark mode.
- "Paper style" could imply serif editorial writing — resolved: **Engineering Memo Typography** is sans-first.
- "Wider layout" could imply unreadably long paragraphs — resolved: **Wide Canvas, Readable Prose** separates canvas width from prose width.
- "No cards" could make hierarchy ambiguous — resolved: **Rule-Based Separation** carries section and list structure.
- "Navbar" could imply a separate app-like component — resolved: navigation is **Document Chrome**.
- "Tags" could imply chip components — resolved: tags are **Metadata Text**.
- "Colored icons" may either enrich metadata or break the paper-toned hierarchy — resolved: treat them as an **Icon Color Trial** with visual validation.
