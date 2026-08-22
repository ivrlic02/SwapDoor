# Lecture 5: Basic Visual Design Principles

**Course:** Human-Computer Interaction (HCI)
**Instructor:** Mario Čagalj
**Institution:** University of Split
**Source material acknowledgment:** Based primarily on *"The Non-Designer's Design Book"* by Robin Williams, with extensive examples drawn from *"Design Basics"* by Steven Bradley (vanseodesign.com).
**Original file:** Lecture_5.ppt (53 slides)

---

## Purpose of this document

This is a structured, text-complete rendering of a lecture on the CRAP principles of visual design (Contrast, Repetition, Alignment, Proximity), converted from a PowerPoint deck so its content, structure, and argument flow are fully machine-readable. The original deck is heavily example/image-driven (a running business-card redesign and a running webpage redesign, both shown in progressive "before/after" steps); this document preserves the *conceptual content and design rationale* behind each example even where the specific visual cannot be reproduced as an image, since the pedagogical content (what changed and why it matters) is captured in the accompanying text on each slide.

---

## 1. What is visual design?

**Definition:** Visual design means organizing the *appearance* of something. It applies broadly, to essentially anything with a visual form, including:
- Web page design
- Displaying information (charts, graphs, reports)
- Maps, brochures, birthday cards
- Code formatting
- Smartphone application interfaces
- (and more)

### Visual appearance matters — even in code

The lecture makes this point concretely using **two side-by-side code examples** (a Python AES-CBC encryption snippet, and a JavaScript/React `LoginForm` component) to argue that even something as ostensibly "non-visual" as source code has a visual design dimension — formatting, indentation, and layout affect how easily a reader can parse and understand it. This sets up the broader claim that **visual design principles are universal**, not limited to graphic design in the traditional sense.

---

## 2. The four basic visual design principles: CRAP

**Core claim:** Excellent visual design does require some artistic ability, but **a reasonably good design can be achieved by following a small set of basic principles** — no artistic talent required to get most of the benefit.

**The four principles**, memorable via the acronym **CRAP**:
1. **C**ontrast
2. **R**epetition
3. **A**lignment
4. **P**roximity

### Quick definitions of all four (overview slide)

- **Contrast** — make different things different; brings out dominant elements and mutes lesser ones.
- **Repetition** — repeat design elements throughout the interface; creates consistency and unity.
- **Alignment** — visually connects elements; creates a visual flow.
- **Proximity** — groups related elements together and separates unrelated ones.

The lecture then treats each of the four principles in depth, each introduced via its own dedicated section citing both Robin Williams's *The Non-Designer's Design Book* and Steven Bradley's *Design Basics*.

---

## 3. Alignment

### 3.1 Core principle

- **Nothing should be placed on a page/screen arbitrarily.**
- **Every item should have a visual connection with something else on the page.**
- Straight lines give a more organized appearance.
- Aligned items form a stronger, more cohesive visual unit.
- **Key insight:** even when aligned elements are physically separated from one another on the page, there is an *invisible line* connecting them — both perceptually (in the eye) and cognitively (in the mind) — that ties them together as related.

### 3.2 Practical guidance

- **As a general rule, left- and right-alignment work best, particularly for paragraphs of text.**
- **Center alignment is generally poor for paragraphs of text**, but *can* work well for non-text elements (e.g., logos, single short lines, graphics).

### 3.3 Worked examples (progressive before/after redesign)

The lecture uses a running example (credited throughout to Steven Bradley, vanseodesign.com) showing a table/webpage layout progressively improved through several "before → after" alignment fixes. The specific visual changes are shown in the original images, but the pedagogical throughline is: elements that started out inconsistently positioned are pulled onto shared vertical/horizontal alignment lines, producing a visually "snapped together" layout perceived as more organized and professional.

A second running example is a **business card redesign**, used to demonstrate that even scattered pieces of text (name, title, contact info) can be perceived as connected once they share an alignment line — captioned explicitly: *"The invisible line connects the separate pieces of text."*

**General guidance reinforced across multiple slides:** *"Find a strong alignment and stick to it"* — shown via additional before/after pairs.

### 3.4 Summary of alignment

- Nothing should be placed arbitrarily; every element should have a visual connection with another element on the page.
- **Unity:** to make all elements on a page appear unified, connected, and interrelated, there must be some visual tie between them — even physically distant elements can appear connected/related to other information through shared alignment.
- **How to achieve it:** always find something else on the page to align with, even if the objects in question are physically far apart from each other.

---

## 4. Repetition

### 4.1 Core principle

- **Visual elements that share the same purpose or level of importance should look the same.**
- Repeat some aspect of the design consistently throughout the piece.
- **Risk of not doing this:** with too many different-looking elements on a page, the page will not read as cohesive — it won't look like everything belongs together on the same page/site.
- **What can serve as the repeated element:** essentially anything visually recognizable — a font, a thick line, a color, a design element, etc. — anything a reader will visually register as recurring.

### 4.2 Worked examples (continuing the same running redesign)

Building on the alignment-improved version of the earlier webpage example, the lecture demonstrates further changes specifically aimed at repetition:
- Introducing **a new font in the logo**.
- **Centrally aligning header components** (a layout tweak).
- **Adding a defined brand color.**
- The key repetition move: **taking the color and font established in the logo and repeating them throughout the rest of the page**, so the whole page reads as visually unified/branded rather than as disconnected sections.

**Business card example (repetition-focused):** The lecture poses a perceptual test — *"When you get to the end of the information, does your eye wander off the card?"* — then shows a version with **two bold phrases**, asking whether the reader's eye now "bounces back and forth" between the bold elements. This bouncing/anchoring effect is presented as the actual mechanism by which repetition **ties a card together and provides unity**.

### 4.3 Summary of repetition

- Repetition of visual elements throughout a design **unifies and strengthens** the overall piece.
- Repetition **ties together otherwise separate parts**.
- **Purpose:** to unify the design and to add visual interest.
- **How to achieve it:** think of repetition as being consistent — this explicitly connects back to the **"Consistency"** usability heuristic covered in Lecture 4 (Nielsen's heuristic #2), showing the lecture intentionally links visual design principles to prior usability-heuristics content.

---

## 5. Contrast

### 5.1 Core principle

- **Visual elements with a different purpose or level of importance should appear visually different from one another.**
- **More important elements should be more prominent** — e.g., larger size, stronger/bolder color — than less important elements.
- Contrast is described as **one of the most effective ways to create visual interest** in a design.

### 5.2 Worked examples (continuing the same running redesign)

Building further on the repetition-improved webpage example, the lecture walks through several additional before/after contrast improvements (again credited to Steven Bradley), demonstrating how strengthening the visual distinction between important and less-important elements (e.g., headings vs. body text, primary buttons vs. secondary elements) makes the page's information hierarchy clearer at a glance.

### 5.3 Summary of contrast

- **Contrast draws the eye** — human perception is naturally drawn to areas of contrast on a page ("our eyes like contrast").
- Restated core rule: visual elements with a different purpose or importance level should look different; conversely, **two elements that are not actually the same cannot be made to look similar** without confusing the reader.
- **For contrast to be effective, the two contrasted elements must be very different** from each other — subtle/weak contrast fails to register perceptually.
- **Contrast serves two purposes:**
  1. To create visual interest.
  2. To aid in the **organization of information** — a reader should be able to **instantly** understand how the information on the page is organized, just from the pattern of contrast.

---

## 6. Proximity

### 6.1 Core principle

- **Things that are related should be grouped close together.**
- **Things that are not related should be visually separated.**
- When several items are placed in close proximity to one another, they perceptually merge into **one visual unit** rather than being read as several separate, disconnected units.
- **Benefits:** this helps organize information, reduces visual clutter, and gives the viewer/reader a clear structural sense of the content.

### 6.2 Worked examples

Continuing the running webpage redesign (now contrast-improved), the lecture shows further "before → after" proximity fixes, grouping related content blocks closer together while increasing separation between unrelated blocks — again credited to Steven Bradley's design-basics material.

**"The whole of the CRAP" example:** a further slide explicitly shows the **cumulative effect of applying all four CRAP principles together** to the same running example, demonstrating that they work best in combination rather than in isolation.

**Business card example — "too many separate items" (a detailed three-slide walkthrough):**

1. **First version (poor proximity):** The lecture poses a sequence of perceptual diagnostic questions about a business card with many disconnected text elements:
   - "How many times does your eye stop to look at something?"
   - "Where do you begin reading?"
   - "What do you read next — left to right?"
   - "What happens when you get to the bottom-right corner — where does your eye go?"
   - "Do you wander around making sure you didn't miss any corners?"
   These questions are meant to expose how a poorly grouped layout forces the eye into inefficient, uncertain scanning behavior.

2. **Second version (two bold phrases added, still not fully grouped):** Further diagnostic questions:
   - "Now that there are two bold phrases, where do you begin? Upper left? The center?"
   - "After you read those two items, where do you go? Perhaps you bounce back and forth between the bold words."
   - "Do you know when you're finished [reading]?"
   This illustrates that adding emphasis (contrast/repetition) alone, without fixing grouping, still leaves the reader uncertain about reading order and completion.

3. **Final version (elements properly grouped by proximity):** By grouping similar/related elements into single visual units, **several things instantly happen:**
   - The page/card becomes more organized.
   - The reader understands where to begin reading, and when they are finished.
   - The **white space** (the empty space around letters/elements) itself becomes more organized and purposeful, rather than scattered and arbitrary.

### 6.3 Summary of proximity

- When several items are placed in close proximity, they become **one visual unit** rather than multiple separate units.
- Items that relate to each other should be grouped together.
- **Basic purpose of proximity:** to organize content — properly grouped content is **more likely to actually be read**.
- **How to achieve it (practical technique given):**
  1. Count the number of distinct visual elements/units on the page by counting the number of times your eye "stops" as you scan it.
  2. If that count is higher than some reasonable number, identify which elements can be grouped closer together to merge into fewer, larger visual units.

---

## Key terms and concepts glossary (for quick reference / retrieval)

- **Visual design:** The organization of the appearance of something — applies to web pages, information displays, print materials, code formatting, app interfaces, and more.
- **CRAP principles:** A mnemonic for the four basic visual design principles — **C**ontrast, **R**epetition, **A**lignment, **P**roximity — presented as sufficient for achieving reasonably good design without requiring strong artistic skill.
- **Alignment:** The principle that no element should be placed arbitrarily; every element should share a visual connection (an alignment line) with another element, creating perceived unity even across physical distance. Left/right alignment is generally preferred for text; center alignment is generally poor for paragraphs but can suit non-text elements.
- **Repetition:** The principle that elements sharing the same purpose/importance should look alike, and that some visual element (font, color, line, shape, etc.) should recur throughout a design to create consistency and unity. Explicitly linked to the "Consistency" usability heuristic (Nielsen, Lecture 4).
- **Contrast:** The principle that elements with different purpose/importance should look visually different — with more important elements made more visually prominent — both to create visual interest and to make the information's organizational structure instantly clear to the viewer. For contrast to work, the differing elements must be *strongly* differentiated, not subtly so.
- **Proximity:** The principle that related items should be grouped close together (forming a single perceived visual unit) while unrelated items should be separated, in order to organize content, reduce clutter, and guide the reader's scanning path and sense of completion.
- **Invisible line (alignment concept):** The perceptual/cognitive connection a viewer forms between elements that share an alignment axis, even when those elements are not physically adjacent.
- **Visual unit:** A group of elements that, due to proximity (and/or shared alignment, repetition, or contrast treatment), is perceived by the viewer as a single cohesive group rather than as separate, unrelated pieces.
- **White space:** The empty space surrounding content (letters, elements); well-grouped (good-proximity) layouts organize white space meaningfully rather than leaving it scattered/arbitrary.

## Notes on lecture examples (illustrative, referenced but not exhaustively detailed in source text)
- Python AES-CBC encryption code snippet and a JavaScript/React `LoginForm` component — used to argue that visual formatting matters even in source code.
- A running webpage/table redesign example (attributed throughout to Steven Bradley, vanseodesign.com) progressively improved step-by-step across all four CRAP principles in sequence: alignment → repetition → contrast → proximity, culminating in a "whole of the CRAP" combined view.
- A running business-card redesign example used twice: once for alignment/repetition ("does your eye bounce back and forth"), and again in a three-stage version specifically for proximity ("too many separate items" walkthrough).
- Several additional generic "before/after" example pairs per principle, without further distinguishing textual detail beyond the images themselves.

---

*End of Lecture 5 content. This document was generated by extracting and restructuring all text content from the original 53-slide PowerPoint deck. The deck relies heavily on paired before/after images with brief captions; where slide text consisted only of a caption or attribution without further elaboration, that has been folded into the relevant example description above rather than repeated as a standalone entry.*
