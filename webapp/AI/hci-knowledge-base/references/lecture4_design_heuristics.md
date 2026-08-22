# Lecture 4: Design Heuristics and Heuristic Evaluation

**Course:** Human-Computer Interaction (HCI)
**Instructor:** Mario Čagalj
**Institution:** University of Split
**Source material acknowledgment:** Based on material by Saul Greenberg, Rob Miller, Brent Hecht; heavily grounded in Jakob Nielsen's usability heuristics work (Nielsen Norman Group).
**Original file:** Lecture_4.ppt (67 slides)

---

## Purpose of this document

This is a structured, text-complete rendering of a lecture on Nielsen's 10 usability heuristics and the heuristic evaluation method, converted from a PowerPoint deck so its content, structure, and argument flow are fully machine-readable. Decorative/illustrative screenshots (UI examples, icons, terminal windows, error dialogs, etc.) are described conceptually where they carry meaning; purely decorative repeats are omitted or consolidated.

---

## 1. Introduction to Heuristic Evaluation (first pass)

**What is heuristic evaluation?**
An **informal method of usability inspection** in which a small group of usability specialists judges a user interface.

**Why and how is it done?**
- To identify design problems and avoid common design pitfalls, evaluators first define a set of design principles / usability guidelines (e.g., Nielsen's heuristics).
- Each specialist (evaluator) independently lists the problems they find with respect to these usability principles.
- Each specialist then ranks the problems they found by **severity**.

*(This topic is introduced briefly here and then returned to in full depth at the end of the lecture — see Section 4 below.)*

---

## 2. Where design heuristics fit in the iterative design process

Design heuristics are useful at **two distinct stages** of the design process:
- **Design stage** — heuristics guide the choice between design alternatives.
- **Evaluation stage** — heuristics help identify problems in an already-implemented interface (this is heuristic evaluation specifically).

The lecture situates this within a broader design-process pipeline:
- **Design** phase draws on:
  - Task-centered design
  - Human capabilities — specifically referencing prior-lecture material: **Fitts' law, Hick's law, Norman's stages of action, mental models**
  - Design heuristics
- **Implementation** phase involves prototyping.
- **Evaluation** phase involves heuristic evaluation.

This explicitly ties Lecture 4 back to the low-level and high-level models covered in Lecture 3.

---

## 3. Usability guidelines and heuristics — background

- Design guidelines are grounded in **human psychology**.
- There are many different sets of usability guidelines available; almost every researcher — and major companies including **Apple, Google, and Microsoft** — has their own set of heuristics.
- Importantly, **most of these heuristic sets overlap substantially**. The lecture makes the point that: *experts do not actually disagree about what constitutes a good UI* — rather, **they disagree about how to organize that shared knowledge into a small set of simple, usable rules.**
- **This lecture is based specifically on Jakob Nielsen's 10 heuristics**, originally from: *"Heuristic evaluation of user interfaces"* [Nielsen and Molich, CHI'90], and further developed by the **Nielsen Norman Group (NN/g)**.

---

## 4. Jakob Nielsen's Ten Usability Heuristics (the core framework)

The ten heuristics, listed together first as an overview:

1. Match between system and the real world
2. Consistency and standards
3. Visibility of system status
4. User control and freedom
5. Error prevention
6. Help users recognize, diagnose, and recover from errors
7. Recognition rather than recall
8. Flexibility and efficiency of use
9. Aesthetic and minimalist design
10. Help and documentation

Each is elaborated below with its official definition, elaboration/strategies, and the examples used in the lecture.

---

### #1: Match between system and the real world

**Definition:** The system should speak the users' language, using words, phrases, and concepts familiar to the user rather than system-oriented (technical) terms. Follow real-world conventions, and make information appear in a natural and logical order.

**Key ideas and examples:**
- **Use common words, not "techie" jargon.** The lecture poses a UI screenshot exercise asking what action the user is actually meant to take, illustrating how jargon can obscure intent.
- **Computer science indexing vs. spreadsheet indexing:** contrasted `[0][0]`, `[0][2]` (zero-based, programmer-style coordinates) against Excel's `[A][1]`, `[B][3]` (letter+number, human-friendly convention) — Excel is presented as "speaking the users' language" better than raw programming notation. *(Cited via "Nielsen's Heuristics @coursera.")*
- **"Airplane mode" vs. "Radio off":** used as an example of choosing a real-world, user-comprehensible label ("Airplane mode," evoking a familiar real-world context/rule) over a more technical, literal description ("Radio off").
- **Use of metaphors** — helpful for matching real-world expectations, but the lecture cautions **metaphors can also mislead**. Examples: the trash-can icon (Windows 10) and the shopping-cart icon (Amazon) — both map digital actions onto familiar real-world objects/concepts.
- **Information should appear in a natural and logical order** — illustrated with UI examples (not further detailed in extracted text) showing ordering choices that either do or don't match users' real-world expectations.

---

### #2: Consistency and standards

**Definition:** Users should not have to wonder whether different words, situations, or actions mean the same thing. Follow platform conventions.

**Key ideas:**
- **Principle of least surprise:**
  - Similar things should look and act similar.
  - Different things should look different.
  - Users shouldn't have to wonder whether different words/situations/actions actually mean the same thing — achieved by following platform conventions.
- **Consistent language and graphics:**
  - Same visual appearance maintained across the whole system.
  - Same information/controls placed in the same location across all windows/screens.
- **Consistent effects:** Commands and actions should produce the same effect in equivalent situations.

**Examples discussed:**
- General consistency example (via "Introduction to Heuristics Evaluation @uxdesign.cc").
- **Hamburger menus** — noted as appropriate for websites, but flagged as a **platform-convention mismatch when used in desktop apps** (where users don't expect/associate that pattern as strongly).
- **Flat UI design: buttons vs. labels** — raised as a consistency/standards concern, since flat design can make it visually ambiguous whether an element is an interactive button or a static label, breaking users' ability to rely on consistent visual cues.

---

### #3: Visibility of system status

**Definition:** The system should always keep users informed about what is going on, through appropriate feedback within a reasonable time.

**Key ideas and examples:**
- General example referencing "Introduction to Heuristics Evaluation @uxdesign.cc."
- **Misleading feedback example:** a browser's DevTools "Offline" simulation mode — cited as a case where system status feedback can actually mislead the user about the real state of connectivity.
- **Response time guidance — "Response Times: The 3 Important Limits"** [J. Nielsen, 2014], giving concrete thresholds for how the system should respond depending on delay:
  - **< 0.1 second** — feels instantaneous to the user; no special feedback needed.
  - **0.1–1 second** — user notices a delay, but no special feedback (like a loading indicator) is needed.
  - **1–5 seconds** — display a **busy cursor** to indicate the system is working.
  - **> 1–5 seconds** — display a **progress bar** so the user has visibility into ongoing progress.
- **Comparison example:** a graphical/visual interface example is explicitly contrasted with a **Linux terminal**, presumably to compare how each communicates (or fails to communicate) ongoing system status to the user.

---

### #4: User control and freedom

**Definition:** Users often choose system functions by mistake and need a clearly marked "emergency exit" to leave an unwanted state without having to go through an extended dialogue. Support undo and redo.

**Key ideas:**
- Users don't like feeling trapped by a computer system. Systems should offer an easy way out of as many situations as possible, via **clearly marked exits**.
- **Strategies for supporting user control and freedom:**
  - Cancel button
  - Universal undo
  - Interrupt (especially useful for lengthy operations)
  - Quit (for leaving the program at any time)
  - Defaults (for restoring default properties/settings)

**Examples discussed:**
- **"Wouldn't life be much easier if we could unsend an email?"** — used as a motivating rhetorical example (referenced across two consecutive slides), followed by a real-world resolution: Gmail's "Recall / Undo Send" feature, explicitly cited as an example tutorial ("How to Recall, Undo or Unsend Gmail Email").
- A cited application (unnamed in extracted text, referenced generically as "this application") whose success is attributed **in part to good support for heuristic #4** (user control and freedom).
- **The "Pottery Barn effect"** — coined via the retail phrase *"If you break it, you bought it"* — describes what happens when this heuristic is frequently violated: users become afraid to interact ("What happens if I click this? Can I undo it? Better I don't touch it."), which the lecture explicitly frames as something designers must avoid — **you want to avoid making users feel tense while using your system.** (Illustrated metaphorically with an image of glass items on shelves — fragile, "don't touch" objects.)

---

### #5: Error prevention

**Definition:** Even better than good error messages is careful design that prevents a problem from occurring in the first place. Either eliminate error-prone conditions, or check for them and present users with a confirmation option before they commit to the action.

**Key ideas — types of human error (per Don Norman):**
- **Mistakes:** conscious deliberation leads to an incorrect solution instead of the correct one — occurs when the user's underlying goals are inappropriate, i.e., the user has developed an **incorrect mental model**.
- **Slips:** unconscious/automatic behavior gets misdirected en route to satisfying a goal (classic example given: *"drive to the store, end up at the office"* — an autopilot-style error). Slips show up frequently in **skilled behavior**, usually due to inattention, and often arise from **similar actions** being confused with one another.

**Design-for-errors strategies (each illustrated with examples in the source deck):**
1. **Double-check with users** — confirmation prompts before committing risky actions. (Referenced sources: "Blog by the Mad Hatter," "Nielsen's Heuristics @coursera.")
2. **Remove memory burdens** — reduce reliance on the user remembering information correctly.
3. **Support Undo and Redo** — directly reduces the cost of both slips and mistakes.
4. **Use constraints** — restrict possible actions to prevent invalid/erroneous input (ties back to the "Constraints" principle from Lecture 2).

---

### #6: Help users recognize, diagnose, and recover from errors

**Definition:** Error messages should be expressed in plain language (no error codes), should precisely indicate the actual problem, and should constructively suggest a solution.

**Key idea, repeated across several slides with different examples:** **Deal with errors in a positive manner** — be polite, use human-readable (non-technical) language, be explicit, be constructive, and be precise. Sources cited for the examples used: "Introduction to Heuristics Evaluation @uxdesign.cc," plus a reference to "Help from Dick" (a named example/character in one of the illustrative screenshots). Multiple UI examples (error dialogs, messages) are shown across slides 41–45 illustrating both good and bad practice, without further distinguishing textual detail beyond the guidance above.

---

### #7: Recognition rather than recall

**Definition:** Minimize the user's memory load by making objects, actions, and options visible. Users should not have to remember information from one part of a dialogue in order to use it in another part. Instructions for using the system should be visible or easily retrievable whenever appropriate.

**Key ideas and examples:**
- **Short-term memory capacity:** humans can typically hold only around **5–7 elements** in short-term memory at once — this capacity is easy to overload, which is the cognitive basis for this heuristic.
- **CLI vs. GUI comparison:** a block of example Git command-line commands is shown (e.g., `git add -A`, `git commit --quiet --allow-empty-message --file`, `git status -z -u`, `git symbolic-ref --short HEAD`, `git remote --verbose`, `git config --get commit.template`, `git push`) to illustrate how a command-line interface demands the user **recall** exact syntax/flags from memory, versus a GUI, which can let the user **recognize** available options visually instead.
- **Visited links** — cited as a classic recognition-supporting design pattern (browsers visually distinguish already-visited hyperlinks so users can recognize, rather than recall, which links they've already followed).
- **Mobile OS gesture example:** swiping up (Apple/iOS) or down (Android) to reveal the Settings/Control Panel — the lecture poses this as an open discussion question: **"Is this an example of recognition or recall?"** (implicitly highlighting that gesture-based UI can sometimes blur the line between the two, since gestures must often be recalled rather than visually recognized).

---

### #8: Flexibility and efficiency of use

**Definition:** Accelerators — invisible to the novice user — can speed up interaction for expert users, allowing a single system to cater to both inexperienced and experienced users. Systems should allow users to tailor/customize frequent actions.

**Key ideas — ways to provide flexibility/efficiency:**
- Easily-learned shortcuts for frequent operations, including:
  - Keyboard accelerators
  - Command abbreviations
  - Bookmarks
  - History (in command-line interfaces)
  - Templates (e.g., PowerPoint templates, boilerplate code)

**Example cited:** **Emmet** — a toolkit for web developers (https://emmet.io) — used as a concrete real-world example of an "accelerator" tool that dramatically speeds up expert users' workflow (e.g., HTML/CSS abbreviation expansion) while remaining invisible/irrelevant to novices who don't use it.

---

### #9: Aesthetic and minimalist design

**Definition:** Dialogues should not contain information that is irrelevant or rarely needed. Every extra unit of information in a dialogue competes with the relevant units of information and diminishes their relative visibility.

**Key ideas:**
- **"Less is more."**
- Omit extraneous information, graphics, and features.
- Provide only relevant data to the user at any given point.

*(Illustrated with UI comparison examples in the source deck; specific example descriptions were not present as extractable text beyond images.)*

---

### #10: Help and documentation

**Definition:** Even though it's better if a system can be used without documentation, it may be necessary to provide help and documentation. Any such material should be easy to search, focused on the user's task, list concrete steps to carry out, and not be excessively large.

**Key ideas:**
- **Users generally don't read manuals** — but manuals and online help become vital when a user is frustrated or "in crisis" (i.e., stuck and specifically seeking help).
- Good help should be:
  - **Searchable**
  - **Context-sensitive**
  - **Task-oriented**
  - **Concrete**
  - **Short**

**Important closing caution for this heuristic:**
> **"Help is not a replacement for bad design!"**

(i.e., good documentation should never be used as a crutch to compensate for a fundamentally poor interface — the design itself should be fixed first.)

---

## 5. Heuristic Evaluation (full treatment, second pass)

Having covered all ten heuristics individually, the lecture returns to the **heuristic evaluation method** itself in more depth (this expands on Section 1 above).

### 5.1 What and why/how (restated with an added detail)

- **What:** An informal usability inspection method where a small group of usability specialists judges an interface.
- **Why/how:**
  - Define usability guidelines/heuristics (e.g., Nielsen's 10) to identify design problems and avoid common pitfalls.
  - Each evaluator independently lists the problems they find with respect to these principles.
  - Each evaluator ranks the problems they found by severity.
  - **Important methodological detail (new in this pass):** to get **unbiased evaluations**, evaluators should inspect the interface **alone** (i.e., independently, not as a collaborative group), so that one evaluator's opinions don't bias another's findings.

### 5.2 Problems found by a single evaluator

- **Different people find different usability problems** — there is no single "correct" or complete set that one evaluator alone will reliably surface.
- Evaluators can miss both **easy** and **hard** problems:
  - Even the **"best" evaluators** can miss problems that seem easy/obvious.
  - Even **"worse" (less skilled) evaluators** can sometimes discover problems that are genuinely hard to find.
- **Conclusion: method effectiveness improves by involving multiple evaluators**, since their blind spots differ.

*(Source cited: "How to Conduct a Heuristic Evaluation," J. Nielsen, 1995.)*

### 5.3 Problems found by multiple evaluators

- **Empirical finding:** using **3–5 evaluators finds approximately 66–75% of usability problems** in an interface.
- Reinforces the earlier point: different people find different problems, and there is typically only **modest overlap** between the sets of problems different evaluators find.
- The source material includes a referenced curve/chart showing the number of usability problems found as more evaluators are progressively added (illustrating diminishing returns — the marginal benefit of each additional evaluator decreases as more are added, though the "3–5 evaluators" range is presented as a good practical target).

*(Source cited: "How to Conduct a Heuristic Evaluation," J. Nielsen, 1995.)*

---

## Key terms and concepts glossary (for quick reference / retrieval)

- **Heuristic evaluation:** An informal usability inspection method where a small group of usability specialists independently judges an interface against a defined set of usability heuristics, then ranks found problems by severity.
- **Nielsen's 10 usability heuristics:** A widely used set of ten general usability principles (see full list in Section 4) originally published by Jakob Nielsen and Rolf Molich (CHI'90), further developed by the Nielsen Norman Group.
- **Match between system and the real world:** Heuristic #1 — use familiar language/concepts/order rather than system-oriented terms; use metaphors carefully, since they can mislead.
- **Consistency and standards:** Heuristic #2 — similar things should look/act similarly, different things should look different; follow platform conventions; the "principle of least surprise."
- **Visibility of system status:** Heuristic #3 — keep users informed of system state via timely, appropriate feedback; includes Nielsen's 2014 "3 important limits" for response time (0.1s, 1s, 5s thresholds).
- **User control and freedom:** Heuristic #4 — provide clear "emergency exits" (cancel, undo/redo, interrupt, quit, restore defaults) so users don't feel trapped; violating this repeatedly causes the "Pottery Barn effect" (fear of interacting because actions feel irreversible).
- **Error prevention:** Heuristic #5 — design to prevent errors before they happen, via confirmation dialogs, eliminating error-prone conditions, and using Norman's distinction between "mistakes" (wrong conscious goal/mental model) and "slips" (correct goal, misdirected automatic action).
- **Help users recognize, diagnose, and recover from errors:** Heuristic #6 — plain-language, precise, constructive error messages; deal with errors positively and politely.
- **Recognition rather than recall:** Heuristic #7 — minimize memory load by keeping options/objects/actions visible, since short-term memory holds only ~5–7 items; contrasts CLI (recall-heavy) with GUI (recognition-friendly) interaction.
- **Flexibility and efficiency of use:** Heuristic #8 — provide accelerators (shortcuts, abbreviations, bookmarks, history, templates) that speed up expert use without hindering novices.
- **Aesthetic and minimalist design:** Heuristic #9 — omit irrelevant or rarely-needed information, since extra information competes with and diminishes the visibility of relevant information ("less is more").
- **Help and documentation:** Heuristic #10 — provide help that is searchable, context-sensitive, task-oriented, concrete, and short; critically, help must never be used as a substitute for fixing genuinely bad design.
- **Pottery Barn effect:** A term (from the retail phrase "if you break it, you bought it") describing user hesitancy/fear of interacting with a system when they don't trust that actions are reversible.
- **Mistakes vs. slips (Don Norman):** Mistakes are errors from a consciously wrong plan or incorrect mental model; slips are errors where an unconscious/automatic action gets misdirected despite a correct underlying goal, common in skilled/practiced behavior.
- **Multiple-evaluator effect:** The empirical finding that 3–5 independent evaluators typically uncover 66–75% of an interface's usability problems, since different evaluators tend to find different, only modestly overlapping sets of issues.

## Notes on lecture examples (illustrative, referenced but not exhaustively detailed in source text)
- Excel `[A][1]` notation vs. programming `[0][0]` notation (heuristic #1)
- "Airplane mode" vs. "Radio off" labeling (heuristic #1)
- Trash-can and shopping-cart icons as metaphors (heuristic #1)
- Hamburger menus (web vs. desktop context) and flat UI button/label ambiguity (heuristic #2)
- Browser DevTools "Offline" mode as misleading feedback; Linux terminal as a contrast case (heuristic #3)
- Gmail "Undo Send" / email recall feature (heuristic #4)
- Glass-on-shelves imagery illustrating the Pottery Barn effect (heuristic #4)
- Git CLI command block illustrating recall burden vs. GUI recognition; visited-link styling; mobile swipe gestures for Settings (heuristic #7)
- Emmet web-development toolkit (heuristic #8, https://emmet.io)
- Nielsen's "Response Times: The 3 Important Limits" (2014) and "How to Conduct a Heuristic Evaluation" (1995) as cited external sources

---

*End of Lecture 4 content. This document was generated by extracting and restructuring all text content from the original 67-slide PowerPoint deck. The lecture's two-pass structure (heuristic evaluation introduced briefly at the start, then covered in depth after all ten heuristics are presented) has been preserved as Sections 1 and 5 respectively, rather than merged.*
