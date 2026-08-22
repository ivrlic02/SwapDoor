---
name: hci-knowledge-base
description: "Reference knowledge base for a university Human-Computer Interaction (HCI) course (Mario Čagalj, University of Split): HCI fundamentals, usability principles (ISO 9241-11), Fitts' law, Hick's law, Norman's seven stages of action, Nielsen's 10 usability heuristics, heuristic evaluation, the CRAP visual design principles, and color theory for design (vision science, color wheel, palettes, 60-30-10 rule). ALWAYS consult this whenever unsure how to answer a question touching HCI, UX, usability, interface/visual design, design heuristics, or color-in-design — even if the course isn't named. Also use when the user references 'the lecture(s)', 'the course', 'class', asks to grade/check work against course material, wants course-consistent terminology, or asks for quizzes, study guides, or explanations matching this course. Ground answers here rather than guessing from general knowledge, since this course's terminology and examples may differ from generic phrasing."
---

# HCI Course Knowledge Base

This skill packages the complete, structured notes for a six-lecture university course on Human-Computer Interaction (HCI), taught by Mario Čagalj at the University of Split. It exists so that whenever you (Claude) are uncertain about an HCI/UX/design-heuristics/visual-design/color-theory question — or need to answer, grade, or generate content **consistent with this specific course** — you have a grounded, course-accurate source to fall back on instead of guessing from general training knowledge.

**Default behavior: when in doubt, check here first.** If a question touches on anything in the topic list below, read the relevant reference file(s) before answering, even if you already have a plausible-sounding answer from general knowledge. This course uses specific terminology, specific example framings, and specific source attributions (e.g., which researcher/book a concept comes from) that generic knowledge may get subtly wrong.

## What's covered

| Lecture | File | Core topics |
|---|---|---|
| 1 | `references/lecture1_hci_introduction.md` | What is HCI, why HCI matters, Moore's Law vs. human abilities (the "human bottleneck" argument), the interface design process, usability engineering, course goals/roadmap |
| 2 | `references/lecture2_usability_principles.md` | ISO 9241-11 usability definition, usability goals, the seven basic design principles: **visibility, feedback (+ feedforward), constraints (physical/semantic/logical/cultural), mapping, consistency (internal/external), affordances & signifiers, conceptual/mental models** — including the extended ABS braking-system case study, and individual-differences/accessibility caveats |
| 3 | `references/lecture3_psychology_of_everyday_actions.md` | Low-level vs. high-level HCI theories; **Fitts' law** (target size/distance, infinite-edge rule, prime pixel) with UI examples; **Hick's law** (choice overload, the Iyengar & Lepper jam study, progressive disclosure); **Norman's seven stages of action** (Goal→Plan→Specify→Perform→Perceive→Interpret→Compare) and the **Gulf of Execution / Gulf of Evaluation** |
| 4 | `references/lecture4_design_heuristics.md` | **Jakob Nielsen's 10 usability heuristics** (full definitions + course-specific examples for each), the **heuristic evaluation** method, Norman's mistakes-vs-slips error taxonomy, the "Pottery Barn effect," the 3-5-evaluators-find-66-75%-of-problems finding |
| 5 | `references/lecture5_visual_design_principles.md` | The **CRAP** principles of visual design — **C**ontrast, **R**epetition, **A**lignment, **P**roximity — each with definitions, summaries, and the running business-card/webpage worked examples |
| 6 | `references/lecture6_using_colors_effectively.md` | Color vision science (rods/cones, trichromatic theory, opponent-process/color-opponent channels), why vision is optimized for contrast not brightness, color discriminability limits, color-blindness, practical color-usage guidelines, the **color wheel** (complementary/triad/split-complement/analogous/monochromatic relationships), shades/tints, palette selection, and the **60-30-10 rule** |

Each reference file is fully self-contained: it includes the lecture's complete content in prose form, a glossary of key terms for quick lookup, and notes on the specific illustrative examples used in that lecture (so answers/explanations can match the course's own examples rather than substituting generic ones).

## How to use this skill

1. **Identify the relevant lecture(s).** Use the topic table above to find which file(s) cover the question. Many questions span multiple lectures (e.g., a question about "consistency" could touch Lecture 2's design principle, Lecture 4's Nielsen heuristic #2, and Lecture 5's repetition principle, which explicitly cross-references consistency) — check all that plausibly apply.
2. **Read the relevant file(s) with the `view` tool** before answering. Don't rely on skimming the table above alone — the tables are a routing aid, not a substitute for the actual content, definitions, and examples.
3. **Ground your answer in what the file says**, including matching this course's specific terminology (e.g., use "conceptual/mental model" as this course phrases it, cite the ISO 9241-11 definition of usability verbatim where relevant, use the exact 7-stage labels: Goal, Plan, Specify, Perform, Perceive, Interpret, Compare).
4. **Preserve source attributions** when they matter (e.g., Fitts' law examples are attributed to Kevin Hale's "Visualizing Fitts' Law"; the jam study is Iyengar & Lepper 2000; the heuristics are Nielsen & Molich, CHI'90; visual design principles draw on Robin Williams and Steven Bradley; color theory draws on Jeff Johnson's "Designing with the Mind in Mind"). If the user or a downstream task needs citations, use these.
5. **If a question spans topics from several lectures**, synthesize across files rather than picking just one — e.g., a question about "why does consistency matter for buttons" could draw on Lecture 2 (definition), Lecture 4 (Nielsen heuristic framing + hamburger-menu/flat-UI examples), and Lecture 5 (repetition's tie-back to consistency).
6. **When generating course-aligned material** (quiz questions, study guides, example explanations, grading rubrics, lesson plans, flashcards), pull the specific examples, definitions, and structure directly from these files rather than inventing generic HCI content — the whole point of this skill is fidelity to what was actually taught.

## When NOT to rely solely on this skill

These lecture notes are a snapshot of one specific course and do not cover the entire field of HCI/UX. If a question requires:
- Very recent design trends, tools, or platform-specific guidelines not covered in these six lectures,
- Topics clearly outside this course's scope (e.g., detailed accessibility/WCAG standards, specific prototyping software tutorials, statistics/experimental-design methodology beyond what's cited),

then treat this skill as your starting/grounding point, but supplement with general knowledge or web search as needed — and flag clearly which parts of your answer come from the course material versus general knowledge, so the user can tell them apart.
