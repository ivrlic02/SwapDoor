# Lecture 3: Psychology of Everyday Actions

**Course:** Human-Computer Interaction (HCI)
**Instructor:** Mario Čagalj
**Institution:** University of Split
**Source material acknowledgment:** Based on slides by Saul Greenberg, Russell Beale, and others; also draws on *Laws of UX* by Jon Yablonski, "Visualizing Fitts' Law" by Kevin Hale (http://particletree.com/features/visualizing-fittss-law), and Don Norman's model of action.
**Original file:** Lecture_3.ppt (44 slides)

---

## Purpose of this document

This is a structured, text-complete rendering of a lecture covering low-level predictive models of human performance (Fitts' law, Hick's law) and a high-level explanatory model of human action (Norman's seven stages of action), converted from a PowerPoint deck so its content, structure, and argument flow are fully machine-readable. Decorative/illustrative screenshots (UI examples from Windows 10, VS Code, forms, etc.) are described conceptually where they carry meaning.

---

## 1. High-level vs. low-level models of HCI (framing for the lecture)

HCI theories must both **explain** and **predict** human behavior within human-computer systems, and must generalize across a wide variety of task situations. The lecture distinguishes two kinds of theory:

**Low-level theories** — used to predict human *performance* on specific, well-defined tasks:
- **Fitts' law** — predicts the time to select a target with a pointing device. *(Covered in this lecture.)*
- **Hick's law** — explains/predicts how the number of choices affects decision time, and how to make choices easier for users. *(Covered in this lecture.)*
- **Keystroke-level model (KLM)** — sums up the time costs of keystroking, pointing, homing, drawing, thinking, and waiting to predict total task time. *(Mentioned, not covered in depth in this lecture.)*

**General (high-level) models** — explain human behavior with machines more broadly:
- **Norman's seven stages of action** *(covered in this lecture)*.
- More broadly: "all of psychology" — i.e., high-level models draw on the full breadth of psychological theory, not just narrow performance formulas.

An additional recommended resource cited for low-level theories: ***Laws of UX*** by Jon Yablonski.

---

## 2. Low-level theory: Fitts' Law

**Primary source cited:** "Visualizing Fitts' Law" by Kevin Hale — http://particletree.com/features/visualizing-fittss-law

### 2.1 Core concept
Fitts' Law models the relationship between the **time it takes to point at/select an on-screen (or physical) target**, the **size of the target**, and the **distance to the target**. The lecture frames it visually/intuitively as "Fitts's Law is made of lines" — i.e., pointing/selection is conceptualized geometrically, and design choices about target shape and boundary matter concretely.

### 2.2 Key visual/practical lessons drawn from Fitts' Law

- **Selection difficulty is affected by whether a target's usable area depends on cursor position.** Rectangular target areas can behave differently from circular ones — with circular targets, the effective "reachability" is not dependent on the cursor's approach position in the same way rectangular ones can be.
- **Physical (finger) pointing vs. virtual (mouse) pointing differ.** Citing Graham and MacKenzie (1996): *"The difference is only in the second movement phase, where visual control of deceleration in the virtual task took more time than in the physical task."* Practical implication: **links and buttons on a screen are harder to point at precisely with a mouse than a finger would be** (relevant to touchscreen vs. desktop design).
- **Corners are the easiest targets to reach.** This is because screen corners have effectively "infinite" size in two dimensions — the cursor cannot overshoot past the edge of the screen, so aiming precision requirements are relaxed. This is referred to (implicitly, and explicitly in a later slide) as the **"Rule of Infinite Edges."**
- **The Rule of Infinite Edges applies differently depending on application type:**
  - **Web applications do NOT benefit from infinite edges**, because they run inside a browser window (the browser chrome, not the OS screen edge, bounds the app).
  - **Kiosk applications CAN benefit**, since a kiosk app typically runs full-screen with no surrounding window chrome, so its edges coincide with the actual screen edges.

### 2.3 Fitts' law: lessons for user interface design

- **Usability increases along a logarithmic curve as target size increases.** Concretely: a very small button becomes *significantly* easier to click when enlarged by, say, 20%, but a button that is *already large* gets little to no benefit from the same proportional increase. (This is the core diminishing-returns insight of Fitts' Law applied to UI sizing.)

### 2.4 Real-world examples discussed

- **fesb.hr** (the instructor's own faculty website) used as a live example of Fitts' Law considerations in an actual interface.
- **A "1px" problem** — referenced humorously multiple times ("Ah, that 1px") as an example of a UI element whose clickable/target area is frustratingly thin, violating good Fitts'-law sizing.
- **Windows 10 taskbar** — cited as an example that benefits from lying in a corner/edge, thus gaining the "infinite dimensions" advantage (quoted informally as "I lay in a corner benefiting infinite dimensions" / "Me too" — a lighthearted framing of multiple UI elements exploiting screen edges).
- **Visual Studio Code (VS Code) editor:**
  - Its **Activity Bar** lies along the screen/window edge, effectively giving it "infinite width" for easy targeting — contrasted with **Inkscape**, whose equivalent UI element apparently does not enjoy this same edge placement.
  - Its **Minimap (outline view)** is large and therefore easy to point to, contrasted with a regular (thin) scrollbar, which is harder to target precisely — another "that 1px" style problem.
- **Checkboxes** — Fitts' Law applied to checkbox/toggle form design, referencing an external resource: "UX Design: Checkbox and Toggle in Forms."

### 2.5 Concluding guidance on Fitts' Law

The lecture explicitly cautions: **don't use Fitts' law as a strict formula — use it as a design guideline.** Practical takeaways:
- Both the **size of the target** and the **distance to the target** matter.
- **Do not** increase the size of already-large targets just because there happens to be empty layout space.
- **Do** increase the size of tiny targets (e.g., links, checkboxes).
- **Exploit the infinite-edge rule** wherever architecturally possible (e.g., in kiosk or full-window native apps).
- **Exploit the "prime pixel"** — i.e., the current location of the user's pointer — meaning: consider what's already near the cursor when placing follow-up targets/actions.
- **Make top-priority targets larger** — explicitly named examples: Sign-up, Buy, Download buttons.

---

## 3. Low-level theory: Hick's Law (Hick–Hyman Law)

Referenced design-principle framing: "Hick's Law — quick decision making."

### 3.1 Core concept

Hick's Law applies to **any situation where a user must make a decision while facing multiple options**. The central claim: **reducing the number of perceived options on screen makes an interface more user-friendly** (i.e., decision time increases with the number/complexity of choices).

### 3.2 Design techniques motivated by Hick's Law

- **Progressive disclosure** — e.g., wizards that reveal only the next relevant step/choice rather than showing everything at once.
- **Grouping items/options** — e.g., 20 flat options force a lot of sequential cognitive comparison and slow decision-making; but restructuring those same 20 options into **4 groups of 5 items** breaks the decision into two easier sequential choices (first pick a group of 4, then pick an item of 5), which is cognitively lighter even though the total option count is unchanged.
- **Explicit tension noted:** there is a trade-off between the **visibility principle** (from Lecture 2 — show users their options/state clearly) and **Hick's Law** (hide/reduce visible options to speed decisions). Good design must balance these two competing principles rather than blindly maximizing either.

### 3.3 Supporting research: the "jam study"

Cited study: **Iyengar and Lepper (2000)**, *"When Choice Is Demotivating: Can One Desire Too Much of a Good Thing?"* — conducted by researchers at Columbia and Stanford, using both field and lab experiments.

**Findings:**
- People were **more likely to actually purchase** jams, chocolates, or to undertake an optional class essay assignment when offered a **limited array of 6 choices**, compared to a larger array of **24 or 30 choices**.
- Participants who chose from the **smaller** option set reported **greater subsequent satisfaction** with their selections, and (in the essay condition) **wrote better essays**, than those who chose from the larger option set.

*(This is the classic "paradox of choice" / "choice overload" finding, used here as empirical support for Hick's Law-style interface simplification.)*

### 3.4 Practical exercises referenced

- "How many options at a first glance?" — a visual exercise prompting students to judge option-counting difficulty directly from example UI screenshots.
- "Do you see the problem here? Try to fix it." — a critique/design exercise based on an (unspecified in extracted text) example interface, presumably one with excessive/poorly organized choices.

### 3.5 Concluding guidance on Hick's Law

- Hick's Law essentially states: **"less is more."**
- This is particularly relevant when a user must make a **critical decision** (e.g., whether or not to purchase something).
- **Important limitation:** Hick's Law does **not** apply to complex decision-making that inherently requires reading, researching, or deliberation — it's specifically about quick/simple choice scenarios, not deep evaluative tasks.

---

## 4. High-level model: Norman's Seven Stages of Action

### 4.1 The basic action cycle (Don Norman)

To get something done, a person:
1. Starts with some notion of **what is wanted** — the **goal** to be achieved.
2. Does something to the world — takes **action** to move themselves or manipulate someone/something (**execution**).
3. Finally, checks whether the goal was actually achieved (**evaluation**).

This forms **Norman's action cycle**: **Goals → Execution → (interaction with) The World → Evaluation**, where evaluation compares what actually happened against what was wanted, feeding back into (new) goals.

### 4.2 Stages of Execution (expanded)

Illustrative running example used throughout this section: *"I am reading a book and decide I need more light."*

Execution breaks down into three sub-stages:
1. **Plan the action** — e.g., decide to turn on the nearby light.
2. **Specify an action sequence** — e.g., decide whether to ask somebody else to do it, or do it yourself.
3. **Perform the action sequence** — the actual physical execution of the plan.

Important point: the **same goal** (get more light) could be satisfied through entirely different plans/action sequences — e.g., opening the curtains, or moving closer to a window — illustrating that execution planning is not uniquely determined by the goal.

### 4.3 Stages of Evaluation (expanded)

Evaluation ("checking up on what happened") breaks down into three sub-stages:
1. **Perceive** what happened in the world.
2. **Interpret** that perception.
3. **Compare** the outcome with the original goal.

Continuing the "more light" example, evaluation involves:
- Perceiving whether there is now more light in the room.
- Deciding (interpreting) whether the lamp actually turned on.
- Deciding (comparing) whether the resulting amount of light is sufficient relative to the goal.

### 4.4 The full seven stages of action

Combining goal formation (1 stage), execution (3 stages), and evaluation (3 stages) yields **seven total stages**:

1. **Goal** — form the goal.
2. **Plan** — plan the action.
3. **Specify** — specify an action sequence.
4. **Perform** — perform the action sequence.
5. **Perceive** — perceive the state of the world.
6. **Interpret** — interpret the perception.
7. **Compare** — compare the outcome with the goal.

This maps onto the earlier 1/3/3 structure: **1 stage for goals, 3 for execution, 3 for evaluation.**

### 4.5 The two gulfs

The seven-stages model reveals that whenever people use something, they face **two gulfs**:

- **The Gulf of Execution** — the difficulty a user has figuring out **how to operate** something (i.e., bridging from goal/plan down to actually performing the correct action sequence).
- **The Gulf of Evaluation** — the difficulty a user has figuring out **what happened** as a result of their action (i.e., bridging from the world's raw state back up to understanding whether their goal was met).

**The designer's core role is to help users bridge these two gulfs.**

This is illustrated with paired user-facing questions on each side of the cycle:
- Gulf of Execution side: *"How do I work this?"* / *"What can I do?"*
- Gulf of Evaluation side: *"What happened?"* / *"Is this what I wanted?"*

### 4.6 Using the seven stages as design-evaluation questions

The lecture reframes the seven stages as **seven questions any product's user should be able to answer**:

1. **What do I want to accomplish?** (goal)
2. **What are the alternative action sequences?** (plan)
3. **What action can I do now?** (specify)
4. **How do I do it?** (perform)
5. **What happened?** (perceive)
6. **What does it mean?** (interpret)
7. **Is it okay? Have I accomplished my goal?** (compare)

If a product's design makes any of these seven questions hard to answer, that pinpoints exactly where (and in which gulf) the design has failed the user.

### 4.7 Connecting the seven stages to concrete design principles (from Lecture 2)

The lecture explicitly ties the two gulfs back to the design principles covered in Lecture 2:

- **Information that helps answer the *execution*-side questions is called feedforward.** Feedforward is accomplished through:
  - Signifiers
  - Constraints
  - Mappings
  - Mental models
- **Information that helps a user understand what has happened (the *evaluation*-side questions) is feedback.** Feedback is accomplished through:
  - Feedback (direct system responses)
  - Mental models

*(Note: mental models are listed as contributing to both sides — they help users both predict outcomes before acting and interpret outcomes after acting.)*

---

## 5. Lecture conclusion — "You know now"

Summary of what the lecture equips the student with:
- **Fitts' law:** how to size and where to place buttons and links for optimal target acquisition.
- **Hick's law:** how to help users make choices more easily by managing the number/structure of options.
- **Norman's stages of human interaction:** a framework for identifying interaction problems in terms of the **Gulf of Execution** and the **Gulf of Evaluation**.
- Overall: reinforces the **basic principles of good design** introduced previously (visibility, feedback, constraints, mapping, consistency, affordances/signifiers, mental models — from Lecture 2), now grounded in concrete psychological/performance theory.

---

## Key terms and concepts glossary (for quick reference / retrieval)

- **Fitts' Law:** A low-level predictive model stating that the time required to point at/select a target is a function of the target's size and the distance to it (smaller/farther targets take longer to hit); usability gains from increasing target size follow a logarithmic (diminishing-returns) curve.
- **Rule of Infinite Edges:** The principle that targets placed at a screen/window edge or corner are effectively unlimited in size in that direction (since the cursor cannot overshoot past the boundary), making them easier to acquire; applies to kiosk/full-screen apps but not to windowed web apps.
- **Prime pixel:** The current location of the user's pointer/cursor — a reference point designers can exploit when placing the next likely target.
- **Hick's Law (Hick–Hyman Law):** A low-level model stating that decision time increases with the number and complexity of choices presented; "less is more" for quick-decision interfaces, though it does not apply to inherently complex/research-requiring decisions.
- **Progressive disclosure:** A design technique (motivated by Hick's Law) of revealing only the next relevant options/steps rather than showing everything at once (e.g., multi-step wizards).
- **Choice overload / "paradox of choice":** The empirical phenomenon (per Iyengar & Lepper 2000) that too many options can reduce both the likelihood of choosing and satisfaction with the choice made, relative to a smaller, curated option set.
- **Norman's action cycle:** A high-level model of human action consisting of Goals → Execution → interaction with the World → Evaluation (comparing outcome to goal).
- **Seven stages of action:** Goal, Plan, Specify, Perform, Perceive, Interpret, Compare — Norman's fine-grained breakdown of the action cycle (1 goal stage + 3 execution stages + 3 evaluation stages).
- **Gulf of Execution:** The user's difficulty in figuring out how to operate a system to achieve their goal (bridging goal/plan to actual performed action).
- **Gulf of Evaluation:** The user's difficulty in figuring out what happened as a result of their action, relative to their goal (bridging the world's state back to understanding/comparison).
- **Feedforward:** Information that helps a user answer execution-side questions (how do I do this?) *before* acting — realized through signifiers, constraints, mappings, and mental models.
- **Feedback:** Information that helps a user answer evaluation-side questions (what happened?) *after* acting — realized through direct feedback and mental models.
- **Keystroke-Level Model (KLM):** A low-level model (mentioned, not detailed) that sums time estimates for keystroking, pointing, homing, drawing, thinking, and waiting to predict total task completion time.

## Notes on lecture examples (illustrative, referenced but not exhaustively detailed in source text)
- Fitts' law visualizations from Kevin Hale's "Visualizing Fitts' Law" article.
- Comparison of rectangular vs. circular target hit-areas.
- Physical finger-pointing vs. mouse-pointing precision (Graham & MacKenzie, 1996).
- Corner/edge targets: Windows 10 taskbar, VS Code Activity Bar vs. Inkscape, VS Code Minimap vs. regular scrollbar.
- fesb.hr website as a live Fitts'-law example.
- Checkbox/toggle form design and Fitts' Law.
- "How many options at a first glance?" and "fix the problem" visual exercises for Hick's Law.
- The "jam study" (Iyengar & Lepper, 2000) on choice overload in purchasing and essay-writing contexts.
- The "reading a book, need more light" running example illustrating Norman's action cycle stage by stage.

---

*End of Lecture 3 content. This document was generated by extracting and restructuring all text content from the original 44-slide PowerPoint deck. Recurring diagram slides (e.g., repeated renderings of the action-cycle diagram as it is progressively built up) have been consolidated into the section descriptions above rather than repeated verbatim at each occurrence in the source deck.*
