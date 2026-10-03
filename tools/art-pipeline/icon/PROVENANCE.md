# Where the icon's picture came from

`source.png` is the Android app's icon, unedited: 1254 by 1254, SHA-256
`2fdae7eb15b8ffb721525b2fe32ac7a12fd592b73fce924f78b1b8fa828b9234`. Every icon file is written
from it by `pnpm art:icon` (`../icon.ts`). Its row in the asset register is in
[`docs/ASSETS.md`](../../../docs/ASSETS.md).

## How it was made

**Generated, not modelled.** Shantanu asked Codex (OpenAI's coding agent, in its desktop app, on
his ChatGPT account) for icon options on 3 October 2026. Codex used its image tool, OpenAI's image
model, in two steps. It did not use Blender, and there is no `.blend` file; Codex said so when he
asked. The prompts below are as Codex recorded them in its session, verbatim.

### 1. The concept, 13:10 IST (07:40:39 UTC), the third of four

Given three pictures as references:

1. A stock logo of a shield with a medical cross and viruses, watermarked by Shutterstock, pasted by
   Shantanu from the internet as a starting point.
2. A stock flat icon of a shield with a cross and viruses, pasted the same way.
3. The game's own virus, `tools/art-pipeline/clay/renders/card/virus-ENV.webp`, a Blender render
   made in this repository.

> Create ONE square premium mobile game app icon concept for Immunity Wars, no lettering. Reference
> inputs 1 and 2 are brainstorming composition references ONLY: create an ORIGINAL composition, no
> copied stock logo, no watermarks, no cross emblem unless specified. Reference 3 is the game's
> actual virus: match its coral-red spherical body and softly rounded slender spikes with rounded
> tips, no face or eyes. Concept: A thick teal shield tilted diagonally in a dynamic blocking pose,
> one coral spiked virus contacting its right outer edge, two small warm gold stylized impact
> sparks at the contact. Shield has a pale mint inset face and deep teal rim. Virus stays intact.
> Energetic mobile strategy game emblem. Style: beautifully rendered tactile soft clay 3D, chunky
> rounded bevels, restrained handmade surfaces, soft studio key light upper left, gentle ambient
> occlusion, polished friendly science strategy game, consistent with Blender-rendered clay game
> pieces. Background full-bleed solid very dark teal #12363B with subtle lighting only. Objects
> occupy 76-82 percent of image and stay well within edges so phone crops work. Excellent clarity
> at 48 pixels. Saturated mint, coral and restrained gold palette. No text, no letters, no
> caption, no border, no pre-rounded outer corners, no medical plus, no watermark. Render a
> finished standalone square icon, not a mockup or comparison sheet.

### 2. The faces, 13:26 IST (07:56:55 UTC): this picture

An edit of the concept above, given that picture alone. The second of three variations Codex made
on his request for a face on the shield and one on the virus too.

> Edit this approved mobile game icon with minimal changes. Add a heroic fighting face to the
> shield's mint inset: two expressive eyes, bold determined eyebrows, small confident smirk, looking
> toward the virus on right. ALSO give the coral virus a mischievous rival face, two eyes under
> tilted brows and a small clenched cartoon mouth. Put the virus face on the visible
> upper-left/front hemisphere aimed toward the shield, using its curved surface and three-quarter
> perspective; do not rotate or relocate the virus. Use small existing gaps between spikes for
> facial features; preserve spike structure. Expressive friendly game rivalry, no horror, no fangs.
> Preserve the original composition precisely: same large tilted beveled teal shield on left, coral
> round spiked virus on right at contact, BOTH original gold impact sparks, dark teal background,
> object size and positions, silhouette, camera angle, lighting, mint-coral-gold palette and soft
> 3D clay texture. Add facial features only as requested. Do not redesign objects or add limbs,
> weapons, accessories or text. Square full-bleed image, no labels, no watermark, no frame. This is
> a playful symbolic game mascot, not an anatomical illustration.

## What it shares with the stock references

**The idea only:** a shield beside a virus, which is a common way of picturing immunity. It has no
cross, no lettering and no flat line style; the shield's shape, its angle, the sparks, the faces
and the clay surface are not in either reference. The stock pictures are not in this repository.

## Terms

OpenAI's Terms of Use (effective 1 January 2026, read 3 October 2026): as between the user and
OpenAI, the user owns the Output, and OpenAI assigns to the user its right, title and interest in
it, if any. Whether anyone holds a copyright in a generated picture is the unsettled question of
the register's Resolution log; no content licence is declared, as before.
