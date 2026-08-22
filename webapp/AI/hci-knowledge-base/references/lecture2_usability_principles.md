# Lecture 2: Usability and Usability Principles

**Course:** Human-Computer Interaction (HCI)
**Instructor:** Mario Čagalj
**Institution:** University of Split
**Source material acknowledgment:** Based on slides by Saul Greenberg, Russell Beale, and others
**Original file:** Lecture_2.ppt (60 slides)

---

## Purpose of this document

This is a structured, text-complete rendering of a lecture on usability principles, converted from a PowerPoint deck so its content, structure, and argument flow are fully machine-readable. Decorative/illustrative images (photos of controls, dialog boxes, everyday objects, etc.) are described conceptually where they carry meaning; purely decorative images are omitted.

---

## 0. Lecture roadmap

The lecture states it will:
1. Recall what HCI is and why it matters.
2. Look at examples of bad design.
3. Present a set of core **usability principles** and their design implications.

---

## 1. Recap: What is HCI?

(Repeated from Lecture 1.) HCI studies the physical, psychological, and theoretical aspects of how people interact with computers, and asks to what extent computers support successful interaction versus causing frustration. HCI has three sides: the user, the computer (any technology), and the way they work together.

**Why HCI?** To enable designers to build interactive products that support people in their everyday and working lives. The goal is to develop **usable products** that are:
- Easy to learn
- Effective to use
- Provide an enjoyable experience

---

## 2. Examples of problematic ("bad") design

The lecture walks through several real-world examples of poor design, used to build intuition before formal principles are introduced:

- **Car speedometers** (Honda vs. Jetta comparison) — used to question "How fast am I going?", implying that readability/clarity of a critical instrument varies significantly between designs. Source cited: http://www.baddesigns.com
- **A dialog box whose default selected button is "Lock" instead of "Cancel"** — dangerous because a user might reflexively hit Enter/the default button expecting a safe cancel action. The lecture poses a thought experiment: imagine this dialog appearing right after a user typed a disk-formatting command (`format C:`) — the wrong default could cause data loss.
- **Information overload** vs. a **user-centered approach** — contrasted visually (e.g., a cluttered interface vs. a simplified one), without further elaboration in text.

**Consequences of problematic design:**
- Leads to daily challenges for users.
- Causes frustration and lowers productivity.
- Increases the overall cost of a product. For a computer system specifically:
  - **Technical/vendor-side costs:** hardware, software.
  - **User-side costs:** training costs, costs of daily usage (time/effort lost).

**How to avoid problematic design** — designers need to take into account:
- Who the users are.
- What activities are being carried out.
- Where the interaction is taking place (context).

The overall aim: **optimize the interaction** between users and the product so that it matches users' actual activities and needs.

---

## 3. What is usability?

**Formal definition (ISO 9241-11):**
> Usability is the extent to which a product can be used by specified users to achieve specified goals with **effectiveness, efficiency, and satisfaction** in a specified context of use.
> (Source: http://www.iso.org)

More informally: usability is the measure of the quality of a user's experience when interacting with a product or system.

**The three usability components, explained:**
- **Effectiveness** — Can users actually achieve their goals with the product?
- **Efficiency** — How much effort (time) is required for users to achieve those goals?
- **Satisfaction** — What do users think about how easy the product is to use?

These three are all shaped by the users themselves, their goals, and the situation/context of use.

**Important distinction:** Usability ≠ Functionality. Adding more features/functionality to a product does **not** automatically improve its usability — and can actively harm it (e.g., via clutter or complexity).

---

## 4. Usability goals

A broader set of usability goals listed (beyond the ISO three):
- Effectiveness
- Efficiency
- Safety
- Utility
- Learnability
- Memorability

All of these ultimately affect **user satisfaction**.

---

## 5. The seven basic design principles (core framework of the lecture)

This is the central model of the lecture — a recurring "menu" slide lists seven principles, each introduced with a guiding question a user implicitly asks when facing an interface:

1. **Visibility** — "Can I see it?"
2. **Feedback** — "What is it doing now?"
3. **Constraints** — "Why can't I do that?"
4. **Mapping** — "Where am I and where can I go?"
5. **Consistency** — "I think I have seen this before?"
6. **Affordance(s) and signifiers** — "How do I use it?"
7. **Conceptual/mental models** — "I think I know how this operates?"

(This list is explicitly tied to the design philosophy of *The Design of Everyday Things*, referenced visually throughout via its cover image.) Each principle is elaborated below with its own set of slides.

---

### 5.1 Visibility

**Core idea:** Can the user see the state of a device and the possible actions available to them? Systems are more usable when they clearly indicate:
- Their current status
- The possible actions that can be performed
- The consequences of those actions

**Examples discussed:**
- **Car controls** — positioned so they can be easily found and used (a positive example of visibility).
- **Windows 10 lock screen** — cited as a "troublesome" example where it's unclear how to proceed/unlock.
- **Automatic (sensor-based) faucets** — a negative example: users aren't sure how to trigger them or where to place their hands, because visible knobs/dials/buttons have been replaced by invisible "active zones." A referenced video: https://www.youtube.com/watch?v=EqU1FmoQ85Q
- **Elevator control panel** — a discovery/visibility failure scenario: pushing the floor button does nothing, and it isn't visible what action is actually required. (Resolved in the next slide.)
  - **Resolution:** the actual required action is inserting a room key-card into a slot next to the buttons — something not visible/obvious. The lecture asks how this could be made more visible/discoverable:
    - Make the card reader more visually obvious.
    - Provide an auditory message (raising the question: in which language?).
    - Provide a large, clear label next to the card reader.
    - General principle: make relevant parts visible; make what has to be done obvious.
- **Microsoft PowerPoint animations** — a visibility/discoverability critique:
  - It's easy to *add* an animation, but not obvious how to *remove* one, or how to combine multiple animations on the same object using the Ribbon interface.
  - To remove an animation, a user must specifically open the "Animation Pane" — described as a **discoverability failure**: the action needed to accomplish a common task is not easily discoverable.
  - Contains a side note about "unexpected defaults" and animations "revealing" content rather than showing it "all at once."
- **Google's search box** — a positive example: it makes it visually obvious/clear exactly where to enter text.

---

### 5.2 Feedback

**Core idea:** "What is it doing now?" Feedback means sending information back to the user about what action has been done/registered by the system. Feedback needs to be:
- **Immediate**
- **Synchronized with the user's action**

Feedback can take many forms, including sound, highlighting, animation, and combinations thereof. The lecture gives practical prompts: "Listen to your mouse when you click it," and encourages students to look around and find their own examples of feedback in daily life.

**Examples referenced:** calculator feedback, a Google Material Design video reference, and GROHE F-digital electronic shower/bath controller products (as physical examples of devices communicating feedback to users).

**Related concept — Feedforward:**
> Feedforward is a mechanism that informs a user about what the result of their action **will be** (as opposed to feedback, which tells them what the result **was** or **is**).

This distinguishes feedback (post-action confirmation) from feedforward (pre-action prediction/preview).

---

### 5.3 Constraints

**Core idea:** Restricting the possible actions that can be performed, or restricting the kind of interaction that can take place. **Why use constraints?** They help prevent users from selecting incorrect options in the first place.

**Examples:**
- Physical connector design (e.g., differently shaped plugs/ports) — contrasted "in the past" vs. "nowadays," implying evolution toward connectors that can only be inserted in the correct way/orientation.
- Constraints can reduce user error and can help focus user attention onto the task that actually needs to be done.

**Cultural constraints** — a specific sub-type:
- These are **arbitrary conventions** that people have learned, which help them use technologies once learned (i.e., not inherently "natural," but effective because of shared familiarity).
- Examples given:
  - Icons and menus.
  - **Number pad layouts** — calculators and phone keypads traditionally use *opposite* row orderings; the lecture poses the open question of which convention a computer keypad "should" follow.
  - **Keyboard layouts** — QWERTY vs. Dvorak: QWERTY is objectively slower to type on, yet the convention persists because everyone has already learned it (referenced YouTube comparison video, and a mention of "Amplifico @ Singapore startup-contest").

**Physical, semantic, logical, and cultural constraints (four sub-types), illustrated via LEGO pieces** — LEGO is presented as an example that exploits multiple constraint types simultaneously so that pieces can often be assembled correctly without a manual:
- **Physical constraint:** limits which pieces can physically fit together and in what placement.
- **Semantic constraint:** prevents nonsensical/incorrect assembly based on meaning — e.g., you can't easily attach a head backwards, or place a "POLICE" label upside down.
- **Cultural constraint:** dictates conventional placement, e.g., which color lights go where (yellow/white vs. red vs. blue), matching real-world/cultural expectations (e.g., real vehicle lighting conventions).
- **Logical constraint:** based on process-of-elimination reasoning — quoted via the Sherlock Holmes maxim: "If you've eliminated all other possibilities, whatever remains must be the truth."

---

### 5.4 Mapping

**Core idea:** When a user turns a wheel, flips a switch, or pushes a button, what effect do they expect? **Mapping** is the relationship between controls (and their movements) and their real-world results/effects.
- **Good (natural) mapping:** the resulting effect corresponds to the user's expectation.
- **Poor mapping:** the effect does not correspond to what the user expected.

Good mapping between controls and their effects leads to greater ease of use.

**Examples:**
- **Stove/cooktop control layouts** — the lecture poses a comparison question: which stove-control design provides better mapping between knob position and burner, and why? (Implying that a knob layout that spatially mirrors the physical burner layout is superior to a linear/arbitrary row of knobs.)
- **Car door control panel** (window/mirror controls) and **classroom light switches** — used as further "good or bad mapping?" discussion prompts, with numbered switch/control elements (1–4) referenced in the visuals for direct comparison.

**What good mapping is a function of (three sources of similarity):**
1. **Layout** — e.g., stove controls arranged to spatially match burner positions.
2. **Behavior** — e.g., a steering wheel or a Segway, where the physical motion of the control matches the resulting motion of the vehicle.
3. **Meaning** — e.g., a power-off button: people culturally associate the color red with "STOP," and the open-circle icon (⏻-type symbol) with standby/power-down.

---

### 5.5 Consistency

**Core idea:** Design interfaces so that similar operations use similar elements/interactions for similar tasks. Example: keyboard shortcuts consistently formed as **Ctrl + first initial of the command** (e.g., Ctrl+C, Ctrl+S, Ctrl+V). Consistent interfaces are easier to learn and use.

**Consistency breakdowns:**
- Problem arises when multiple commands start with the same letter (e.g., Save, Spelling, Select, Style all start with "S").
- Designers must then find alternate initials or key combinations (e.g., Ctrl+S, Ctrl+Space, Ctrl+Shift+L), which breaks strict consistency.
- This increases the learning burden on users and makes them more error-prone.

**Two types of consistency:**
- **Internal consistency:** operations behave the same *within* a single application. Difficult to fully achieve in complex interfaces.
- **External consistency:** operations/interfaces behave the same *across different applications and devices*. Very rarely actually achieved in practice.

**Example of external inconsistency:** numeric keypad layouts differ across device types (e.g., calculators, phones, remote controls, TVs) — illustrated with several remote-control/keypad images (including a Sony Bravia remote), showing how number-key ordering is not standardized across product categories.

---

### 5.6 Affordances and signifiers

**Affordance:**
> An attribute of an object that allows people to know how to use it (i.e., what potential actions are available). How something looks indicates how it can be used.

Classic examples given:
- A chair affords (is for) sitting.
- A table affords placing things on.
- A knob affords turning.
- A slot affords inserting things into.
- A button affords pushing.

**Signifier** (distinguished from affordance):
> A perceivable indicator (a mark, a sound, etc.) that communicates appropriate behavior to a person.

(Referenced further via "NN Group: Weak vs. Strong Signifiers" as an external resource/framework, and a Windows 10 recycle-bin icon example.)

**Messing up affordances — and how signifiers rescue the situation:**
- Complex things may legitimately need explanatory labels/instructions, but **simple things should not**.
- If a simple object needs a label or instruction to be usable, that is itself a sign the design has failed — usage should be self-evident from appearance alone.
- Canonical example: **"Norman doors"** — doors whose push/pull mechanism is ambiguous from appearance alone, forcing designers to add "Push"/"Pull" signs (a signifier compensating for a lack of inherent affordance). Referenced via a "Norman doors" YouTube video and an image of push/pull doors.

---

### 5.7 Conceptual / mental models

**Definition:**
> A conceptual model is an explanation (often simplified) of how something works — a representation, held in a person's head, of a given system, derived from experience.

People understand and interact with systems based on mental representations built from their prior experience. They then compare the outcomes predicted by their mental model against the real-world system's actual behavior:
- If the predicted and actual outcomes match → the mental model is **accurate**.
- If they don't match → the mental model is **inaccurate or incomplete**.

**Why mental models matter:**
- They let a user mentally *simulate* how a device/design will behave before acting.
- A **good** conceptual/mental model lets the user accurately **predict the effects of their actions**.

**What mental models are built from (sources):**
- Affordances, signifiers, and constraints
- Mappings
- Transfer effects (knowledge carried over from other, similar systems)
- Population stereotypes / cultural standards
- Instructions
- Direct interactions/experience with the system

**Illustrative examples referenced:**
- "Norman's impossible bike / tandem divergent" image — illustrating a design that breaks intuitive mental models.
- A JavaScript code-comprehension exercise (Promises, `resolve`, `setTimeout`, `console.log` ordering) — used to illustrate that even experienced programmers rely on (and can be tripped up by) a mental model of *how* asynchronous code executes; the lecture asks students to predict the output order without running the code. (Source credited: "reactjunkie".)

**Communicating through the "system image":**
- The **designer's** conceptual model is (assumed to be) accurate.
- The **system image** is what a user can actually perceive from the physical structure/interface that was built — this is the designer's only channel for communicating their model to the user.
- The **user's** conceptual model is developed through interaction with the system image, and is typically inaccurate, at least initially.
- **The core design challenge:** the designer must ensure the system image effectively communicates a good/accurate conceptual model to the user.
- **How to achieve this:** usability testing, observing people who are unfamiliar with the system — described as a central topic of the course itself.

**Extended case study: the conceptual model of ABS (Anti-lock Braking System)**

This worked example spans three slides and illustrates how a *wrong* mental model can neutralize a genuinely beneficial technology:

1. **The puzzle:** Statistics showed that, in the early days of ABS adoption, ABS brakes did **not** reduce the frequency or cost of accidents overall — despite the fact that ABS demonstrably had measurable safety benefits in controlled tests. Why the mismatch?
   - **Answer:** explained via the concept of drivers applying the **wrong mental model** to ABS-equipped cars.

2. **Contrasting the correct interaction models:**
   - **Good interaction model for conventional (non-ABS) brakes, on slick surfaces:**
     - Depress the brake pedal smoothly.
     - **Pump** the brakes to prevent wheel lock-up.
     - Do **not** steer while braking, except to counter-steer.
     - Noise and vibration are signs that something is wrong.
   - **Good interaction model for ABS, on slick surfaces:**
     - Depress the brake pedal **fast and hard**.
     - Do **not** pump the brakes (the system pumps automatically).
     - **Steer while braking** is possible/expected with ABS.
     - Noise and vibration are signs that the ABS system is operating **properly** (i.e., the opposite interpretation from conventional brakes!).

3. **The conclusion:** The likely reason ABS failed to reduce accidents early on was that people were **not using it properly**, because they were transferring their old mental model (from conventional brakes) onto the new ABS system — an inappropriate "transfer effect." The lecture frames this ultimately as **a design failure**: "ABS are not properly designed" (i.e., the system/its instruction/onboarding failed to correctly reshape users' mental models). **Takeaway principle:** design with people's actual (existing) conceptual models in mind, rather than assuming they will intuit an entirely new one.

---

## 6. Final thoughts: individual differences

- **Who do you design for?** People differ significantly from one another; it is rarely possible to accommodate every individual perfectly.
- **Rule of thumb:** Designing for "the average" user is a mistake — an average-user design can end up excluding roughly half the actual audience (since "average" is a statistical abstraction no real user matches).
- Design should instead aim to serve **~95% of the audience** — but this framing explicitly acknowledges a trade-off: **~5% of the population may be seriously compromised/excluded** by this approach (an accessibility caveat).
- **You are not necessarily a representative user** of the systems you design. Do not assume other people think or behave the way you do (or the way you'd like them to).
- People vary in thought and behavior just as much as they vary physically.
- **Guiding principle:** Design *for* and *with* the user — not just from the designer's own perspective.

---

## 7. Lecture conclusion — "What you know now"

Key closing takeaways:
- Many so-called "human errors" are actually **errors in design**, not failures of the user. **Don't blame the user.**
- Good designers make systems easier to use by helping users form a good mental/conceptual model, achieved through:
  - Affordances and signifiers
  - Constraints
  - Mapping
  - Visibility
  - Population stereotypes
  - Positive transfer (leveraging users' existing knowledge from other, similar systems)

---

## Key terms and concepts glossary (for quick reference / retrieval)

- **Usability (ISO 9241-11):** The extent to which a product can be used by specified users to achieve specified goals with effectiveness, efficiency, and satisfaction in a specified context of use.
- **Effectiveness:** Whether users can actually achieve their intended goals with a product.
- **Efficiency:** How much effort/time is required for users to achieve their goals.
- **Satisfaction:** Users' subjective assessment of how easy/pleasant a product is to use.
- **Visibility:** Whether the system clearly shows its current status, available actions, and the consequences of actions.
- **Feedback:** Information sent back to the user, immediately and in sync with their action, about what has been done.
- **Feedforward:** Information given to a user in advance about what the result of an action *will* be.
- **Constraint:** A restriction on possible actions/interactions, used to prevent user error and focus attention. Sub-types: physical, semantic, logical, cultural.
- **Cultural constraint:** An arbitrary but learned convention (e.g., QWERTY keyboard) that becomes effective purely through shared familiarity.
- **Mapping:** The relationship between a control and its real-world effect; "natural"/good mapping aligns with user expectation via similarity of layout, behavior, or meaning.
- **Consistency (internal/external):** Designing similar operations/elements the same way, within an application (internal) or across applications/devices (external).
- **Affordance:** A perceivable property of an object suggesting how it can be used (e.g., a knob affords turning).
- **Signifier:** A perceivable cue (mark, sound, label) that explicitly communicates the correct action to a user — often compensates when an affordance alone isn't clear enough (e.g., "Push"/"Pull" signs on a Norman door).
- **Conceptual/mental model:** A user's internal, experience-derived, often-simplified representation of how a system works, used to predict outcomes of actions.
- **System image:** What a user can perceive from a system's actual built interface/physical structure — the designer's channel for shaping the user's mental model.
- **Transfer effect:** The (positive or negative) carry-over of a user's existing mental model from one system to a new, related system (as in the ABS example, where drivers wrongly transferred conventional-brake behavior to ABS).
- **Population stereotype:** A widely shared expectation/convention within a culture or group (e.g., red = stop) that designers can leverage for intuitive design.
- **Discoverability failure:** A specific visibility failure where a user cannot easily find/see how to perform a desired action, even though the action is technically possible (e.g., removing an animation in PowerPoint).
- **"Norman door":** A colloquial term (from Don Norman) for a door whose push/pull operation is not self-evident from its design, requiring an added label/sign to function correctly.

## Notes on lecture examples (illustrative, referenced but not exhaustively detailed in source text)
- Honda vs. Jetta speedometer comparison (baddesigns.com)
- Windows 10 lock screen usability issue
- Automatic/sensor faucets vs. manual faucets
- Elevator control panel requiring key-card insertion
- Microsoft PowerPoint's Animation Pane discoverability problem
- Google's search box as a positive visibility example
- LEGO pieces as a multi-constraint-type design example
- QWERTY vs. Dvorak keyboard layout debate
- Stove/cooktop knob-to-burner mapping comparison
- Car door window/mirror control panel and classroom light switch mapping exercises
- Ctrl+key consistency conventions and their breakdowns (Ctrl+S/Space/Shift+L)
- Numeric keypad inconsistency across calculators, phones, and remote controls (e.g., Sony Bravia remote)
- "Norman doors" (push/pull door signage)
- JavaScript Promise/event-loop ordering exercise, used as a mental-model test (credited to "reactjunkie")
- ABS vs. conventional braking systems as an extended real-world mental-model case study

---

*End of Lecture 2 content. This document was generated by extracting and restructuring all text content from the original 60-slide PowerPoint deck. Recurring "menu" slides listing the seven design principles have been consolidated into the section headers above rather than repeated verbatim at each occurrence in the source deck.*
