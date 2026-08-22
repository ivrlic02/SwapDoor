# Lecture 6: Using Colors Effectively in Graphical Design

**Course:** Human-Computer Interaction (HCI)
**Instructor:** Mario Čagalj
**Institution:** University of Split
**Source material acknowledgment:** Based primarily on *"Designing with the Mind in Mind"* by Jeff Johnson and *"The Non-Designer's Design Book"* by Robin Williams, with additional guidance from *"Using Color to Enhance Your Design"* by Kelley Gordon (Nielsen Norman Group / NN/g).
**Original file:** Lecture_6.ppt (48 slides)

---

## Purpose of this document

This is a structured, text-complete rendering of a lecture on the perceptual science of color vision and its practical implications for using color effectively in interface/graphic design, converted from a PowerPoint deck so its content, structure, and argument flow are fully machine-readable. Decorative/illustrative images (color wheels, UI screenshots, nature photos used for palette inspiration) are described conceptually where they carry meaning.

---

## 1. Introduction: why color matters

- **Color is a powerful visual communication medium.** It shapes our perception, interpretation, and memory of what we see.
- Used well, color **enhances** the effectiveness of a message; used poorly, it can **impair** it.
- **Human color perception has both strengths and limitations:**
  - Human vision is optimized to detect **contrast (edges)**, not absolute brightness.
  - Our ability to distinguish colors depends heavily on **how** those colors are presented (not just which colors are chosen).
  - **Color-blindness** affects a meaningful portion of any audience.
  - The user's **display hardware** and **environmental/lighting conditions** both affect how color is actually perceived, independent of the designer's intended colors.

---

## 2. How color vision works: trichromatic and opponent-process theory

**Source cited throughout this section:** *Designing with the Mind in Mind*, Jeff Johnson.

### 2.1 Basic retinal anatomy

- The eye focuses light onto the **retina**, at the back of the eye.
- The retina contains two types of light-sensitive photoreceptor cells:
  - **Rods** — detect light levels (brightness), but **not** color.
  - **Cones** — detect color, and come in three sub-types, each maximally sensitive to a different part of the spectrum:
    - Red-sensitive cones
    - Green-sensitive cones
    - Blue-sensitive cones
  - All other perceived colors are produced through different combinations/ratios of signals from these three (RGB) cone types.

### 2.2 Rods vs. cones in practice

- **Most everyday human vision relies almost entirely on cone input.** Rods are barely used, mainly in poorly lit environments — examples given: dinner by candlelight, moving through a dark house, walking a dog after dark.
- People living in industrialized societies (with abundant artificial lighting) **hardly use their rods at all** in daily life.

### 2.3 Cone ratios and sensitivity

- The relative quantities of the three cone types are approximately in the ratio **red : green : blue = 40 : 20 : 1** — i.e., there are far more red- and green-sensitive cones than blue-sensitive ones.
- The eye's overall sensitivity to **blue** is much lower than its sensitivity to red and green.

### 2.4 Overlapping sensitivity ranges

- Color-sensitive cones are each actually sensitive to a fairly **wide range** of light frequencies, not a single narrow wavelength.
- Their sensitivity ranges **overlap considerably** with one another.
- Their peak sensitivities nonetheless **differ considerably** between the three cone types.
- This is explicitly contrasted with **artificial RGB receptors** (e.g., in cameras/sensors), which are engineered with narrower, more separated sensitivity bands than biological retinal receptors.

### 2.5 How the brain produces a broad range of perceived colors

- The brain combines cone signals **by subtraction**, not by reading each cone's raw individual response directly.
- **Why subtraction is more efficient:** since cone sensitivity ranges overlap, it's more informative to encode the *differences* between cone responses than each cone's absolute response in isolation.
- **Neurons in the visual cortex** (at the back of the brain) subtract signals arriving via the optic nerves to produce three distinct **color-opponent channels**:
  1. **Red–green difference channel** — computed from the green (medium-frequency) and red (low-frequency) cone signals.
  2. **Yellow–blue difference channel** — computed from the high-frequency and low-frequency cone signals.
  3. **Luminance (black–white) channel** — a third group of neurons **adds** (rather than subtracts) the signals from the low- and medium-frequency cones to produce an overall brightness signal.
- These three resulting channels are collectively known as the **color-opponent channels**, and they are the actual basis of human color perception (not raw RGB cone output).

---

## 3. Implications of color processing theories

**Source cited:** *Designing with the Mind in Mind*, Jeff Johnson.

### 3.1 Opponent-process afterimage experiment

The lecture includes an interactive demonstration: stare at a set of color patches for 20 seconds, then remove them and look at a blank white space — this is the classic **color afterimage effect**, used to make the opponent-process theory experientially vivid (afterimages appear in the *opponent* color of what was originally viewed, directly demonstrating the subtractive color-channel mechanism described above).

### 3.2 Vision is optimized for contrast, not brightness

- Because color-opponent processing works via **subtraction**, the human visual system is **much more sensitive to differences in color and brightness (i.e., contrast)** than it is to **absolute brightness levels**.
- **Illustrative example — the classic "checker-shadow illusion":** two squares labeled A and B in an image are actually the **exact same shade of gray**, yet square B is perceived as white because it appears to be in the shadow of a cylinder — the visual system infers relative brightness contextually (relative to surrounding shading/context) rather than reading absolute pixel brightness.

### 3.3 Limited ability to discriminate colors

Even setting aside color-blindness, the ability to **tell colors apart** is inherently limited and depends on **how** the colors are presented. **Three specific presentation factors affect discriminability:**

1. **Paleness (saturation):** the paler (less saturated) two colors are, the harder they are to tell apart.
2. **Color patch size:** the smaller or thinner an object/patch is, the harder it is to distinguish its color.
3. **Separation:** the more spatially separated two color patches are, the harder they are to compare — especially once the separation is large enough to require actual eye movement between the two patches.

**Examples illustrating limited discriminability:**
- Using **white vs. pale yellow** to indicate the current step in a multi-step reservation process — flagged as a poor choice, since pale/low-saturation color differences are hard to perceive.
- **Tiny color patches** — hard to distinguish purely due to their small size, independent of hue choice.
- **Large color patches** — shown as the corrective contrast case: bigger patches of the same colors are much easier to tell apart.
- **Visited vs. unvisited hyperlinks** rendered in **two different shades of blue** — flagged as a poor design choice for two compounding reasons: (a) the contrast between the two shades is too subtle, and (b) blue specifically falls in the range of the spectrum where human color sensitivity is comparatively weakest (tying back to the low blue-cone ratio noted in Section 2.3).

### 3.4 Color-blindness

- **Important clarification:** being color-blind does **not** mean seeing only in grey or black-and-white.
- It means that **one or more of the color-opponent subtraction channels does not function normally**, making it difficult to distinguish specific *pairs* of colors (rather than losing color perception altogether).
- **Prevalence:** approximately **8% of the male population** and around **0.5% of the female population** experience some form of color-blindness.
- **The most common type is red/green color-blindness.**
- The lecture makes a pointed practical/professional observation: this means **your boss, or even your investor, could plausibly be color-blind** — i.e., color-blindness isn't a rare edge case to design around only for a small niche audience; it's common enough to affect real stakeholders directly.

*(Source referenced for a related visual: Alex Bigman, 99designs.com.)*

---

## 4. Guidelines for using colors effectively

**Source cited:** *Designing with the Mind in Mind*, Jeff Johnson.

1. **Make sure the contrast between colors is high** (with a caveat: see the color-opponent-channel guidance immediately below, and the palette-application guidance later in the lecture).
   - **Practical contrast test:** view your color scheme in **grayscale** — if the colors aren't distinguishable once converted to grayscale, they aren't different enough from each other in the original color version either.
2. **Use distinctive colors, leveraging the color-opponent channel structure directly:**
   - Recall that the visual system encodes color via three opponent channels: **red–green**, **yellow–blue**, and **black–white** (luminance).
   - **The colors people distinguish most easily are those that produce a strong signal on just one of these three channels, while producing neutral (near-zero) signals on the other two channels.** This is presented as a principled, physiologically-grounded rule for choosing maximally distinguishable color pairs — not just an aesthetic guideline.
3. **Avoid color pairs that color-blind people cannot distinguish.** The lecture includes a comparative visual showing how the same color set appears under normal color vision versus under different color-blindness types, with approximate prevalence figures noted alongside: normal color vision, and three color-blind variants affecting roughly **1% of the male population**, **6% of the male population**, and **1% of the male population**, respectively (illustrating that different color-blindness sub-types have different prevalence rates).
4. **Use color redundantly with other signifiers** — e.g., pair a different **color** with a different **symbol/shape**, so that meaning is not conveyed by color alone (this directly protects color-blind users, since they can still rely on the non-color signifier).
5. **Separate strong opponent colors spatially.** Placing two strongly opponent colors (e.g., pure red directly next to pure green) immediately adjacent to one another can cause an uncomfortable **flickering/vibrating visual sensation** — so such color pairs should not be placed in direct, tight adjacency.

### Good examples cited

- Using **white, yellow, and blue** together to indicate the current step in a reservation process — presented as an improvement over the earlier white/pale-yellow example, since these colors are more distinguishable.
- A **graph using multiple shades of the same single color** (rather than many different hues) — praised because such color differences remain visible to **all** sighted people, including those with color vision deficiencies, since it avoids relying on hue discrimination between opponent channels.

---

## 5. The color wheel

**Source cited:** *The Non-Designer's Design Book*, Robin Williams.

### 5.1 Why use a color wheel

The color wheel is described as **"amazingly useful"** for making conscious, principled decisions about which colors to choose for a design project, rather than picking colors arbitrarily.

### 5.2 Building the wheel

- **Primary colors:** yellow, red, and blue — the starting point of the color wheel. These **cannot be produced by mixing any other colors together.**
- **Secondary colors:** obtained by mixing equal amounts of each primary color with the primary color next to it on the wheel (illustrated via a watercolor-mixing analogy).
- **Tertiary colors:** obtained by mixing equal parts of the colors on each side of a gap, filling in the remaining empty spots on the wheel.
- The result is a standard **twelve-color wheel** combining primary, secondary, and tertiary colors.

### 5.3 Color relationships (using the twelve-color wheel)

With the full wheel available, several reliable, "guaranteed to work together" color-combination strategies become available:

1. **Complementary colors:**
   - Colors positioned **directly across from each other** on the wheel (exact opposites).
   - Because they are maximally opposite, complementary pairs typically work best when **one color serves as the main/dominant color and the other as an accent**, rather than using both in equal proportion.

2. **Triads:**
   - **Basic triad:** a set of **three colors equidistant from each other** around the wheel — always produces a pleasing combination.
   - **Primary triad example:** red, yellow, and blue — noted as an extremely popular combination specifically for **children's products**.
   - **Split-complement triad (a second form of triad):**
     1. Choose a starting color from one side of the wheel.
     2. Find its complement (directly across the wheel).
     3. Instead of using that exact complement, use the **two colors adjacent to it** on either side.

3. **Analogous colors:**
   - A combination composed of colors that sit **next to each other** on the wheel.
   - No matter which two or three adjacent colors you combine, they all **share an undertone of a common color**, which is what creates a naturally harmonious combination.

### 5.4 Extending the wheel: shades and tints

- **Hue** = the pure color itself (as it appears on the base wheel).
- **Shade** = hue + black (this **reduces** lightness — makes the color darker).
- **Tint** = hue + white (this **increases** lightness — makes the color lighter/paler).

**Monochromatic colors:** a combination composed of a **single hue**, combined with any number of its corresponding tints and shades — i.e., varying only lightness/darkness of one base color, rather than varying hue at all.

**Shades and tints in combination:** you can take any of the color-relationship strategies above (complementary, triadic, analogous) but, instead of using the pure hues directly, use **various tints and shades of those same colors.** This dramatically **expands the number of usable color options**, while still keeping the underlying relationship intact — so the resulting palette remains reliably harmonious ("you can still feel safe that the colors work together").

---

## 6. Selecting a color palette for a design

**Source cited:** *Using Color to Enhance Your Design*, Kelley Gordon (NN/g — Nielsen Norman Group).

### 6.1 What is a color palette, and how to start

A **color palette** is simply the specific set of colors selected for a given design. Choosing this set can be genuinely challenging. **Guidelines given:**
1. Pick **one of the five color relationships** described above (complementary, basic triad, split-complement triad, analogous, or monochromatic).
2. **If you don't have design experience, start with monochromatic colors** — the lowest-risk starting point.
3. Once you've chosen a color relationship, **iterate on the individual colors** until you land on the version you like best / that works best for your specific design.
4. **If that process stalls, seek inspiration from nature** — the lecture illustrates this directly with several **nature photographs sourced from Unsplash** (https://unsplash.com/s/photos/nature), crediting individual photographers (Daniel Roe, Dave Hoefler, eberhard grossgasteiger) as examples of naturally-occurring, aesthetically pleasing color combinations that can seed a palette.

### 6.2 Limiting the palette size

- **Limit your palette to three (3) colors** — i.e., keep the overall set of colors small.
- **Why a smaller palette is better:**
  - A smaller number of colors gives **better potential for contrast** (fewer competing hues to visually differentiate between).
  - A smaller number of colors also produces a **better visual/information hierarchy** — it's easier to signal what's important when there aren't many competing colors.
  - Users are **less distracted** by an abundance of different colors.
- **If your project already has an established brand, follow the brand's existing colors** rather than choosing freely.

### 6.3 Applying the palette: the 60-30-10 rule

Once a palette is chosen, a practical application guideline is the **60-30-10 color rule:**
- **60%** of the overall design area should use the **dominant (primary) color**.
- **30%** of the area should use a **secondary color** that contrasts with the primary color.
- The remaining **10%** of the area should use an **accent color**.

**Further application guidance:**
- **Adjust/tweak your colors and test** what actually works best in practice, rather than treating the initial palette choice as final.
- **Use colors consistently** throughout the design — exceptions to the established palette are acceptable, **but only if they genuinely remain exceptions** (i.e., rare and deliberate, not a slide back into inconsistency).

---

## 7. Further resources

The lecture closes by pointing to additional external sources/tools for further suggestions and ideas on color usage (referenced via an image/link on the final slide, without additional extractable text detail).

---

## Key terms and concepts glossary (for quick reference / retrieval)

- **Rods:** Retinal photoreceptors that detect light level/brightness but not color; used mainly in low-light conditions.
- **Cones:** Retinal photoreceptors that detect color, in three sub-types (red-, green-, and blue-sensitive), whose relative quantities are approximately in a 40:20:1 ratio and whose sensitivity ranges overlap considerably.
- **Color-opponent channels:** The three neural channels (red–green, yellow–blue, black–white/luminance) the brain computes by subtracting (and, for luminance, adding) cone signals; this is the actual physiological basis of color perception, more efficient than reading raw cone outputs directly.
- **Checker-shadow illusion:** A classic demonstration that two objectively identical gray squares can be perceived as different shades (one as "white") due to surrounding contextual shading — illustrating that vision prioritizes relative contrast over absolute brightness.
- **Color discriminability factors:** Three factors that limit how easily two colors can be told apart: paleness/saturation, patch size, and spatial separation.
- **Color-blindness:** A condition where one or more color-opponent channels malfunction, making specific color pairs hard to distinguish (not a loss of all color vision); affects ~8% of men and ~0.5% of women, most commonly as red/green color-blindness.
- **Color wheel:** A circular arrangement of primary (yellow, red, blue), secondary, and tertiary colors (12 total) used to systematically choose color combinations that work well together.
- **Complementary colors:** Colors directly opposite each other on the color wheel; best used as a dominant color plus an accent, given their strong contrast.
- **Triad (basic):** Three colors equally spaced around the color wheel, forming a pleasing combination (e.g., the primary triad red/yellow/blue).
- **Split-complement triad:** A variant triad formed by taking a base color and the two colors adjacent to its direct complement (rather than the complement itself).
- **Analogous colors:** Colors that sit next to each other on the wheel, sharing a common undertone and thus harmonizing naturally.
- **Hue, shade, tint:** Hue is the pure color; shade is hue + black (darker); tint is hue + white (lighter/paler).
- **Monochromatic palette:** A palette built from a single hue plus any of its tints and shades.
- **Color palette:** The specific, limited set of colors (recommended: 3) chosen for a given design, ideally derived from one of the five color-wheel relationships (complementary, basic triad, split-complement, analogous, or monochromatic).
- **60-30-10 rule:** A practical palette-application guideline: 60% dominant color, 30% secondary/contrasting color, 10% accent color.

## Notes on lecture examples (illustrative, referenced but not exhaustively detailed in source text)
- 20-second color-patch afterimage experiment (opponent-process demonstration).
- Checker-shadow illusion (squares A and B, same gray, perceived differently due to shading).
- White/pale-yellow vs. white/yellow/blue reservation-step indicators (poor vs. improved discriminability).
- Visited/unvisited hyperlink color contrast example (two shades of blue, low discriminability region).
- Color-blindness comparison visual across normal vision and three color-blind variants with approximate prevalence rates (source: Alex Bigman, 99designs.com).
- Graph using shades of a single color for accessibility.
- Nature photography (Unsplash, photographers Daniel Roe, Dave Hoefler, eberhard grossgasteiger) as color-palette inspiration.
- 60-30-10 rule pie/area diagrams illustrating proportion allocation across a design.

---

*End of Lecture 6 content. This document was generated by extracting and restructuring all text content from the original 48-slide PowerPoint deck. Slides that repeated the same guideline text alongside different illustrative images (e.g., the 60-30-10 rule shown across three consecutive slides) have been consolidated into single unified sections above rather than repeated verbatim.*
