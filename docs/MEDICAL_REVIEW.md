# The Immunity Wars — every scientific claim the app makes

**GENERATED FILE — do not edit by hand.** Regenerate with `pnpm medical:review`. A hand edit
here is deleted by the next run, silently ([`FINDINGS.md`](FINDINGS.md) #65). **Reviewer notes
and verdicts belong in [`MEDICAL_REVIEW_GUIDE.md`](MEDICAL_REVIEW_GUIDE.md)**, which is written
by hand and which the generator never touches.

Generated 2026-09-09 from `packages/content/src`, pack `immunity-wars-core`,
content version `1.0.0`, rules version
`3.1.0`.

**How to read a row.** Every claim has a stable id like `DISEASE/Rabies/Treat`. Quoting the id
is enough for a correction to be found and applied; no file paths or line numbers are needed.

**Two kinds of claim, and the second is the one that is easy to miss:**

- **PROSE** — a sentence that asserts something. It can be read and judged directly.
- **TABLE** — a claim the RULES make by working a particular way. Nobody wrote
  "rabies is neurotropic" as a sentence, but the game asserts it every time it is played,
  because rabies can only be sent to the brain. A TABLE claim is as reviewable as a
  sentence and is stated here in words so that it can be reviewed.

**What we are asking.** Not whether a simplification is complete — everything here is
compressed for a 13-year-old, and "incomplete" is expected. The question is whether a claim is
**wrong**, or **misleading in a way that would matter**. A separate and more important question
is flagged in the guide: whether anything here could lead a young reader to act badly on real
health information.

---

## Contents

| Section | What is in it |
|---|---|
| A | The seven immune cells |
| B | The nine pathogen types |
| C | The six antigen classes |
| D | The seven organs |
| E | The six routes of entry |
| F | **The 106 diseases — the largest section, and the highest-risk claims** |
| G | Crisis and rare events |
| H | The fifteen "why it works this way" boxes |
| I | How to play — the in-app explanation |
| J | Text shown during play |


## A. The seven immune cells

Each cell card carries five prose fields. The display name is what a player calls the piece all game, so a wrong name is repeated more often than any sentence. `speed` is how many board steps it moves per action.

| # | Claim id | Kind | The claim | Lives in |
|---|---|---|---|---|
| 1 | `CELL/macrophage/name` | TABLE | The piece named **Monocyte** in the app is the real-world **macrophage**. | labels/labels.json, rules/tuning.json |
| 2 | `CELL/macrophage/speed` | TABLE | **Monocyte** moves 1 step(s) per move action. | rules/tuning.json |
| 3 | `CELL/macrophage/role` | PROSE | **Monocyte**, what it does: The big eater. It engulfs one pathogen at a time, the first each turn free and then 1 Action Point each, and every meal raises antigen presentation, the bridge that switches on the adaptive cells. | labels/cells.json |
| 4 | `CELL/macrophage/home` | PROSE | **Monocyte**, where it comes from and lives: Made in the marrow. It circulates in the blood as a monocyte and enters tissue where it is needed, maturing into a macrophage there. In the game it starts in the Bloodstream and goes wherever you send it. | labels/cells.json |
| 5 | `CELL/macrophage/bestAgainst` | PROSE | **Monocyte**, what it is good against: Viruses and coated bacteria on its own space, and blood-stage malaria. It cannot swallow a worm or a full-strength protozoan. Those are physically too big and must be struck down first. | labels/cells.json |
| 6 | `CELL/macrophage/deficiency` | PROSE | **Monocyte**, what happens without it: Without phagocytes, bacteria and fungi are never cleared, and nothing is ever presented to the adaptive team, so antibodies and killer cells never get their start. | labels/cells.json |
| 7 | `CELL/macrophage/fact` | PROSE | **Monocyte**, the card fact: A macrophage can engulf tuberculosis bacteria and still fail to kill them. It takes a helper T-cell signal to finish the job, which is why tuberculosis wakes up when helper T-cell counts fall. | labels/cells.json |
| 8 | `CELL/neutrophil/name` | TABLE | The piece named **Neutrophil** in the app is the real-world **neutrophil**. | labels/labels.json, rules/tuning.json |
| 9 | `CELL/neutrophil/speed` | TABLE | **Neutrophil** moves 2 step(s) per move action. | rules/tuning.json |
| 10 | `CELL/neutrophil/role` | PROSE | **Neutrophil**, what it does: The first responder. It swarms a site and destroys every living microbe standing there at once. Then it is spent, and the marrow takes four turns to replace it, or two with a primed Helper T-Cell in the Bloodstream. | labels/cells.json |
| 11 | `CELL/neutrophil/home` | PROSE | **Neutrophil**, where it comes from and lives: The bloodstream, in enormous numbers: the most abundant white cell in the body, made and replaced by the marrow continuously. In the game it starts in the Bloodstream and moves two steps per Action Point. | labels/cells.json |
| 12 | `CELL/neutrophil/bestAgainst` | PROSE | **Neutrophil**, what it is good against: A swarm: bacteria, fungi and viruses standing together on one space. Not worms, not toxins, and nothing hiding inside one of your own cells. | labels/cells.json |
| 13 | `CELL/neutrophil/deficiency` | PROSE | **Neutrophil**, what happens without it: Neutropenia, too few neutrophils, as after chemotherapy, leaves the body open to bacterial and fungal infections that are normally stopped within hours. | labels/cells.json |
| 14 | `CELL/neutrophil/fact` | PROSE | **Neutrophil**, the card fact: Neutrophils live only a day or so, and the marrow makes about a hundred billion of them every day. Their NETs are webs of their own DNA, thrown out to trap and kill microbes. | labels/cells.json |
| 15 | `CELL/bcell/name` | TABLE | The piece named **B-Cell** in the app is the real-world **bcell**. | labels/labels.json, rules/tuning.json |
| 16 | `CELL/bcell/speed` | TABLE | **B-Cell** moves 1 step(s) per move action. | rules/tuning.json |
| 17 | `CELL/bcell/role` | PROSE | **B-Cell**, what it does: The antibody factory. It produces antibodies of one class at a time; the antibodies then coat or neutralise pathogens of that class wherever they are. | labels/cells.json |
| 18 | `CELL/bcell/home` | PROSE | **B-Cell**, where it comes from and lives: Made in the marrow (the B). In the game it starts in the Bloodstream and produces from wherever it stands, best beside a primed Helper T-Cell, which adds one antibody per action. | labels/cells.json |
| 19 | `CELL/bcell/bestAgainst` | PROSE | **B-Cell**, what it is good against: Anything with an antigen class. Its antibodies tag bacteria, worms and parasites so other cells can attack them, and neutralise viruses and toxins outright. A novel antigen is out of reach until clonal selection finds the one clone that fits it. | labels/cells.json |
| 20 | `CELL/bcell/deficiency` | PROSE | **B-Cell**, what happens without it: No B-cells means no antibodies: bacteria and toxins outside cells run unchecked, and there is nothing for a vaccine to build on. The human version is X-linked agammaglobulinaemia. | labels/cells.json |
| 21 | `CELL/bcell/fact` | PROSE | **B-Cell**, the card fact: Your body already carries B-cells for antigens it has never met. Finding the one that fits a new pathogen, clonal selection, is why a first response takes days, and why the second time is fast. | labels/cells.json |
| 22 | `CELL/tcell/name` | TABLE | The piece named **Killer T-Cell** in the app is the real-world **tcell**. | labels/labels.json, rules/tuning.json |
| 23 | `CELL/tcell/speed` | TABLE | **Killer T-Cell** moves 1 step(s) per move action. | rules/tuning.json |
| 24 | `CELL/tcell/role` | PROSE | **Killer T-Cell**, what it does: The sniper. It kills infected cells, anything hiding inside one of your own cells, from a distance, and it never misses. | labels/cells.json |
| 25 | `CELL/tcell/home` | PROSE | **Killer T-Cell**, where it comes from and lives: Matured in the thymus (the T), then circulating. In the game it starts in the Bloodstream and strikes along its own route or branch within its range: 3 on Training, 2 on Normal and Hard, +1 beside a primed Helper T-Cell. | labels/cells.json |
| 26 | `CELL/tcell/bestAgainst` | PROSE | **Killer T-Cell**, what it is good against: Hidden viruses and the protozoa that live inside cells: Toxoplasma, Chagas, liver-stage malaria, a parasite inside a resident macrophage. Useless against anything out in the open. | labels/cells.json |
| 27 | `CELL/tcell/deficiency` | PROSE | **Killer T-Cell**, what happens without it: Without killer T-cells, a virus that hides inside cells is never cleared, because the infected cell is never destroyed. Reactivating viruses like shingles are what a weakened T-cell system lets through. | labels/cells.json |
| 28 | `CELL/tcell/fact` | PROSE | **Killer T-Cell**, the card fact: A killer T-cell recognises an infected cell by the fragments of virus that cell displays on its own surface. The cell reports its own infection. | labels/cells.json |
| 29 | `CELL/helper/name` | TABLE | The piece named **Helper T-Cell** in the app is the real-world **helper**. | labels/labels.json, rules/tuning.json |
| 30 | `CELL/helper/speed` | TABLE | **Helper T-Cell** moves 1 step(s) per move action. | rules/tuning.json |
| 31 | `CELL/helper/role` | PROSE | **Helper T-Cell**, what it does: The conductor. It kills nothing and takes no attacking action; it licenses other cells by standing with them, but only once it has been primed by antigen presentation. | labels/cells.json |
| 32 | `CELL/helper/home` | PROSE | **Helper T-Cell**, where it comes from and lives: The Bloodstream at the start. Where it stands afterwards is the whole game: beside the B-Cell, beside the Killer T-Cell, beside the Eosinophil, or parked in the blood. | labels/cells.json |
| 33 | `CELL/helper/bestAgainst` | PROSE | **Helper T-Cell**, what it is good against: Nothing directly. Beside the B-Cell: +1 antibody per action. Beside the Killer T-Cell: +1 range. Beside the Eosinophil: +1 step. Standing in the Bloodstream: the Neutrophil returns in 2 turns instead of 4. | labels/cells.json |
| 34 | `CELL/helper/deficiency` | PROSE | **Helper T-Cell**, what happens without it: HIV destroys helper T-cells, and the whole adaptive system collapses with them. That is what AIDS is: not the virus's own damage but the loss of the coordinating layer, leaving the body open to infections it would normally handle easily. | labels/cells.json |
| 35 | `CELL/helper/fact` | PROSE | **Helper T-Cell**, the card fact: Its three bonuses are real T-helper subsets: Th2 releases IL-5 to recruit eosinophils; Th17 releases IL-17, which drives G-CSF and steps up neutrophil production in the marrow; and direct contact is what licenses a B-cell to make antibodies properly. | labels/cells.json |
| 36 | `CELL/nk/name` | TABLE | The piece named **NK Cell** in the app is the real-world **nk**. | labels/labels.json, rules/tuning.json |
| 37 | `CELL/nk/speed` | TABLE | **NK Cell** moves 2 step(s) per move action. | rules/tuning.json |
| 38 | `CELL/nk/role` | PROSE | **NK Cell**, what it does: The innate killer. It needs no antigen and no priming, so it attacks an infected cell at once, but it rolls a die, and hits on a 3 or more. | labels/cells.json |
| 39 | `CELL/nk/home` | PROSE | **NK Cell**, where it comes from and lives: The bloodstream, patrolling on its own. In the game it starts in the Bloodstream, moves two steps per Action Point, and reaches one step around it. | labels/cells.json |
| 40 | `CELL/nk/bestAgainst` | PROSE | **NK Cell**, what it is good against: The same hidden targets as the Killer T-Cell, viruses and protozoa inside your own cells, earlier and less reliably. Its reach is one step; the Killer T-Cell reaches further and never misses. | labels/cells.json |
| 41 | `CELL/nk/deficiency` | PROSE | **NK Cell**, what happens without it: People born without NK cells suffer repeated, severe herpesvirus infections: the viruses that hide inside cells early, before the T-cells are ready. | labels/cells.json |
| 42 | `CELL/nk/fact` | PROSE | **NK Cell**, the card fact: NK cells kill cells that have stopped showing their identity papers. A virus that hides a cell's surface markers from T-cells makes that cell a target for NK cells instead. | labels/cells.json |
| 43 | `CELL/eosinophil/name` | TABLE | The piece named **Eosinophil** in the app is the real-world **eosinophil**. | labels/labels.json, rules/tuning.json |
| 44 | `CELL/eosinophil/speed` | TABLE | **Eosinophil** moves 1 step(s) per move action. | rules/tuning.json |
| 45 | `CELL/eosinophil/role` | PROSE | **Eosinophil**, what it does: The anti-parasite specialist. It strikes a coated worm or parasite for 2 damage, or degranulates for 3, enough to kill a worm outright, at the price of burning the organ it stands in and four turns spent. | labels/cells.json |
| 46 | `CELL/eosinophil/home` | PROSE | **Eosinophil**, where it comes from and lives: Made in the marrow, circulating in small numbers and recruited to wherever a parasite is. In the game it starts in the Bloodstream and gains a step beside a primed Helper T-Cell. That is IL-5. | labels/cells.json |
| 47 | `CELL/eosinophil/bestAgainst` | PROSE | **Eosinophil**, what it is good against: Worms and large parasites, once antibodies have coated them. It cannot touch an uncoated one, and it is no use against bacteria or viruses. | labels/cells.json |
| 48 | `CELL/eosinophil/deficiency` | PROSE | **Eosinophil**, what happens without it: Without eosinophils the body loses its specialist weapon against worms, and some worm infections take longer to clear. Where they are over-active, the same granules turn on the body's own airways. That is asthma and allergy. | labels/cells.json |
| 49 | `CELL/eosinophil/fact` | PROSE | **Eosinophil**, the card fact: Eosinophil granules are indiscriminate poison. That is why parasitic infections cause chronic inflammation and scarring, and why degranulating should feel like a decision rather than a free hit. | labels/cells.json |

## B. The nine pathogen types

The type decides how a pathogen behaves for the whole game: how much killing it takes (`hp`), how fast it advances, and what can beat it. "Not alive" is a real biological claim about toxins and venoms and it changes which cells can act on them.

| # | Claim id | Kind | The claim | Lives in |
|---|---|---|---|---|
| 50 | `TYPE/virus/beat` | PROSE | **Virus** — how it is beaten: Antibody neutralises it, or the Monocyte engulfs it. If it hides inside a cell, only the Killer T-Cell or NK Cell can reach it. | labels/labels.json |
| 51 | `TYPE/virus/hp` | TABLE | A **Virus** takes 1 hit(s) to kill and advances 1 step(s) per spread. | rules/invaders.json |
| 52 | `TYPE/hidden/beat` | PROSE | **Hidden Virus** — how it is beaten: It is INSIDE one of your cells. Antibodies cannot reach it there. Killer T-Cell (never misses) or NK Cell (d6 3+). Not all of these are viruses: Toxoplasmosis and Chagas disease are PROTOZOA that live inside your cells, which is why a Killer T-Cell is the answer for them too. | labels/labels.json |
| 53 | `TYPE/hidden/hp` | TABLE | A **Hidden Virus** takes 1 hit(s) to kill and advances 1 step(s) per spread. | rules/invaders.json |
| 54 | `TYPE/bacteria/beat` | PROSE | **Bacteria** — how it is beaten: Coat it with a matching antibody, then engulf it. Or trap the swarm in a Neutrophil NET. It divides if you ignore it! | labels/labels.json |
| 55 | `TYPE/bacteria/hp` | TABLE | A **Bacteria** takes 1 hit(s) to kill and advances 1 step(s) per spread. | rules/invaders.json |
| 56 | `TYPE/toxin/beat` | PROSE | **Toxin** — how it is beaten: It is NOT alive. No cell can eat it, trap it or snipe it. ANTITOXIN antibodies are the only defence (2 AP to neutralise). | labels/labels.json |
| 57 | `TYPE/toxin/hp` | TABLE | A **Toxin** takes 1 hit(s) to kill and advances 2 step(s) per spread. | rules/invaders.json |
| 58 | `TYPE/venom/beat` | PROSE | **Venom** — how it is beaten: It is NOT alive and acts far too fast for your B-cells. Only an ANTIVENOM dose works. You cannot make antibodies in time. | labels/labels.json |
| 59 | `TYPE/venom/hp` | TABLE | A **Venom** takes 1 hit(s) to kill and advances 2 step(s) per spread. | rules/invaders.json |
| 60 | `TYPE/fungus/beat` | PROSE | **Fungus** — how it is beaten: It CANNOT be coated. Antibodies do not opsonise fungi here. The Monocyte engulfs it directly (it has 2 HP, so that chips it), and a Neutrophil NET kills it outright. Fungi are an INNATE problem: neutrophils and macrophages do this work. | labels/labels.json |
| 61 | `TYPE/fungus/hp` | TABLE | A **Fungus** takes 2 hit(s) to kill and advances 1 step(s) per spread. | rules/invaders.json |
| 62 | `TYPE/worm/beat` | PROSE | **Worm** — how it is beaten: Too big to swallow and immune to NETs. COAT it with an antibody, then the Eosinophil strikes (2 dmg) or degranulates (3 dmg, 2 AP, and it burns the organ). | labels/labels.json |
| 63 | `TYPE/worm/hp` | TABLE | A **Worm** takes 3 hit(s) to kill and advances 1 step(s) per spread. | rules/invaders.json |
| 64 | `TYPE/malaria/beat` | PROSE | **Malaria** — how it is beaten: In the blood: antibodies or the Monocyte. Inside liver cells: only the Killer T-Cell or NK Cell can reach it. | labels/labels.json |
| 65 | `TYPE/malaria/hp` | TABLE | A **Malaria** takes 1 hit(s) to kill and advances 1 step(s) per spread. | rules/invaders.json |
| 66 | `TYPE/parasite/beat` | PROSE | **Parasite** — how it is beaten: Coat it, then STRIKE it down with the Eosinophil (2 dmg) or Monocyte (1 dmg). Once it is on its last HP the Monocyte can finally engulf it. NETs do not hold it. | labels/labels.json |
| 67 | `TYPE/parasite/hp` | TABLE | A **Parasite** takes 2 hit(s) to kill and advances 1 step(s) per spread. | rules/invaders.json |
| 68 | `TYPE/notAlive` | TABLE | These are treated as **not living organisms**: toxin, venom. They cannot be killed, only neutralised or removed. | rules/invaders.json |

## C. The six antigen classes

Antibodies in this game are made against a CLASS, not against one disease, and the class is what makes an antibody work on a pathogen the player has not met. Two questions: is the class description right, and is each disease's class assignment right?

| # | Claim id | Kind | The claim | Lives in |
|---|---|---|---|---|
| 69 | `CLASS/ENV/bio` | PROSE | **Enveloped virus** (ENV): Wrapped in a stolen piece of your own cell membrane, studded with spike proteins. Antibodies target the spikes. | rules/families.json |
| 70 | `CLASS/ENV/members` | TABLE | Assigned to **Enveloped virus** (28): Influenza, COVID-19, RSV, Measles, Mumps, Rubella, Smallpox, Nipah, Chickenpox, Glandular fever, Cytomegalovirus, Dengue, Chikungunya, Japanese encephalitis, Yellow fever, Zika, West Nile fever, Rabies, HIV, Hepatitis B, Hepatitis C, Cold sore, Ebola, Shingles, Dengue (ADE), Genital herpes, Hepatitis D, Molluscum contagiosum | rules/families.json |
| 71 | `CLASS/NAK/bio` | PROSE | **Naked virus** (NAK): No envelope. A bare protein shell. Tough, survives on surfaces, and antibodies must grip the capsid itself. | rules/families.json |
| 72 | `CLASS/NAK/members` | TABLE | Assigned to **Naked virus** (9): Common cold, Hand-foot-and-mouth, Human papillomavirus, Rotavirus, Hepatitis A, Hepatitis E, Norovirus, Polio, Conjunctivitis | rules/families.json |
| 73 | `CLASS/EXB/bio` | PROSE | **Extracellular bacterium** (EXB): Lives outside your cells, often behind a slimy capsule. Antibodies opsonise it so phagocytes can grip it. | rules/families.json |
| 74 | `CLASS/EXB/members` | TABLE | Assigned to **Extracellular bacterium** (21): Whooping cough, Meningitis, Pneumonia, Strep throat, Lyme disease, Plague, Tetanus, MRSA, Cellulitis, Leptospirosis, Gas gangrene, Syphilis, Typhoid, Cholera, Food poisoning, Stomach ulcer (H. pylori), Pneumococcal pneumonia, Gonorrhoea, Cannula infection, Impetigo, Endocarditis | rules/families.json |
| 75 | `CLASS/ICB/bio` | PROSE | **Intracellular bacterium** (ICB): Hides INSIDE your cells, where antibodies struggle to follow. This is why TB is so hard to kill. | rules/families.json |
| 76 | `CLASS/ICB/members` | TABLE | Assigned to **Intracellular bacterium** (10): Tuberculosis, Leprosy, Legionnaires' disease, Scrub typhus, Brucellosis, Dysentery, Listeria, Tuberculosis (reactivated), Chlamydia, Trachoma | rules/families.json |
| 77 | `CLASS/TOX/bio` | PROSE | **Toxin (antitoxin)** (TOX): Not alive at all. Cannot be eaten. Antibodies (antitoxin) are the ONLY defence. | rules/families.json |
| 78 | `CLASS/TOX/members` | TABLE | Assigned to **Toxin (antitoxin)** (11): Diphtheria, Anthrax, Botulism, Shiga toxin (E. coli O157), Snake venom, Russell's viper venom, Red scorpion sting, Tetanus toxin, Cholera toxin, Clostridial toxin, Diphtheria toxin | rules/families.json |
| 79 | `CLASS/EUK/bio` | PROSE | **Eukaryotic parasite** (EUK): Fungi, worms and protozoa. Complex cells like ours, so they are hard to target without harming yourself. | rules/families.json |
| 80 | `CLASS/EUK/members` | TABLE | Assigned to **Eukaryotic parasite** (27): Mucormycosis, Aspergillosis, Cryptococcus, Pneumocystis pneumonia, Candida, Histoplasmosis, Malaria, Malaria (blood), Malaria (relapse), Kala-azar, Sleeping sickness, Chagas disease, Amoebiasis, Giardia, Toxoplasmosis, Roundworm, Hookworm, Tapeworm, Whipworm, Filariasis, Schistosomiasis, Guinea worm, Trichomoniasis, Transfusion malaria, Catheter sepsis, Scabies, Ringworm | rules/families.json |

## D. The seven organs

Each organ carries a prose note on how infection reaches it, a resident macrophage with a real name, and an `effect` — what the body loses when that organ is damaged. The effect is a physiological claim stated as a game penalty.

| # | Claim id | Kind | The claim | Lives in |
|---|---|---|---|---|
| 81 | `ORGAN/heart/bio` | PROSE | **Heart**: The heart itself can be infected. Staph on the valves (endocarditis), Lyme carditis, viral myocarditis. Germs only passing through the bloodstream do NOT infect it; only germs that target heart tissue do. | rules/board.json |
| 82 | `ORGAN/heart/effect` | PROSE | When the **Heart** is damaged, the body suffers: -1 Action Point (weak pump) | rules/board.json |
| 83 | `ORGAN/heart/resident` | TABLE | The resident macrophage of the **Heart** is called the **Cardiac macrophage**, and it can take 3 damage before the organ is lost. | rules/board.json |
| 84 | `ORGAN/lungs/bio` | PROSE | **Lungs**: Damaged lungs mean poor gas exchange. The whole body weakens. | rules/board.json |
| 85 | `ORGAN/lungs/effect` | PROSE | When the **Lungs** is damaged, the body suffers: -1 Action Point | rules/board.json |
| 86 | `ORGAN/lungs/resident` | TABLE | The resident macrophage of the **Lungs** is called the **Alveolar macrophage**, and it can take 3 damage before the organ is lost. | rules/board.json |
| 87 | `ORGAN/liver/bio` | PROSE | **Liver**: The liver makes many defence proteins; damage it and antibody supply falls. | rules/board.json |
| 88 | `ORGAN/liver/effect` | PROSE | When the **Liver** is damaged, the body suffers: Antibody storage capped at 2 per class | rules/board.json |
| 89 | `ORGAN/liver/resident` | TABLE | The resident macrophage of the **Liver** is called the **Kupffer cell**, and it can take 3 damage before the organ is lost. | rules/board.json |
| 90 | `ORGAN/marrow/bio` | PROSE | **Bone Marrow**: All immune cells are made in the marrow. | rules/board.json |
| 91 | `ORGAN/marrow/effect` | PROSE | When the **Bone Marrow** is damaged, the body suffers: Neutrophil cannot regenerate | rules/board.json |
| 92 | `ORGAN/marrow/resident` | TABLE | The resident macrophage of the **Bone Marrow** is called the **Marrow macrophage**, and it can take 3 damage before the organ is lost. | rules/board.json |
| 93 | `ORGAN/brain/bio` | PROSE | **Brain**: Immune privilege: the blood-brain barrier keeps immune cells out, so it is hard to defend and cannot take much damage. | rules/board.json |
| 94 | `ORGAN/brain/effect` | PROSE | When the **Brain** is damaged, the body suffers: None. But fragile & slow to defend | rules/board.json |
| 95 | `ORGAN/brain/resident` | TABLE | The resident macrophage of the **Brain** is called the **Microglia**, and it can take 2 damage before the organ is lost. | rules/board.json |
| 96 | `ORGAN/spleen/bio` | PROSE | **Spleen**: The spleen filters encapsulated bacteria from the blood. Without it, bacterial infection runs wild. | rules/board.json |
| 97 | `ORGAN/spleen/effect` | PROSE | When the **Spleen** is damaged, the body suffers: Bacteria divide on 1 to 3 | rules/board.json |
| 98 | `ORGAN/spleen/resident` | TABLE | The resident macrophage of the **Spleen** is called the **Splenic macrophage**, and it can take 3 damage before the organ is lost. | rules/board.json |
| 99 | `ORGAN/kidneys/bio` | PROSE | **Kidneys**: Damaged kidneys leak antibodies into the urine. A real cause of secondary immunodeficiency. | rules/board.json |
| 100 | `ORGAN/kidneys/effect` | PROSE | When the **Kidneys** is damaged, the body suffers: Lose 1 antibody each turn | rules/board.json |
| 101 | `ORGAN/kidneys/resident` | TABLE | The resident macrophage of the **Kidneys** is called the **Renal macrophage**, and it can take 3 damage before the organ is lost. | rules/board.json |

## E. The six routes of entry

The route is where a pathogen starts on the board, so it is the claim "this is how this disease gets into a person". The lymph group decides which routes drain to a shared lymph node, which is an anatomical claim about lymphatic drainage.

| # | Claim id | Kind | The claim | Lives in |
|---|---|---|---|---|
| 102 | `ROUTE/nose/lymph` | TABLE | The **Nose** route is 5 steps from the bloodstream, and drains to the **mucosal** lymph group, shared with: gut, contact. | rules/board.json |
| 103 | `ROUTE/nose/diseases` | TABLE | Enters by **Nose** (26): Influenza, Common cold, COVID-19, RSV, Measles, Mumps, Rubella, Smallpox, Nipah, Hand-foot-and-mouth, Chickenpox, Glandular fever, Cytomegalovirus, Tuberculosis, Whooping cough, Meningitis, Pneumonia, Strep throat, Leprosy, Legionnaires' disease, Diphtheria, Mucormycosis, Aspergillosis, Cryptococcus, Pneumocystis pneumonia, Pathogen X | rules/deck.json |
| 104 | `ROUTE/gut/lymph` | TABLE | The **Gut** route is 5 steps from the bloodstream, and drains to the **mucosal** lymph group, shared with: nose, contact. | rules/board.json |
| 105 | `ROUTE/gut/diseases` | TABLE | Enters by **Gut** (20): Typhoid, Cholera, Dysentery, Food poisoning, Listeria, Stomach ulcer (H. pylori), Rotavirus, Hepatitis A, Hepatitis E, Norovirus, Polio, Botulism, Shiga toxin (E. coli O157), Roundworm, Tapeworm, Whipworm, Amoebiasis, Giardia, Toxoplasmosis, Candida | rules/deck.json |
| 106 | `ROUTE/contact/lymph` | TABLE | The **Contact** route is 5 steps from the bloodstream, and drains to the **mucosal** lymph group, shared with: nose, gut. | rules/board.json |
| 107 | `ROUTE/contact/diseases` | TABLE | Enters by **Contact** (13): HIV, Syphilis, Human papillomavirus, Gonorrhoea, Chlamydia, Genital herpes, Trichomoniasis, Scabies, Ringworm, Impetigo, Trachoma, Conjunctivitis, Molluscum contagiosum | rules/deck.json |
| 108 | `ROUTE/wound/lymph` | TABLE | The **Wound** route is 5 steps from the bloodstream, and drains to the **skin** lymph group, shared with: bite. | rules/board.json |
| 109 | `ROUTE/wound/diseases` | TABLE | Enters by **Wound** (13): Tetanus, MRSA, Cellulitis, Leptospirosis, Gas gangrene, Brucellosis, Cold sore, Ebola, Anthrax, Hookworm, Schistosomiasis, Guinea worm, Histoplasmosis | rules/deck.json |
| 110 | `ROUTE/bite/lymph` | TABLE | The **Bite** route is 5 steps from the bloodstream, and drains to the **skin** lymph group, shared with: wound. | rules/board.json |
| 111 | `ROUTE/bite/diseases` | TABLE | Enters by **Bite** (18): Dengue, Chikungunya, Japanese encephalitis, Yellow fever, Zika, West Nile fever, Rabies, Chagas disease, Lyme disease, Plague, Scrub typhus, Malaria, Kala-azar, Sleeping sickness, Filariasis, Snake venom, Russell's viper venom, Red scorpion sting | rules/deck.json |
| 112 | `ROUTE/blood/lymph` | TABLE | The **Blood** route is 3 steps from the bloodstream, and drains to the **no** lymph group. | rules/board.json |
| 113 | `ROUTE/blood/diseases` | TABLE | Enters by **Blood** (7): Hepatitis B, Hepatitis C, Hepatitis D, Transfusion malaria, Catheter sepsis, Cannula infection, Endocarditis | rules/deck.json |

## F. The 106 diseases

**This is the largest section and it carries the highest-risk claims in the app.** The two fields to read first on every card are **Prevent** and **Treat**: they are the only place the app comes close to saying what a person should do, they are read by children, and a wrong one is the only kind of error here that could do harm outside the game.

Each disease is one block. `Causes`, `Prevent` and `Treat` are prose. `Infects`, `Class`, `Type` and `Route` are claims the rules make. The four stat bars are 1 to 5.


### Influenza

**Type** Virus · **Route** Nose · **Class** ENV · **Infects** lungs · **Contagion** 5/5 · **Severity** 3/5 · **Speed** 4/5 · **Cunning** 4/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Influenza/Discovered` | PROSE | **Discovered**: Virus isolated 1933; the 1918 pandemic killed ~50 million. |
| `DISEASE/Influenza/Causes` | PROSE | **Causes**: Fever, aches, cough; can lead to pneumonia and myocarditis. |
| `DISEASE/Influenza/Found` | PROSE | **Found**: Worldwide, in yearly winter waves. |
| `DISEASE/Influenza/Prevent` | PROSE | **Prevent**: Annual flu vaccine. It changes because the virus mutates fast. |
| `DISEASE/Influenza/Treat` | PROSE | **Treat**: Rest, fluids; antivirals for high-risk patients. |
| `DISEASE/Influenza/fact` | PROSE | **Card fact**: Flu mutates fast. Last year's antibodies may not fit. |
| `DISEASE/Influenza/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Influenza/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Influenza/route` | TABLE | It enters the body by the **Nose**, and is a **Virus**. |
| `DISEASE/Influenza/stats` | TABLE | Contagion 5/5, severity 3/5, speed 4/5, cunning 4/5; tier Common. |

### Common cold

**Type** Virus · **Route** Nose · **Class** NAK · **Infects** lungs · **Contagion** 5/5 · **Severity** 1/5 · **Speed** 4/5 · **Cunning** 3/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Common cold/Discovered` | PROSE | **Discovered**: Rhinovirus identified in the 1950s. |
| `DISEASE/Common cold/Causes` | PROSE | **Causes**: Runny nose, sore throat, sneezing. |
| `DISEASE/Common cold/Found` | PROSE | **Found**: Everywhere, all year. |
| `DISEASE/Common cold/Prevent` | PROSE | **Prevent**: Handwashing. No vaccine. Over 100 strains. |
| `DISEASE/Common cold/Treat` | PROSE | **Treat**: No cure; it passes in about a week. |
| `DISEASE/Common cold/fact` | PROSE | **Card fact**: Over 100 strains; no lasting immunity. |
| `DISEASE/Common cold/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Common cold/class` | TABLE | Its antigen class is **NAK**, so an antibody raised against that class works on it. |
| `DISEASE/Common cold/route` | TABLE | It enters the body by the **Nose**, and is a **Virus**. |
| `DISEASE/Common cold/stats` | TABLE | Contagion 5/5, severity 1/5, speed 4/5, cunning 3/5; tier Common. |

### COVID-19

**Type** Virus · **Route** Nose · **Class** ENV · **Infects** lungs, heart · **Contagion** 5/5 · **Severity** 4/5 · **Speed** 4/5 · **Cunning** 4/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/COVID-19/Discovered` | PROSE | **Discovered**: SARS-CoV-2 identified in Wuhan, China, December 2019. |
| `DISEASE/COVID-19/Causes` | PROSE | **Causes**: Cough, fever, loss of smell; pneumonia and myocarditis in severe cases. |
| `DISEASE/COVID-19/Found` | PROSE | **Found**: Worldwide pandemic from 2020. |
| `DISEASE/COVID-19/Prevent` | PROSE | **Prevent**: Vaccination, ventilation, masks during outbreaks. |
| `DISEASE/COVID-19/Treat` | PROSE | **Treat**: Supportive care; antivirals for those at risk. |
| `DISEASE/COVID-19/fact` | PROSE | **Card fact**: Can inflame the heart muscle (myocarditis) as well as the lungs. |
| `DISEASE/COVID-19/tropism` | TABLE | It can infect: **lungs, heart**, and no other organ. |
| `DISEASE/COVID-19/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/COVID-19/route` | TABLE | It enters the body by the **Nose**, and is a **Virus**. |
| `DISEASE/COVID-19/stats` | TABLE | Contagion 5/5, severity 4/5, speed 4/5, cunning 4/5; tier Legendary. |

### RSV

**Type** Virus · **Route** Nose · **Class** ENV · **Infects** lungs · **Contagion** 4/5 · **Severity** 3/5 · **Speed** 3/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/RSV/Discovered` | PROSE | **Discovered**: Respiratory syncytial virus, discovered 1956. |
| `DISEASE/RSV/Causes` | PROSE | **Causes**: Cold-like illness; bronchiolitis and pneumonia in babies. |
| `DISEASE/RSV/Found` | PROSE | **Found**: Worldwide, seasonal. |
| `DISEASE/RSV/Prevent` | PROSE | **Prevent**: Monoclonal antibodies and a maternal vaccine for infants. |
| `DISEASE/RSV/Treat` | PROSE | **Treat**: Supportive care; oxygen if severe. |
| `DISEASE/RSV/fact` | PROSE | **Card fact**: Mild in adults, dangerous for babies. |
| `DISEASE/RSV/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/RSV/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/RSV/route` | TABLE | It enters the body by the **Nose**, and is a **Virus**. |
| `DISEASE/RSV/stats` | TABLE | Contagion 4/5, severity 3/5, speed 3/5, cunning 2/5; tier Common. |

### Measles

**Type** Virus · **Route** Nose · **Class** ENV · **Infects** lungs, brain · **Contagion** 5/5 · **Severity** 4/5 · **Speed** 4/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Measles/Discovered` | PROSE | **Discovered**: Vaccine by John Enders, 1963. One of the most contagious viruses known. |
| `DISEASE/Measles/Causes` | PROSE | **Causes**: Rash and fever. And IMMUNE AMNESIA: it wipes out your existing immune memory, leaving you open to diseases you had already beaten. |
| `DISEASE/Measles/Found` | PROSE | **Found**: Worldwide; resurges wherever vaccination drops. |
| `DISEASE/Measles/Prevent` | PROSE | **Prevent**: MMR vaccine. Two doses. |
| `DISEASE/Measles/Treat` | PROSE | **Treat**: No antiviral; vitamin A and supportive care. Prevention is everything. |
| `DISEASE/Measles/tropism` | TABLE | It can infect: **lungs, brain**, and no other organ. |
| `DISEASE/Measles/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Measles/route` | TABLE | It enters the body by the **Nose**, and is a **Virus**. |
| `DISEASE/Measles/stats` | TABLE | Contagion 5/5, severity 4/5, speed 4/5, cunning 5/5; tier Legendary. |

### Mumps

**Type** Virus · **Route** Nose · **Class** ENV · **Infects** brain, spleen · **Contagion** 4/5 · **Severity** 2/5 · **Speed** 3/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Mumps/Discovered` | PROSE | **Discovered**: Described by Hippocrates; vaccine 1967. |
| `DISEASE/Mumps/Causes` | PROSE | **Causes**: Swollen salivary glands; can inflame the brain and testes. |
| `DISEASE/Mumps/Found` | PROSE | **Found**: Worldwide. |
| `DISEASE/Mumps/Prevent` | PROSE | **Prevent**: MMR vaccine. |
| `DISEASE/Mumps/Treat` | PROSE | **Treat**: Supportive care only. |
| `DISEASE/Mumps/tropism` | TABLE | It can infect: **brain, spleen**, and no other organ. |
| `DISEASE/Mumps/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Mumps/route` | TABLE | It enters the body by the **Nose**, and is a **Virus**. |
| `DISEASE/Mumps/stats` | TABLE | Contagion 4/5, severity 2/5, speed 3/5, cunning 2/5; tier Common. |

### Rubella

**Type** Virus · **Route** Nose · **Class** ENV · **Infects** lungs, heart · **Contagion** 4/5 · **Severity** 2/5 · **Speed** 3/5 · **Cunning** 3/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Rubella/Discovered` | PROSE | **Discovered**: Link to birth defects found by Norman Gregg, 1941. |
| `DISEASE/Rubella/Causes` | PROSE | **Causes**: Mild rash in children. But devastating to an unborn baby. |
| `DISEASE/Rubella/Found` | PROSE | **Found**: Worldwide. |
| `DISEASE/Rubella/Prevent` | PROSE | **Prevent**: MMR vaccine, especially before pregnancy. |
| `DISEASE/Rubella/Treat` | PROSE | **Treat**: No cure; prevention protects the next generation. |
| `DISEASE/Rubella/tropism` | TABLE | It can infect: **lungs, heart**, and no other organ. |
| `DISEASE/Rubella/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Rubella/route` | TABLE | It enters the body by the **Nose**, and is a **Virus**. |
| `DISEASE/Rubella/stats` | TABLE | Contagion 4/5, severity 2/5, speed 3/5, cunning 3/5; tier Common. |

### Smallpox

**Type** Virus · **Route** Nose · **Class** ENV · **Infects** lungs, liver · **Contagion** 5/5 · **Severity** 5/5 · **Speed** 4/5 · **Cunning** 4/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Smallpox/Discovered` | PROSE | **Discovered**: Jenner's cowpox vaccine, 1796. The first vaccine ever made. |
| `DISEASE/Smallpox/Causes` | PROSE | **Causes**: Disfiguring pustules; killed around 30% of those infected. |
| `DISEASE/Smallpox/Found` | PROSE | **Found**: NOWHERE. Declared eradicated in 1980. The only human disease ever wiped out. |
| `DISEASE/Smallpox/Prevent` | PROSE | **Prevent**: Vaccination. The campaign that ended it. |
| `DISEASE/Smallpox/Treat` | PROSE | **Treat**: None needed. This card is a trophy: proof that immunology WINS. |
| `DISEASE/Smallpox/tropism` | TABLE | It can infect: **lungs, liver**, and no other organ. |
| `DISEASE/Smallpox/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Smallpox/route` | TABLE | It enters the body by the **Nose**, and is a **Virus**. |
| `DISEASE/Smallpox/stats` | TABLE | Contagion 5/5, severity 5/5, speed 4/5, cunning 4/5; tier Legendary. |

### Nipah

**Type** Virus · **Route** Nose · **Class** ENV · **Infects** brain, lungs · **Contagion** 2/5 · **Severity** 5/5 · **Speed** 3/5 · **Cunning** 4/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Nipah/Discovered` | PROSE | **Discovered**: Identified in Malaysia 1998; outbreaks in Kerala, India (2018, 2023). |
| `DISEASE/Nipah/Causes` | PROSE | **Causes**: Brain inflammation; fatal in 40-75% of cases. |
| `DISEASE/Nipah/Found` | PROSE | **Found**: South and Southeast Asia; spread by fruit bats. |
| `DISEASE/Nipah/Prevent` | PROSE | **Prevent**: Avoid raw date-palm sap; isolate cases. |
| `DISEASE/Nipah/Treat` | PROSE | **Treat**: No specific cure. Supportive care. |
| `DISEASE/Nipah/tropism` | TABLE | It can infect: **brain, lungs**, and no other organ. |
| `DISEASE/Nipah/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Nipah/route` | TABLE | It enters the body by the **Nose**, and is a **Virus**. |
| `DISEASE/Nipah/stats` | TABLE | Contagion 2/5, severity 5/5, speed 3/5, cunning 4/5; tier Legendary. |

### Hand-foot-and-mouth

**Type** Virus · **Route** Nose · **Class** NAK · **Infects** lungs, heart · **Contagion** 5/5 · **Severity** 1/5 · **Speed** 4/5 · **Cunning** 1/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Hand-foot-and-mouth/Discovered` | PROSE | **Discovered**: Coxsackievirus, 1950s. |
| `DISEASE/Hand-foot-and-mouth/Causes` | PROSE | **Causes**: Blisters on hands, feet and mouth; usually mild in children. |
| `DISEASE/Hand-foot-and-mouth/Found` | PROSE | **Found**: Worldwide; common in schools. |
| `DISEASE/Hand-foot-and-mouth/Prevent` | PROSE | **Prevent**: Handwashing. |
| `DISEASE/Hand-foot-and-mouth/Treat` | PROSE | **Treat**: Self-limiting. |
| `DISEASE/Hand-foot-and-mouth/tropism` | TABLE | It can infect: **lungs, heart**, and no other organ. |
| `DISEASE/Hand-foot-and-mouth/class` | TABLE | Its antigen class is **NAK**, so an antibody raised against that class works on it. |
| `DISEASE/Hand-foot-and-mouth/route` | TABLE | It enters the body by the **Nose**, and is a **Virus**. |
| `DISEASE/Hand-foot-and-mouth/stats` | TABLE | Contagion 5/5, severity 1/5, speed 4/5, cunning 1/5; tier Common. |

### Chickenpox

**Type** Hidden Virus · **Route** Nose · **Class** ENV · **Infects** lungs, brain · **Contagion** 5/5 · **Severity** 2/5 · **Speed** 3/5 · **Cunning** 5/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Chickenpox/Discovered` | PROSE | **Discovered**: Varicella-zoster; vaccine developed in the 1970s. |
| `DISEASE/Chickenpox/Causes` | PROSE | **Causes**: Itchy blisters. Then HIDES IN YOUR NERVES for decades and can return as shingles. |
| `DISEASE/Chickenpox/Found` | PROSE | **Found**: Worldwide. |
| `DISEASE/Chickenpox/Prevent` | PROSE | **Prevent**: Varicella vaccine. |
| `DISEASE/Chickenpox/Treat` | PROSE | **Treat**: Antivirals if severe. |
| `DISEASE/Chickenpox/fact` | PROSE | **Card fact**: Hides in nerves for decades. Returns as shingles. |
| `DISEASE/Chickenpox/tropism` | TABLE | It can infect: **lungs, brain**, and no other organ. |
| `DISEASE/Chickenpox/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Chickenpox/route` | TABLE | It enters the body by the **Nose**, and is a **Hidden Virus**. |
| `DISEASE/Chickenpox/stats` | TABLE | Contagion 5/5, severity 2/5, speed 3/5, cunning 5/5; tier Rare. |

### Glandular fever

**Type** Hidden Virus · **Route** Nose · **Class** ENV · **Infects** spleen, liver · **Contagion** 3/5 · **Severity** 3/5 · **Speed** 2/5 · **Cunning** 5/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Glandular fever/Discovered` | PROSE | **Discovered**: Epstein-Barr virus, discovered 1964. |
| `DISEASE/Glandular fever/Causes` | PROSE | **Causes**: Fever, sore throat, extreme fatigue, swollen spleen (rupture risk). |
| `DISEASE/Glandular fever/Found` | PROSE | **Found**: Worldwide; common in teenagers. |
| `DISEASE/Glandular fever/Prevent` | PROSE | **Prevent**: No vaccine. |
| `DISEASE/Glandular fever/Treat` | PROSE | **Treat**: Rest. Avoid contact sport while the spleen is swollen. |
| `DISEASE/Glandular fever/fact` | PROSE | **Card fact**: Hides inside your own B-cells; risks spleen rupture. |
| `DISEASE/Glandular fever/tropism` | TABLE | It can infect: **spleen, liver**, and no other organ. |
| `DISEASE/Glandular fever/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Glandular fever/route` | TABLE | It enters the body by the **Nose**, and is a **Hidden Virus**. |
| `DISEASE/Glandular fever/stats` | TABLE | Contagion 3/5, severity 3/5, speed 2/5, cunning 5/5; tier Rare. |

### Cytomegalovirus

**Type** Hidden Virus · **Route** Nose · **Class** ENV · **Infects** liver, lungs · **Contagion** 3/5 · **Severity** 2/5 · **Speed** 2/5 · **Cunning** 5/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Cytomegalovirus/Discovered` | PROSE | **Discovered**: Isolated 1956. |
| `DISEASE/Cytomegalovirus/Causes` | PROSE | **Causes**: Harmless in healthy people. It just hides for life. Dangerous to babies and the immunosuppressed. |
| `DISEASE/Cytomegalovirus/Found` | PROSE | **Found**: Most adults worldwide carry it. |
| `DISEASE/Cytomegalovirus/Prevent` | PROSE | **Prevent**: Hygiene; no vaccine yet. |
| `DISEASE/Cytomegalovirus/Treat` | PROSE | **Treat**: Antivirals only when it reactivates. |
| `DISEASE/Cytomegalovirus/tropism` | TABLE | It can infect: **liver, lungs**, and no other organ. |
| `DISEASE/Cytomegalovirus/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Cytomegalovirus/route` | TABLE | It enters the body by the **Nose**, and is a **Hidden Virus**. |
| `DISEASE/Cytomegalovirus/stats` | TABLE | Contagion 3/5, severity 2/5, speed 2/5, cunning 5/5; tier Common. |

### Tuberculosis

**Type** Bacteria · **Route** Nose · **Class** ICB · **Infects** lungs · **Contagion** 3/5 · **Severity** 5/5 · **Speed** 1/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Tuberculosis/Discovered` | PROSE | **Discovered**: Bacterium found by Robert Koch, 1882. |
| `DISEASE/Tuberculosis/Causes` | PROSE | **Causes**: Chronic cough, weight loss, night sweats. Can lie dormant for YEARS. |
| `DISEASE/Tuberculosis/Found` | PROSE | **Found**: Worldwide. India carries the largest burden of any country. |
| `DISEASE/Tuberculosis/Prevent` | PROSE | **Prevent**: BCG vaccine; treating active cases; ventilation. |
| `DISEASE/Tuberculosis/Treat` | PROSE | **Treat**: 6+ months of combination antibiotics. Not finishing the course breeds resistance. |
| `DISEASE/Tuberculosis/fact` | PROSE | **Card fact**: Can lie dormant in the lungs for years. |
| `DISEASE/Tuberculosis/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Tuberculosis/class` | TABLE | Its antigen class is **ICB**, so an antibody raised against that class works on it. |
| `DISEASE/Tuberculosis/route` | TABLE | It enters the body by the **Nose**, and is a **Bacteria**. |
| `DISEASE/Tuberculosis/stats` | TABLE | Contagion 3/5, severity 5/5, speed 1/5, cunning 5/5; tier Legendary. |

### Whooping cough

**Type** Bacteria · **Route** Nose · **Class** EXB · **Infects** lungs · **Contagion** 5/5 · **Severity** 3/5 · **Speed** 3/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Whooping cough/Discovered` | PROSE | **Discovered**: Bordetella pertussis, identified 1906. |
| `DISEASE/Whooping cough/Causes` | PROSE | **Causes**: Violent coughing fits with a 'whoop'; deadly in babies. |
| `DISEASE/Whooping cough/Found` | PROSE | **Found**: Worldwide; returns where vaccination falls. |
| `DISEASE/Whooping cough/Prevent` | PROSE | **Prevent**: DPT vaccine. |
| `DISEASE/Whooping cough/Treat` | PROSE | **Treat**: Antibiotics, given early. |
| `DISEASE/Whooping cough/fact` | PROSE | **Card fact**: Violent coughing fits; DPT vaccine prevents it. |
| `DISEASE/Whooping cough/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Whooping cough/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Whooping cough/route` | TABLE | It enters the body by the **Nose**, and is a **Bacteria**. |
| `DISEASE/Whooping cough/stats` | TABLE | Contagion 5/5, severity 3/5, speed 3/5, cunning 2/5; tier Common. |

### Meningitis

**Type** Bacteria · **Route** Nose · **Class** EXB · **Infects** brain · **Contagion** 3/5 · **Severity** 5/5 · **Speed** 5/5 · **Cunning** 3/5 · **Tier** Legendary · **Moves fast**: 3 steps per spread

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Meningitis/Discovered` | PROSE | **Discovered**: Meningococcus identified 1887. |
| `DISEASE/Meningitis/Causes` | PROSE | **Causes**: Infects the lining of the brain. Can kill a healthy person within HOURS. |
| `DISEASE/Meningitis/Found` | PROSE | **Found**: Worldwide; the African 'meningitis belt' worst. |
| `DISEASE/Meningitis/Prevent` | PROSE | **Prevent**: Meningococcal vaccine. |
| `DISEASE/Meningitis/Treat` | PROSE | **Treat**: Emergency antibiotics. Every hour counts. |
| `DISEASE/Meningitis/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Meningitis/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Meningitis/route` | TABLE | It enters the body by the **Nose**, and is a **Bacteria**. |
| `DISEASE/Meningitis/stats` | TABLE | Contagion 3/5, severity 5/5, speed 5/5, cunning 3/5; tier Legendary. |

### Pneumonia

**Type** Bacteria · **Route** Nose · **Class** EXB · **Infects** lungs · **Contagion** 4/5 · **Severity** 5/5 · **Speed** 4/5 · **Cunning** 2/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Pneumonia/Discovered` | PROSE | **Discovered**: Streptococcus pneumoniae, identified 1881. |
| `DISEASE/Pneumonia/Causes` | PROSE | **Causes**: Fills the lungs with fluid. The single biggest infectious killer of children worldwide. |
| `DISEASE/Pneumonia/Found` | PROSE | **Found**: Everywhere. |
| `DISEASE/Pneumonia/Prevent` | PROSE | **Prevent**: Pneumococcal vaccine; flu vaccine; clean cooking fuel. |
| `DISEASE/Pneumonia/Treat` | PROSE | **Treat**: Antibiotics and oxygen. |
| `DISEASE/Pneumonia/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Pneumonia/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Pneumonia/route` | TABLE | It enters the body by the **Nose**, and is a **Bacteria**. |
| `DISEASE/Pneumonia/stats` | TABLE | Contagion 4/5, severity 5/5, speed 4/5, cunning 2/5; tier Rare. |

### Strep throat

**Type** Bacteria · **Route** Nose · **Class** EXB · **Infects** heart, kidneys · **Contagion** 4/5 · **Severity** 2/5 · **Speed** 3/5 · **Cunning** 5/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Strep throat/Discovered` | PROSE | **Discovered**: Group A Streptococcus. |
| `DISEASE/Strep throat/Causes` | PROSE | **Causes**: Sore throat. But if ignored, the antibodies you make against it can attack YOUR OWN HEART VALVES (rheumatic fever). |
| `DISEASE/Strep throat/Found` | PROSE | **Found**: Worldwide; rheumatic heart disease is a major problem in India. |
| `DISEASE/Strep throat/Prevent` | PROSE | **Prevent**: Treat sore throats properly. |
| `DISEASE/Strep throat/Treat` | PROSE | **Treat**: Antibiotics. Which are given mainly to prevent the heart damage. |
| `DISEASE/Strep throat/tropism` | TABLE | It can infect: **heart, kidneys**, and no other organ. |
| `DISEASE/Strep throat/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Strep throat/route` | TABLE | It enters the body by the **Nose**, and is a **Bacteria**. |
| `DISEASE/Strep throat/stats` | TABLE | Contagion 4/5, severity 2/5, speed 3/5, cunning 5/5; tier Rare. |

### Leprosy

**Type** Bacteria · **Route** Nose · **Class** ICB · **Infects** brain · **Contagion** 1/5 · **Severity** 3/5 · **Speed** 1/5 · **Cunning** 4/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Leprosy/Discovered` | PROSE | **Discovered**: Bacterium found by Gerhard Hansen, 1873. The first bacterium ever linked to human disease. |
| `DISEASE/Leprosy/Causes` | PROSE | **Causes**: Attacks the nerves. Numbness means injuries go unnoticed, and THAT causes the deformity. Not the germ eating the flesh, as people wrongly believe. |
| `DISEASE/Leprosy/Found` | PROSE | **Found**: India records a large share of the world's new cases. |
| `DISEASE/Leprosy/Prevent` | PROSE | **Prevent**: IT IS NOT SPREAD BY TOUCH. It spreads by droplets, after months of close contact, and about 95% of people are naturally immune to it. It enters through the NOSE, which is why it is in the Nose lane and not the Contact lane. The belief that a handshake spreads leprosy is a myth that exiled people to colonies for centuries. |
| `DISEASE/Leprosy/Treat` | PROSE | **Treat**: Completely curable with multi-drug therapy. Free worldwide since 1995. |
| `DISEASE/Leprosy/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Leprosy/class` | TABLE | Its antigen class is **ICB**, so an antibody raised against that class works on it. |
| `DISEASE/Leprosy/route` | TABLE | It enters the body by the **Nose**, and is a **Bacteria**. |
| `DISEASE/Leprosy/stats` | TABLE | Contagion 1/5, severity 3/5, speed 1/5, cunning 4/5; tier Rare. |

### Legionnaires' disease

**Type** Bacteria · **Route** Nose · **Class** ICB · **Infects** lungs · **Contagion** 1/5 · **Severity** 4/5 · **Speed** 3/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Legionnaires' disease/Discovered` | PROSE | **Discovered**: Named after a 1976 outbreak at an American Legion convention. |
| `DISEASE/Legionnaires' disease/Causes` | PROSE | **Causes**: Severe pneumonia from bacteria in air-conditioning and water systems. |
| `DISEASE/Legionnaires' disease/Found` | PROSE | **Found**: Worldwide, in buildings with poorly maintained water systems. |
| `DISEASE/Legionnaires' disease/Prevent` | PROSE | **Prevent**: Maintain cooling towers and water tanks. |
| `DISEASE/Legionnaires' disease/Treat` | PROSE | **Treat**: Antibiotics. |
| `DISEASE/Legionnaires' disease/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Legionnaires' disease/class` | TABLE | Its antigen class is **ICB**, so an antibody raised against that class works on it. |
| `DISEASE/Legionnaires' disease/route` | TABLE | It enters the body by the **Nose**, and is a **Bacteria**. |
| `DISEASE/Legionnaires' disease/stats` | TABLE | Contagion 1/5, severity 4/5, speed 3/5, cunning 2/5; tier Common. |

### Diphtheria

**Type** Toxin · **Route** Nose · **Class** TOX · **Infects** heart · **Contagion** 3/5 · **Severity** 5/5 · **Speed** 4/5 · **Cunning** 3/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Diphtheria/Discovered` | PROSE | **Discovered**: Antitoxin by von Behring, 1890. Winning the FIRST Nobel Prize in Medicine. |
| `DISEASE/Diphtheria/Causes` | PROSE | **Causes**: A grey membrane chokes the throat, and its TOXIN attacks the heart. The toxin is pre-formed. It poisons you directly. |
| `DISEASE/Diphtheria/Found` | PROSE | **Found**: Worldwide where vaccination lapses; outbreaks still occur in India. |
| `DISEASE/Diphtheria/Prevent` | PROSE | **Prevent**: DPT vaccine. |
| `DISEASE/Diphtheria/Treat` | PROSE | **Treat**: ANTITOXIN. Antibodies. No cell can eat a toxin. |
| `DISEASE/Diphtheria/tropism` | TABLE | It can infect: **heart**, and no other organ. |
| `DISEASE/Diphtheria/class` | TABLE | Its antigen class is **TOX**, so an antibody raised against that class works on it. |
| `DISEASE/Diphtheria/route` | TABLE | It enters the body by the **Nose**, and is a **Toxin**. |
| `DISEASE/Diphtheria/stats` | TABLE | Contagion 3/5, severity 5/5, speed 4/5, cunning 3/5; tier Legendary. |

### Mucormycosis

**Type** Fungus · **Route** Nose · **Class** EUK · **Infects** brain, lungs · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 3/5 · **Cunning** 4/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Mucormycosis/Discovered` | PROSE | **Discovered**: 'Black fungus'. Surged across India in 2021 among COVID patients. |
| `DISEASE/Mucormycosis/Causes` | PROSE | **Causes**: Invades nose and sinuses, then the eye and BRAIN. Often fatal. |
| `DISEASE/Mucormycosis/Found` | PROSE | **Found**: Worldwide, but it strikes the immunocompromised. Diabetics, steroid patients. |
| `DISEASE/Mucormycosis/Prevent` | PROSE | **Prevent**: Control diabetes; use steroids carefully. |
| `DISEASE/Mucormycosis/Treat` | PROSE | **Treat**: Antifungals and surgery. A pure OPPORTUNIST. It only wins when your defences are already down. |
| `DISEASE/Mucormycosis/tropism` | TABLE | It can infect: **brain, lungs**, and no other organ. |
| `DISEASE/Mucormycosis/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Mucormycosis/route` | TABLE | It enters the body by the **Nose**, and is a **Fungus**. |
| `DISEASE/Mucormycosis/stats` | TABLE | Contagion 1/5, severity 5/5, speed 3/5, cunning 4/5; tier Legendary. |

### Aspergillosis

**Type** Fungus · **Route** Nose · **Class** EUK · **Infects** lungs · **Contagion** 2/5 · **Severity** 4/5 · **Speed** 2/5 · **Cunning** 3/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Aspergillosis/Discovered` | PROSE | **Discovered**: Aspergillus mould, described 1729. |
| `DISEASE/Aspergillosis/Causes` | PROSE | **Causes**: A mould you breathe in daily. Harmless, unless your defences are weak. |
| `DISEASE/Aspergillosis/Found` | PROSE | **Found**: Everywhere: soil, dust, damp buildings. |
| `DISEASE/Aspergillosis/Prevent` | PROSE | **Prevent**: Avoid dust if immunocompromised. |
| `DISEASE/Aspergillosis/Treat` | PROSE | **Treat**: Antifungals. Neutrophils are the key defence. Which is why neutropenia invites it in. |
| `DISEASE/Aspergillosis/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Aspergillosis/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Aspergillosis/route` | TABLE | It enters the body by the **Nose**, and is a **Fungus**. |
| `DISEASE/Aspergillosis/stats` | TABLE | Contagion 2/5, severity 4/5, speed 2/5, cunning 3/5; tier Rare. |

### Cryptococcus

**Type** Fungus · **Route** Nose · **Class** EUK · **Infects** brain · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 2/5 · **Cunning** 4/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Cryptococcus/Discovered` | PROSE | **Discovered**: Described 1894; a leading killer in AIDS. |
| `DISEASE/Cryptococcus/Causes` | PROSE | **Causes**: Fungal meningitis. It invades the BRAIN. |
| `DISEASE/Cryptococcus/Found` | PROSE | **Found**: Worldwide, in soil and pigeon droppings. |
| `DISEASE/Cryptococcus/Prevent` | PROSE | **Prevent**: Hard to avoid; the real defence is a working immune system. |
| `DISEASE/Cryptococcus/Treat` | PROSE | **Treat**: Antifungals. Mostly attacks people with HIV. |
| `DISEASE/Cryptococcus/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Cryptococcus/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Cryptococcus/route` | TABLE | It enters the body by the **Nose**, and is a **Fungus**. |
| `DISEASE/Cryptococcus/stats` | TABLE | Contagion 1/5, severity 5/5, speed 2/5, cunning 4/5; tier Rare. |

### Pneumocystis pneumonia

**Type** Fungus · **Route** Nose · **Class** EUK · **Infects** lungs · **Contagion** 1/5 · **Severity** 4/5 · **Speed** 2/5 · **Cunning** 3/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Pneumocystis pneumonia/Discovered` | PROSE | **Discovered**: Recognised in the 1980s as the disease that revealed AIDS. |
| `DISEASE/Pneumocystis pneumonia/Causes` | PROSE | **Causes**: A fungus that only causes pneumonia when helper T-cells are destroyed. |
| `DISEASE/Pneumocystis pneumonia/Found` | PROSE | **Found**: Worldwide, in the severely immunosuppressed. |
| `DISEASE/Pneumocystis pneumonia/Prevent` | PROSE | **Prevent**: Preventive antibiotics for at-risk patients. |
| `DISEASE/Pneumocystis pneumonia/Treat` | PROSE | **Treat**: Antibiotics/antifungals. It is a signpost of a collapsed immune system. |
| `DISEASE/Pneumocystis pneumonia/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Pneumocystis pneumonia/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Pneumocystis pneumonia/route` | TABLE | It enters the body by the **Nose**, and is a **Fungus**. |
| `DISEASE/Pneumocystis pneumonia/stats` | TABLE | Contagion 1/5, severity 4/5, speed 2/5, cunning 3/5; tier Rare. |

### Dengue

**Type** Virus · **Route** Bite · **Class** ENV · **Infects** liver, marrow · **Contagion** 3/5 · **Severity** 4/5 · **Speed** 3/5 · **Cunning** 3/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Dengue/Discovered` | PROSE | **Discovered**: Four different serotypes. This matters enormously. |
| `DISEASE/Dengue/Causes` | PROSE | **Causes**: High fever, severe joint pain, crashing platelets (marrow). |
| `DISEASE/Dengue/Found` | PROSE | **Found**: Tropics; a major monsoon disease across India. |
| `DISEASE/Dengue/Prevent` | PROSE | **Prevent**: Aedes mosquito control. It bites in DAYTIME. Remove standing water. |
| `DISEASE/Dengue/Treat` | PROSE | **Treat**: No cure; fluids. Never give aspirin. A SECOND dengue infection can be far worse (ADE). |
| `DISEASE/Dengue/fact` | PROSE | **Card fact**: Crashes the marrow's platelet supply. |
| `DISEASE/Dengue/tropism` | TABLE | It can infect: **liver, marrow**, and no other organ. |
| `DISEASE/Dengue/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Dengue/route` | TABLE | It enters the body by the **Bite**, and is a **Virus**. |
| `DISEASE/Dengue/stats` | TABLE | Contagion 3/5, severity 4/5, speed 3/5, cunning 3/5; tier Rare. |

### Chikungunya

**Type** Virus · **Route** Bite · **Class** ENV · **Infects** liver, heart · **Contagion** 3/5 · **Severity** 3/5 · **Speed** 3/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Chikungunya/Discovered` | PROSE | **Discovered**: First described in Tanzania, 1952. The name means 'to become contorted'. |
| `DISEASE/Chikungunya/Causes` | PROSE | **Causes**: Fever and severe joint pain that can last months. |
| `DISEASE/Chikungunya/Found` | PROSE | **Found**: Africa, Asia, the Americas; common in India. |
| `DISEASE/Chikungunya/Prevent` | PROSE | **Prevent**: Aedes mosquito control. |
| `DISEASE/Chikungunya/Treat` | PROSE | **Treat**: No antiviral; pain relief. |
| `DISEASE/Chikungunya/fact` | PROSE | **Card fact**: Mosquito virus; joint pain, sometimes myocarditis. |
| `DISEASE/Chikungunya/tropism` | TABLE | It can infect: **liver, heart**, and no other organ. |
| `DISEASE/Chikungunya/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Chikungunya/route` | TABLE | It enters the body by the **Bite**, and is a **Virus**. |
| `DISEASE/Chikungunya/stats` | TABLE | Contagion 3/5, severity 3/5, speed 3/5, cunning 2/5; tier Common. |

### Japanese encephalitis

**Type** Virus · **Route** Bite · **Class** ENV · **Infects** brain · **Contagion** 2/5 · **Severity** 5/5 · **Speed** 3/5 · **Cunning** 4/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Japanese encephalitis/Discovered` | PROSE | **Discovered**: Virus isolated in Japan, 1935. |
| `DISEASE/Japanese encephalitis/Causes` | PROSE | **Causes**: Brain inflammation; often leaves permanent damage. |
| `DISEASE/Japanese encephalitis/Found` | PROSE | **Found**: Rural Asia including India; pigs and birds are the reservoir. |
| `DISEASE/Japanese encephalitis/Prevent` | PROSE | **Prevent**: JE vaccine; mosquito control. |
| `DISEASE/Japanese encephalitis/Treat` | PROSE | **Treat**: No cure. Supportive care only. |
| `DISEASE/Japanese encephalitis/fact` | PROSE | **Card fact**: Mosquito-borne brain infection; vaccine-preventable. |
| `DISEASE/Japanese encephalitis/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Japanese encephalitis/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Japanese encephalitis/route` | TABLE | It enters the body by the **Bite**, and is a **Virus**. |
| `DISEASE/Japanese encephalitis/stats` | TABLE | Contagion 2/5, severity 5/5, speed 3/5, cunning 4/5; tier Rare. |

### Yellow fever

**Type** Virus · **Route** Bite · **Class** ENV · **Infects** liver, kidneys · **Contagion** 3/5 · **Severity** 5/5 · **Speed** 3/5 · **Cunning** 3/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Yellow fever/Discovered` | PROSE | **Discovered**: Shown to be mosquito-borne by Walter Reed, 1900. |
| `DISEASE/Yellow fever/Causes` | PROSE | **Causes**: Fever, liver failure and jaundice (the 'yellow'), bleeding. |
| `DISEASE/Yellow fever/Found` | PROSE | **Found**: Africa and South America. |
| `DISEASE/Yellow fever/Prevent` | PROSE | **Prevent**: One highly effective, lifelong vaccine. |
| `DISEASE/Yellow fever/Treat` | PROSE | **Treat**: Supportive care. |
| `DISEASE/Yellow fever/fact` | PROSE | **Card fact**: Attacks the liver. Hence the jaundice. |
| `DISEASE/Yellow fever/tropism` | TABLE | It can infect: **liver, kidneys**, and no other organ. |
| `DISEASE/Yellow fever/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Yellow fever/route` | TABLE | It enters the body by the **Bite**, and is a **Virus**. |
| `DISEASE/Yellow fever/stats` | TABLE | Contagion 3/5, severity 5/5, speed 3/5, cunning 3/5; tier Rare. |

### Zika

**Type** Virus · **Route** Bite · **Class** ENV · **Infects** brain · **Contagion** 3/5 · **Severity** 3/5 · **Speed** 3/5 · **Cunning** 4/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Zika/Discovered` | PROSE | **Discovered**: Identified 1947; caused a global emergency in 2015-16. |
| `DISEASE/Zika/Causes` | PROSE | **Causes**: Mild in adults. But causes severe brain defects in unborn babies. |
| `DISEASE/Zika/Found` | PROSE | **Found**: Tropics. |
| `DISEASE/Zika/Prevent` | PROSE | **Prevent**: Mosquito control; protect pregnancies. |
| `DISEASE/Zika/Treat` | PROSE | **Treat**: No specific treatment. |
| `DISEASE/Zika/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Zika/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Zika/route` | TABLE | It enters the body by the **Bite**, and is a **Virus**. |
| `DISEASE/Zika/stats` | TABLE | Contagion 3/5, severity 3/5, speed 3/5, cunning 4/5; tier Rare. |

### West Nile fever

**Type** Virus · **Route** Bite · **Class** ENV · **Infects** brain · **Contagion** 2/5 · **Severity** 3/5 · **Speed** 3/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/West Nile fever/Discovered` | PROSE | **Discovered**: Isolated in Uganda, 1937. |
| `DISEASE/West Nile fever/Causes` | PROSE | **Causes**: Usually mild; occasionally causes brain inflammation. |
| `DISEASE/West Nile fever/Found` | PROSE | **Found**: Africa, Europe, Americas, Asia. |
| `DISEASE/West Nile fever/Prevent` | PROSE | **Prevent**: Mosquito control. |
| `DISEASE/West Nile fever/Treat` | PROSE | **Treat**: Supportive care. |
| `DISEASE/West Nile fever/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/West Nile fever/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/West Nile fever/route` | TABLE | It enters the body by the **Bite**, and is a **Virus**. |
| `DISEASE/West Nile fever/stats` | TABLE | Contagion 2/5, severity 3/5, speed 3/5, cunning 2/5; tier Common. |

### Rabies

**Type** Hidden Virus · **Route** Bite · **Class** ENV · **Infects** brain · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 2/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Rabies/Discovered` | PROSE | **Discovered**: Vaccine by Louis Pasteur, 1885. |
| `DISEASE/Rabies/Causes` | PROSE | **Causes**: Creeps up your NERVES to the brain, where antibodies cannot follow. Almost 100% fatal once symptoms begin. |
| `DISEASE/Rabies/Found` | PROSE | **Found**: Worldwide; dogs are the main source in India. |
| `DISEASE/Rabies/Prevent` | PROSE | **Prevent**: Vaccinate dogs. After a bite: wash it, and get the vaccine IMMEDIATELY. |
| `DISEASE/Rabies/Treat` | PROSE | **Treat**: Post-exposure vaccine works BEFORE symptoms start. After that, nothing does. |
| `DISEASE/Rabies/fact` | PROSE | **Card fact**: Creeps inside nerves where antibodies can't follow. |
| `DISEASE/Rabies/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Rabies/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Rabies/route` | TABLE | It enters the body by the **Bite**, and is a **Hidden Virus**. |
| `DISEASE/Rabies/stats` | TABLE | Contagion 1/5, severity 5/5, speed 2/5, cunning 5/5; tier Legendary. |

### HIV

**Type** Hidden Virus · **Route** Contact · **Class** ENV · **Infects** marrow, spleen · **Contagion** 2/5 · **Severity** 5/5 · **Speed** 1/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/HIV/Discovered` | PROSE | **Discovered**: Identified 1983 by Montagnier and Barré-Sinoussi (Nobel Prize). |
| `DISEASE/HIV/Causes` | PROSE | **Causes**: It destroys HELPER T-CELLS. The commanders of your immune system. Without them, ordinary germs become lethal. |
| `DISEASE/HIV/Found` | PROSE | **Found**: Worldwide; ~39 million people live with HIV. Spread by unprotected sex, shared needles, and infected blood. |
| `DISEASE/HIV/Prevent` | PROSE | **Prevent**: Condoms; never share needles; screened blood; PrEP medication. It is NOT spread by mosquitoes, sharing food, or touching. A myth worth killing. |
| `DISEASE/HIV/Treat` | PROSE | **Treat**: Antiretroviral therapy: not a cure, but people now live full lives, and treatment makes them unable to pass it on. Attacking the immune system itself is why HIV is so dangerous. |
| `DISEASE/HIV/tropism` | TABLE | It can infect: **marrow, spleen**, and no other organ. |
| `DISEASE/HIV/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/HIV/route` | TABLE | It enters the body by the **Contact**, and is a **Hidden Virus**. |
| `DISEASE/HIV/stats` | TABLE | Contagion 2/5, severity 5/5, speed 1/5, cunning 5/5; tier Legendary. |

### Hepatitis B

**Type** Hidden Virus · **Route** Blood · **Class** ENV · **Infects** liver · **Contagion** 3/5 · **Severity** 4/5 · **Speed** 1/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Hepatitis B/Discovered` | PROSE | **Discovered**: Discovered by Baruch Blumberg, 1965 (Nobel Prize). First anti-cancer vaccine. |
| `DISEASE/Hepatitis B/Causes` | PROSE | **Causes**: Attacks the liver; can persist for life and cause liver cancer. |
| `DISEASE/Hepatitis B/Found` | PROSE | **Found**: Worldwide; ~250 million chronic carriers. |
| `DISEASE/Hepatitis B/Prevent` | PROSE | **Prevent**: Hepatitis B vaccine. Given at birth in India. |
| `DISEASE/Hepatitis B/Treat` | PROSE | **Treat**: Antivirals control it; the vaccine prevents it. |
| `DISEASE/Hepatitis B/tropism` | TABLE | It can infect: **liver**, and no other organ. |
| `DISEASE/Hepatitis B/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Hepatitis B/route` | TABLE | It enters the body by the **Blood**, and is a **Hidden Virus**. |
| `DISEASE/Hepatitis B/stats` | TABLE | Contagion 3/5, severity 4/5, speed 1/5, cunning 5/5; tier Legendary. |

### Hepatitis C

**Type** Hidden Virus · **Route** Blood · **Class** ENV · **Infects** liver · **Contagion** 2/5 · **Severity** 4/5 · **Speed** 1/5 · **Cunning** 5/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Hepatitis C/Discovered` | PROSE | **Discovered**: Identified 1989; Nobel Prize 2020. |
| `DISEASE/Hepatitis C/Causes` | PROSE | **Causes**: Silently scars the liver for decades. Cirrhosis and cancer. |
| `DISEASE/Hepatitis C/Found` | PROSE | **Found**: Worldwide. |
| `DISEASE/Hepatitis C/Prevent` | PROSE | **Prevent**: No vaccine yet; screened blood and clean needles. |
| `DISEASE/Hepatitis C/Treat` | PROSE | **Treat**: CURABLE since 2014 with direct-acting antivirals. One of medicine's great wins. |
| `DISEASE/Hepatitis C/tropism` | TABLE | It can infect: **liver**, and no other organ. |
| `DISEASE/Hepatitis C/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Hepatitis C/route` | TABLE | It enters the body by the **Blood**, and is a **Hidden Virus**. |
| `DISEASE/Hepatitis C/stats` | TABLE | Contagion 2/5, severity 4/5, speed 1/5, cunning 5/5; tier Rare. |

### Chagas disease

**Type** Hidden Virus · **Route** Bite · **Class** EUK · **Infects** heart · **Contagion** 1/5 · **Severity** 4/5 · **Speed** 1/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Chagas disease/Discovered` | PROSE | **Discovered**: Discovered by Carlos Chagas, 1909. He found the parasite, the vector and the disease. |
| `DISEASE/Chagas disease/Causes` | PROSE | **Causes**: A parasite that HIDES INSIDE HEART MUSCLE for decades, then destroys it. |
| `DISEASE/Chagas disease/Found` | PROSE | **Found**: Latin America. |
| `DISEASE/Chagas disease/Prevent` | PROSE | **Prevent**: Control the 'kissing bug'; improve housing. |
| `DISEASE/Chagas disease/Treat` | PROSE | **Treat**: Drugs work early; once the heart is damaged, it is irreversible. |
| `DISEASE/Chagas disease/tropism` | TABLE | It can infect: **heart**, and no other organ. |
| `DISEASE/Chagas disease/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Chagas disease/route` | TABLE | It enters the body by the **Bite**, and is a **Hidden Virus**. |
| `DISEASE/Chagas disease/stats` | TABLE | Contagion 1/5, severity 4/5, speed 1/5, cunning 5/5; tier Legendary. |

### Lyme disease

**Type** Bacteria · **Route** Bite · **Class** EXB · **Infects** brain, heart · **Contagion** 1/5 · **Severity** 3/5 · **Speed** 2/5 · **Cunning** 4/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Lyme disease/Discovered` | PROSE | **Discovered**: Identified in Lyme, Connecticut, 1975. |
| `DISEASE/Lyme disease/Causes` | PROSE | **Causes**: Bull's-eye rash; can attack the heart (Lyme carditis) and nerves. |
| `DISEASE/Lyme disease/Found` | PROSE | **Found**: North America, Europe, parts of Asia. From tick bites. |
| `DISEASE/Lyme disease/Prevent` | PROSE | **Prevent**: Cover skin in woods; remove ticks quickly. |
| `DISEASE/Lyme disease/Treat` | PROSE | **Treat**: Antibiotics. Very effective if caught early. |
| `DISEASE/Lyme disease/fact` | PROSE | **Card fact**: Tick bite; can cause Lyme carditis in the heart. |
| `DISEASE/Lyme disease/tropism` | TABLE | It can infect: **brain, heart**, and no other organ. |
| `DISEASE/Lyme disease/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Lyme disease/route` | TABLE | It enters the body by the **Bite**, and is a **Bacteria**. |
| `DISEASE/Lyme disease/stats` | TABLE | Contagion 1/5, severity 3/5, speed 2/5, cunning 4/5; tier Common. |

### Plague

**Type** Bacteria · **Route** Bite · **Class** EXB · **Infects** lungs, spleen · **Contagion** 4/5 · **Severity** 5/5 · **Speed** 4/5 · **Cunning** 3/5 · **Tier** Legendary · **Moves fast**: 2 steps per spread

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Plague/Discovered` | PROSE | **Discovered**: Yersinia pestis. The Black Death killed a third of Europe (1347-51). |
| `DISEASE/Plague/Causes` | PROSE | **Causes**: Swollen lymph nodes ('buboes'); the lung form spreads person to person and kills fast. |
| `DISEASE/Plague/Found` | PROSE | **Found**: Rare now; pockets in Africa, Asia, the Americas. |
| `DISEASE/Plague/Prevent` | PROSE | **Prevent**: Rodent and flea control. |
| `DISEASE/Plague/Treat` | PROSE | **Treat**: Curable with prompt antibiotics. |
| `DISEASE/Plague/fact` | PROSE | **Card fact**: Flea bites. The historical Black Death. |
| `DISEASE/Plague/tropism` | TABLE | It can infect: **lungs, spleen**, and no other organ. |
| `DISEASE/Plague/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Plague/route` | TABLE | It enters the body by the **Bite**, and is a **Bacteria**. |
| `DISEASE/Plague/stats` | TABLE | Contagion 4/5, severity 5/5, speed 4/5, cunning 3/5; tier Legendary. |

### Scrub typhus

**Type** Bacteria · **Route** Bite · **Class** ICB · **Infects** lungs, brain · **Contagion** 1/5 · **Severity** 4/5 · **Speed** 3/5 · **Cunning** 2/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Scrub typhus/Discovered` | PROSE | **Discovered**: Recognised in Asia; a major cause of fever in India. |
| `DISEASE/Scrub typhus/Causes` | PROSE | **Causes**: Fever with a black scab at the mite bite; can cause pneumonia and brain inflammation. |
| `DISEASE/Scrub typhus/Found` | PROSE | **Found**: The 'tsutsugamushi triangle'. Including India. |
| `DISEASE/Scrub typhus/Prevent` | PROSE | **Prevent**: Avoid mite-infested scrub; protective clothing. |
| `DISEASE/Scrub typhus/Treat` | PROSE | **Treat**: Doxycycline. Cheap and highly effective. |
| `DISEASE/Scrub typhus/tropism` | TABLE | It can infect: **lungs, brain**, and no other organ. |
| `DISEASE/Scrub typhus/class` | TABLE | Its antigen class is **ICB**, so an antibody raised against that class works on it. |
| `DISEASE/Scrub typhus/route` | TABLE | It enters the body by the **Bite**, and is a **Bacteria**. |
| `DISEASE/Scrub typhus/stats` | TABLE | Contagion 1/5, severity 4/5, speed 3/5, cunning 2/5; tier Rare. |

### Malaria

**Type** Malaria · **Route** Bite · **Class** EUK · **Infects** liver · **Contagion** 3/5 · **Severity** 5/5 · **Speed** 3/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Malaria/Discovered` | PROSE | **Discovered**: Ronald Ross proved mosquitoes carry it. In Secunderabad, INDIA, 1897. Nobel Prize. |
| `DISEASE/Malaria/Causes` | PROSE | **Causes**: Bite → LIVER (hides inside liver cells) → bursts into blood → fever cycles, anaemia, cerebral malaria. |
| `DISEASE/Malaria/Found` | PROSE | **Found**: Tropics; still a major disease in India. |
| `DISEASE/Malaria/Prevent` | PROSE | **Prevent**: Nets, repellents, draining standing water. |
| `DISEASE/Malaria/Treat` | PROSE | **Treat**: Antimalarials. P. vivax needs a SECOND drug to clear the liver. Or it relapses months later. |
| `DISEASE/Malaria/tropism` | TABLE | It can infect: **liver**, and no other organ. |
| `DISEASE/Malaria/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Malaria/route` | TABLE | It enters the body by the **Bite**, and is a **Malaria**. |
| `DISEASE/Malaria/stats` | TABLE | Contagion 3/5, severity 5/5, speed 3/5, cunning 5/5; tier Legendary. |

### Malaria (blood)

**Type** Malaria · **Class** EUK · **Infects** spleen, brain · **Contagion** 2/5 · **Severity** 4/5 · **Speed** 3/5 · **Cunning** 3/5 · **Tier** Rare · **Arises from** Malaria via stage

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Malaria (blood)/Discovered` | PROSE | **Discovered**: The blood stage. Merozoites bursting out of the liver. |
| `DISEASE/Malaria (blood)/Causes` | PROSE | **Causes**: Invades red blood cells; causes the classic fever cycles. |
| `DISEASE/Malaria (blood)/Found` | PROSE | **Found**: Tropics. |
| `DISEASE/Malaria (blood)/Prevent` | PROSE | **Prevent**: Mosquito control. |
| `DISEASE/Malaria (blood)/Treat` | PROSE | **Treat**: NOW antibodies and phagocytes can reach it. This is the stage you can actually fight. |
| `DISEASE/Malaria (blood)/tropism` | TABLE | It can infect: **spleen, brain**, and no other organ. |
| `DISEASE/Malaria (blood)/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Malaria (blood)/stats` | TABLE | Contagion 2/5, severity 4/5, speed 3/5, cunning 3/5; tier Rare. |

### Kala-azar

**Type** Parasite · **Route** Bite · **Class** EUK · **Infects** spleen, marrow · **Contagion** 2/5 · **Severity** 5/5 · **Speed** 2/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Kala-azar/Discovered` | PROSE | **Discovered**: Visceral leishmaniasis. Sir Upendranath Brahmachari developed the first cure. In India, 1920. |
| `DISEASE/Kala-azar/Causes` | PROSE | **Causes**: HIDES INSIDE YOUR MACROPHAGES. It turns your own defender cell into its home. Destroys the spleen; fatal untreated. |
| `DISEASE/Kala-azar/Found` | PROSE | **Found**: Bihar, India, has historically carried a large share of the world's cases. |
| `DISEASE/Kala-azar/Prevent` | PROSE | **Prevent**: Sandfly control; indoor spraying. |
| `DISEASE/Kala-azar/Treat` | PROSE | **Treat**: Liposomal amphotericin B. India has driven cases down dramatically. |
| `DISEASE/Kala-azar/tropism` | TABLE | It can infect: **spleen, marrow**, and no other organ. |
| `DISEASE/Kala-azar/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Kala-azar/route` | TABLE | It enters the body by the **Bite**, and is a **Parasite**. |
| `DISEASE/Kala-azar/stats` | TABLE | Contagion 2/5, severity 5/5, speed 2/5, cunning 5/5; tier Legendary. |

### Sleeping sickness

**Type** Parasite · **Route** Bite · **Class** EUK · **Infects** brain · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 2/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Sleeping sickness/Discovered` | PROSE | **Discovered**: African trypanosomiasis; the parasite was found in 1901. |
| `DISEASE/Sleeping sickness/Causes` | PROSE | **Causes**: ANTIGENIC VARIATION. It keeps changing its coat, so your antibodies never quite fit. Eventually invades the brain. |
| `DISEASE/Sleeping sickness/Found` | PROSE | **Found**: Sub-Saharan Africa; spread by the tsetse fly. |
| `DISEASE/Sleeping sickness/Prevent` | PROSE | **Prevent**: Vector control. |
| `DISEASE/Sleeping sickness/Treat` | PROSE | **Treat**: Drugs exist, and cases have collapsed. Its trick. Changing disguise. Is why a vaccine is so hard. |
| `DISEASE/Sleeping sickness/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Sleeping sickness/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Sleeping sickness/route` | TABLE | It enters the body by the **Bite**, and is a **Parasite**. |
| `DISEASE/Sleeping sickness/stats` | TABLE | Contagion 1/5, severity 5/5, speed 2/5, cunning 5/5; tier Legendary. |

### Filariasis

**Type** Worm · **Route** Bite · **Class** EUK · **Infects** marrow, spleen · **Contagion** 2/5 · **Severity** 4/5 · **Speed** 1/5 · **Cunning** 4/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Filariasis/Discovered` | PROSE | **Discovered**: Elephantiasis; the worm was found by Patrick Manson, 1877. |
| `DISEASE/Filariasis/Causes` | PROSE | **Causes**: Adult worms BLOCK YOUR LYMPHATIC VESSELS. Fluid cannot drain, and limbs swell enormously. |
| `DISEASE/Filariasis/Found` | PROSE | **Found**: Tropics; India has run one of the world's largest elimination programmes. |
| `DISEASE/Filariasis/Prevent` | PROSE | **Prevent**: Mass drug administration; mosquito control. |
| `DISEASE/Filariasis/Treat` | PROSE | **Treat**: Antiparasitic drugs kill the worms; the swelling is often permanent. |
| `DISEASE/Filariasis/tropism` | TABLE | It can infect: **marrow, spleen**, and no other organ. |
| `DISEASE/Filariasis/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Filariasis/route` | TABLE | It enters the body by the **Bite**, and is a **Worm**. |
| `DISEASE/Filariasis/stats` | TABLE | Contagion 2/5, severity 4/5, speed 1/5, cunning 4/5; tier Legendary. |

### Snake venom

**Type** Venom · **Route** Bite · **Class** TOX · **Infects** heart, kidneys · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 5/5 · **Cunning** 1/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Snake venom/Discovered` | PROSE | **Discovered**: Antivenom invented by Albert Calmette, 1895. Using antibodies from horses. |
| `DISEASE/Snake venom/Causes` | PROSE | **Causes**: Not alive, not a germ. A mix of toxic proteins. Attacks heart, kidneys and nerves. |
| `DISEASE/Snake venom/Found` | PROSE | **Found**: India has the world's highest snakebite death toll. Roughly 58,000 a year. |
| `DISEASE/Snake venom/Prevent` | PROSE | **Prevent**: Boots and a torch after dark; never reach blindly into grass. |
| `DISEASE/Snake venom/Treat` | PROSE | **Treat**: ANTIVENOM. Borrowed antibodies. PASSIVE immunity: instant, but temporary. |
| `DISEASE/Snake venom/tropism` | TABLE | It can infect: **heart, kidneys**, and no other organ. |
| `DISEASE/Snake venom/class` | TABLE | Its antigen class is **TOX**, so an antibody raised against that class works on it. |
| `DISEASE/Snake venom/route` | TABLE | It enters the body by the **Bite**, and is a **Venom**. |
| `DISEASE/Snake venom/stats` | TABLE | Contagion 1/5, severity 5/5, speed 5/5, cunning 1/5; tier Legendary. |

### Russell's viper venom

**Type** Venom · **Route** Bite · **Class** TOX · **Infects** kidneys · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 5/5 · **Cunning** 1/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Russell's viper venom/Discovered` | PROSE | **Discovered**: One of India's 'Big Four' snakes. |
| `DISEASE/Russell's viper venom/Causes` | PROSE | **Causes**: Destroys blood clotting and shreds the KIDNEYS. A leading cause of snakebite death in India. |
| `DISEASE/Russell's viper venom/Found` | PROSE | **Found**: Across the Indian subcontinent. |
| `DISEASE/Russell's viper venom/Prevent` | PROSE | **Prevent**: Boots; clear rubble near homes; torch at night. |
| `DISEASE/Russell's viper venom/Treat` | PROSE | **Treat**: Antivenom, urgently. Dialysis may be needed for the kidneys. |
| `DISEASE/Russell's viper venom/tropism` | TABLE | It can infect: **kidneys**, and no other organ. |
| `DISEASE/Russell's viper venom/class` | TABLE | Its antigen class is **TOX**, so an antibody raised against that class works on it. |
| `DISEASE/Russell's viper venom/route` | TABLE | It enters the body by the **Bite**, and is a **Venom**. |
| `DISEASE/Russell's viper venom/stats` | TABLE | Contagion 1/5, severity 5/5, speed 5/5, cunning 1/5; tier Legendary. |

### Red scorpion sting

**Type** Venom · **Route** Bite · **Class** TOX · **Infects** heart, lungs · **Contagion** 1/5 · **Severity** 4/5 · **Speed** 5/5 · **Cunning** 1/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Red scorpion sting/Discovered` | PROSE | **Discovered**: Indian red scorpion. Among the most lethal scorpions in the world. |
| `DISEASE/Red scorpion sting/Causes` | PROSE | **Causes**: Venom floods the body with adrenaline; the HEART and LUNGS fail. |
| `DISEASE/Red scorpion sting/Found` | PROSE | **Found**: Western and southern India; a major cause of child deaths in some districts. |
| `DISEASE/Red scorpion sting/Prevent` | PROSE | **Prevent**: Shake out shoes; seal home floors. |
| `DISEASE/Red scorpion sting/Treat` | PROSE | **Treat**: The drug prazosin transformed survival. An Indian medical breakthrough. |
| `DISEASE/Red scorpion sting/tropism` | TABLE | It can infect: **heart, lungs**, and no other organ. |
| `DISEASE/Red scorpion sting/class` | TABLE | Its antigen class is **TOX**, so an antibody raised against that class works on it. |
| `DISEASE/Red scorpion sting/route` | TABLE | It enters the body by the **Bite**, and is a **Venom**. |
| `DISEASE/Red scorpion sting/stats` | TABLE | Contagion 1/5, severity 4/5, speed 5/5, cunning 1/5; tier Rare. |

### Tetanus

**Type** Bacteria · **Route** Wound · **Class** EXB · **Infects** brain · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 3/5 · **Cunning** 3/5 · **Tier** Rare · **Produces** Tetanus toxin

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Tetanus/Discovered` | PROSE | **Discovered**: Toxin isolated 1890 by Kitasato and von Behring. |
| `DISEASE/Tetanus/Causes` | PROSE | **Causes**: Its TOXIN locks the muscles rigid. 'lockjaw'. Not contagious at all. |
| `DISEASE/Tetanus/Found` | PROSE | **Found**: Soil and rusty metal, worldwide. |
| `DISEASE/Tetanus/Prevent` | PROSE | **Prevent**: Tetanus vaccine and boosters; clean wounds. |
| `DISEASE/Tetanus/Treat` | PROSE | **Treat**: Antitoxin and intensive care. Only antibodies can neutralise a toxin. |
| `DISEASE/Tetanus/fact` | PROSE | **Card fact**: A toxin that locks muscles ('lockjaw'). |
| `DISEASE/Tetanus/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Tetanus/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Tetanus/route` | TABLE | It enters the body by the **Wound**, and is a **Bacteria**. |
| `DISEASE/Tetanus/stats` | TABLE | Contagion 1/5, severity 5/5, speed 3/5, cunning 3/5; tier Rare. |

### MRSA

**Type** Bacteria · **Route** Wound · **Class** EXB · **Infects** ANY organ · **Contagion** 3/5 · **Severity** 4/5 · **Speed** 3/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/MRSA/Discovered` | PROSE | **Discovered**: Methicillin-resistant Staph aureus, first seen 1961. |
| `DISEASE/MRSA/Causes` | PROSE | **Causes**: Skin abscesses. And in the blood it can seed ANY organ, including heart valves. |
| `DISEASE/MRSA/Found` | PROSE | **Found**: Worldwide, especially hospitals. |
| `DISEASE/MRSA/Prevent` | PROSE | **Prevent**: Hand hygiene; careful antibiotic use. |
| `DISEASE/MRSA/Treat` | PROSE | **Treat**: Only a few antibiotics still work. The classic superbug. |
| `DISEASE/MRSA/fact` | PROSE | **Card fact**: A superbug. In the blood it can seed ANY organ, including heart valves. |
| `DISEASE/MRSA/tropism` | TABLE | It can infect: **ANY organ**. |
| `DISEASE/MRSA/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/MRSA/route` | TABLE | It enters the body by the **Wound**, and is a **Bacteria**. |
| `DISEASE/MRSA/stats` | TABLE | Contagion 3/5, severity 4/5, speed 3/5, cunning 5/5; tier Legendary. |

### Cellulitis

**Type** Bacteria · **Route** Wound · **Class** EXB · **Infects** marrow, heart · **Contagion** 2/5 · **Severity** 3/5 · **Speed** 3/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Cellulitis/Discovered` | PROSE | **Discovered**: Caused by Streptococcus or Staphylococcus. |
| `DISEASE/Cellulitis/Causes` | PROSE | **Causes**: Hot, red, spreading skin infection; can reach blood, bone and heart valves. |
| `DISEASE/Cellulitis/Found` | PROSE | **Found**: Worldwide. |
| `DISEASE/Cellulitis/Prevent` | PROSE | **Prevent**: Clean and cover cuts. |
| `DISEASE/Cellulitis/Treat` | PROSE | **Treat**: Antibiotics. |
| `DISEASE/Cellulitis/fact` | PROSE | **Card fact**: Staph/Strep skin infection; can settle on heart valves. |
| `DISEASE/Cellulitis/tropism` | TABLE | It can infect: **marrow, heart**, and no other organ. |
| `DISEASE/Cellulitis/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Cellulitis/route` | TABLE | It enters the body by the **Wound**, and is a **Bacteria**. |
| `DISEASE/Cellulitis/stats` | TABLE | Contagion 2/5, severity 3/5, speed 3/5, cunning 2/5; tier Common. |

### Leptospirosis

**Type** Bacteria · **Route** Wound · **Class** EXB · **Infects** kidneys, liver · **Contagion** 2/5 · **Severity** 4/5 · **Speed** 3/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Leptospirosis/Discovered` | PROSE | **Discovered**: Bacterium identified 1907. |
| `DISEASE/Leptospirosis/Causes` | PROSE | **Causes**: Fever, then kidney and liver failure (Weil's disease). |
| `DISEASE/Leptospirosis/Found` | PROSE | **Found**: Tropics; a monsoon and flood disease in India. |
| `DISEASE/Leptospirosis/Prevent` | PROSE | **Prevent**: Avoid wading in floodwater with open cuts; rodent control. |
| `DISEASE/Leptospirosis/Treat` | PROSE | **Treat**: Antibiotics, early. |
| `DISEASE/Leptospirosis/fact` | PROSE | **Card fact**: Enters through cuts in floodwater. A monsoon risk. |
| `DISEASE/Leptospirosis/tropism` | TABLE | It can infect: **kidneys, liver**, and no other organ. |
| `DISEASE/Leptospirosis/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Leptospirosis/route` | TABLE | It enters the body by the **Wound**, and is a **Bacteria**. |
| `DISEASE/Leptospirosis/stats` | TABLE | Contagion 2/5, severity 4/5, speed 3/5, cunning 2/5; tier Common. |

### Gas gangrene

**Type** Bacteria · **Route** Wound · **Class** EXB · **Infects** kidneys, liver · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 5/5 · **Cunning** 2/5 · **Tier** Rare · **Moves fast**: 3 steps per spread · **Produces** Clostridial toxin

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Gas gangrene/Discovered` | PROSE | **Discovered**: Clostridium perfringens. Notorious in the trenches of WWI. |
| `DISEASE/Gas gangrene/Causes` | PROSE | **Causes**: Destroys tissue fast, producing gas; its toxins poison the kidneys. |
| `DISEASE/Gas gangrene/Found` | PROSE | **Found**: Worldwide, in deep dirty wounds. |
| `DISEASE/Gas gangrene/Prevent` | PROSE | **Prevent**: Clean deep wounds promptly. |
| `DISEASE/Gas gangrene/Treat` | PROSE | **Treat**: Surgery plus antibiotics. A true emergency. |
| `DISEASE/Gas gangrene/fact` | PROSE | **Card fact**: Destroys deep tissue fast; a surgical emergency. |
| `DISEASE/Gas gangrene/tropism` | TABLE | It can infect: **kidneys, liver**, and no other organ. |
| `DISEASE/Gas gangrene/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Gas gangrene/route` | TABLE | It enters the body by the **Wound**, and is a **Bacteria**. |
| `DISEASE/Gas gangrene/stats` | TABLE | Contagion 1/5, severity 5/5, speed 5/5, cunning 2/5; tier Rare. |

### Syphilis

**Type** Bacteria · **Route** Contact · **Class** EXB · **Infects** brain, heart · **Contagion** 3/5 · **Severity** 4/5 · **Speed** 1/5 · **Cunning** 5/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Syphilis/Discovered` | PROSE | **Discovered**: Bacterium found 1905; the first 'magic bullet' drug (Salvarsan) targeted it. |
| `DISEASE/Syphilis/Causes` | PROSE | **Causes**: Progresses over years to attack the brain and heart. Can pass to an unborn baby. |
| `DISEASE/Syphilis/Found` | PROSE | **Found**: Worldwide; rising again. |
| `DISEASE/Syphilis/Prevent` | PROSE | **Prevent**: Safe practices; screening in pregnancy. |
| `DISEASE/Syphilis/Treat` | PROSE | **Treat**: Penicillin. Still completely effective after 80 years. |
| `DISEASE/Syphilis/tropism` | TABLE | It can infect: **brain, heart**, and no other organ. |
| `DISEASE/Syphilis/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Syphilis/route` | TABLE | It enters the body by the **Contact**, and is a **Bacteria**. |
| `DISEASE/Syphilis/stats` | TABLE | Contagion 3/5, severity 4/5, speed 1/5, cunning 5/5; tier Rare. |

### Brucellosis

**Type** Bacteria · **Route** Wound · **Class** ICB · **Infects** spleen, liver · **Contagion** 2/5 · **Severity** 3/5 · **Speed** 1/5 · **Cunning** 3/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Brucellosis/Discovered` | PROSE | **Discovered**: Traced to goat's milk by David Bruce, 1887. |
| `DISEASE/Brucellosis/Causes` | PROSE | **Causes**: Undulating fever; settles in the spleen, liver and bones. |
| `DISEASE/Brucellosis/Found` | PROSE | **Found**: Worldwide, from unpasteurised milk and infected livestock. |
| `DISEASE/Brucellosis/Prevent` | PROSE | **Prevent**: Pasteurise milk; vaccinate animals. |
| `DISEASE/Brucellosis/Treat` | PROSE | **Treat**: Long courses of antibiotics. |
| `DISEASE/Brucellosis/tropism` | TABLE | It can infect: **spleen, liver**, and no other organ. |
| `DISEASE/Brucellosis/class` | TABLE | Its antigen class is **ICB**, so an antibody raised against that class works on it. |
| `DISEASE/Brucellosis/route` | TABLE | It enters the body by the **Wound**, and is a **Bacteria**. |
| `DISEASE/Brucellosis/stats` | TABLE | Contagion 2/5, severity 3/5, speed 1/5, cunning 3/5; tier Common. |

### Cold sore

**Type** Hidden Virus · **Route** Wound · **Class** ENV · **Infects** brain · **Contagion** 4/5 · **Severity** 1/5 · **Speed** 2/5 · **Cunning** 5/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Cold sore/Discovered` | PROSE | **Discovered**: Herpes simplex virus; known since antiquity. |
| `DISEASE/Cold sore/Causes` | PROSE | **Causes**: Blisters on the lip. Then retreats into your NERVES to hide from antibodies. |
| `DISEASE/Cold sore/Found` | PROSE | **Found**: Worldwide; most adults carry it. |
| `DISEASE/Cold sore/Prevent` | PROSE | **Prevent**: Avoid contact during an outbreak. |
| `DISEASE/Cold sore/Treat` | PROSE | **Treat**: Antivirals shorten attacks. It is never fully cleared. |
| `DISEASE/Cold sore/fact` | PROSE | **Card fact**: Retreats into nerves to hide from antibodies. |
| `DISEASE/Cold sore/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Cold sore/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Cold sore/route` | TABLE | It enters the body by the **Wound**, and is a **Hidden Virus**. |
| `DISEASE/Cold sore/stats` | TABLE | Contagion 4/5, severity 1/5, speed 2/5, cunning 5/5; tier Common. |

### Human papillomavirus

**Type** Hidden Virus · **Route** Contact · **Class** NAK · **Infects** liver · **Contagion** 5/5 · **Severity** 4/5 · **Speed** 1/5 · **Cunning** 5/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Human papillomavirus/Discovered` | PROSE | **Discovered**: Link to cervical cancer proven by Harald zur Hausen (Nobel Prize, 2008). |
| `DISEASE/Human papillomavirus/Causes` | PROSE | **Causes**: Hides inside cells for years and can turn them cancerous. It causes almost ALL cervical cancer. |
| `DISEASE/Human papillomavirus/Found` | PROSE | **Found**: Worldwide; most adults meet it at some point. |
| `DISEASE/Human papillomavirus/Prevent` | PROSE | **Prevent**: The HPV VACCINE. The first vaccine that prevents a cancer. India began rolling it out nationally; it works best given before exposure. |
| `DISEASE/Human papillomavirus/Treat` | PROSE | **Treat**: No antiviral. Screening catches early changes. This is the clearest case in the whole deck of a vaccine stopping a cancer before it starts. |
| `DISEASE/Human papillomavirus/tropism` | TABLE | It can infect: **liver**, and no other organ. |
| `DISEASE/Human papillomavirus/class` | TABLE | Its antigen class is **NAK**, so an antibody raised against that class works on it. |
| `DISEASE/Human papillomavirus/route` | TABLE | It enters the body by the **Contact**, and is a **Hidden Virus**. |
| `DISEASE/Human papillomavirus/stats` | TABLE | Contagion 5/5, severity 4/5, speed 1/5, cunning 5/5; tier Rare. |

### Ebola

**Type** Virus · **Route** Wound · **Class** ENV · **Infects** liver, spleen · **Contagion** 3/5 · **Severity** 5/5 · **Speed** 4/5 · **Cunning** 3/5 · **Tier** Legendary · **Moves fast**: 2 steps per spread

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Ebola/Discovered` | PROSE | **Discovered**: First outbreak near the Ebola River, 1976. |
| `DISEASE/Ebola/Causes` | PROSE | **Causes**: Massive internal bleeding; liver and spleen collapse. Kills up to 90%. |
| `DISEASE/Ebola/Found` | PROSE | **Found**: Central and West Africa. |
| `DISEASE/Ebola/Prevent` | PROSE | **Prevent**: Isolation, protective equipment. And now a working vaccine. |
| `DISEASE/Ebola/Treat` | PROSE | **Treat**: Antibody treatments and supportive care; survival has improved greatly. |
| `DISEASE/Ebola/tropism` | TABLE | It can infect: **liver, spleen**, and no other organ. |
| `DISEASE/Ebola/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Ebola/route` | TABLE | It enters the body by the **Wound**, and is a **Virus**. |
| `DISEASE/Ebola/stats` | TABLE | Contagion 3/5, severity 5/5, speed 4/5, cunning 3/5; tier Legendary. |

### Anthrax

**Type** Toxin · **Route** Wound · **Class** TOX · **Infects** lungs · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 4/5 · **Cunning** 3/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Anthrax/Discovered` | PROSE | **Discovered**: Robert Koch used it in 1876 to PROVE germs cause disease. Pasteur vaccinated sheep in 1881. |
| `DISEASE/Anthrax/Causes` | PROSE | **Causes**: Its TOXIN kills cells directly; the inhaled form is nearly always fatal. |
| `DISEASE/Anthrax/Found` | PROSE | **Found**: Soil worldwide; affects livestock handlers. |
| `DISEASE/Anthrax/Prevent` | PROSE | **Prevent**: Vaccinate livestock; handle hides carefully. |
| `DISEASE/Anthrax/Treat` | PROSE | **Treat**: Antibiotics plus ANTITOXIN. The toxin must be neutralised separately. |
| `DISEASE/Anthrax/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Anthrax/class` | TABLE | Its antigen class is **TOX**, so an antibody raised against that class works on it. |
| `DISEASE/Anthrax/route` | TABLE | It enters the body by the **Wound**, and is a **Toxin**. |
| `DISEASE/Anthrax/stats` | TABLE | Contagion 1/5, severity 5/5, speed 4/5, cunning 3/5; tier Legendary. |

### Hookworm

**Type** Worm · **Route** Wound · **Class** EUK · **Infects** marrow · **Contagion** 3/5 · **Severity** 3/5 · **Speed** 1/5 · **Cunning** 3/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Hookworm/Discovered` | PROSE | **Discovered**: Linked to anaemia by Arthur Looss, 1898. He infected himself by accident. |
| `DISEASE/Hookworm/Causes` | PROSE | **Causes**: Burrows in through BARE SKIN, travels to the gut, and drinks your blood. Causing anaemia. |
| `DISEASE/Hookworm/Found` | PROSE | **Found**: Warm damp soil where people walk barefoot. |
| `DISEASE/Hookworm/Prevent` | PROSE | **Prevent**: Wear shoes; sanitation. |
| `DISEASE/Hookworm/Treat` | PROSE | **Treat**: Deworming tablets plus iron. |
| `DISEASE/Hookworm/tropism` | TABLE | It can infect: **marrow**, and no other organ. |
| `DISEASE/Hookworm/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Hookworm/route` | TABLE | It enters the body by the **Wound**, and is a **Worm**. |
| `DISEASE/Hookworm/stats` | TABLE | Contagion 3/5, severity 3/5, speed 1/5, cunning 3/5; tier Rare. |

### Schistosomiasis

**Type** Worm · **Route** Wound · **Class** EUK · **Infects** liver, spleen · **Contagion** 3/5 · **Severity** 4/5 · **Speed** 1/5 · **Cunning** 4/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Schistosomiasis/Discovered` | PROSE | **Discovered**: Worm found by Theodor Bilharz, 1851. |
| `DISEASE/Schistosomiasis/Causes` | PROSE | **Causes**: Larvae penetrate skin in fresh water; adult worms scar the liver and bladder. |
| `DISEASE/Schistosomiasis/Found` | PROSE | **Found**: Africa, Middle East, parts of Asia. |
| `DISEASE/Schistosomiasis/Prevent` | PROSE | **Prevent**: Avoid infested fresh water; snail control. |
| `DISEASE/Schistosomiasis/Treat` | PROSE | **Treat**: Praziquantel. A single effective drug. |
| `DISEASE/Schistosomiasis/tropism` | TABLE | It can infect: **liver, spleen**, and no other organ. |
| `DISEASE/Schistosomiasis/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Schistosomiasis/route` | TABLE | It enters the body by the **Wound**, and is a **Worm**. |
| `DISEASE/Schistosomiasis/stats` | TABLE | Contagion 3/5, severity 4/5, speed 1/5, cunning 4/5; tier Rare. |

### Guinea worm

**Type** Worm · **Route** Wound · **Class** EUK · **Infects** marrow · **Contagion** 2/5 · **Severity** 3/5 · **Speed** 1/5 · **Cunning** 2/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Guinea worm/Discovered` | PROSE | **Discovered**: Ancient. Possibly the 'fiery serpent' of the Bible. |
| `DISEASE/Guinea worm/Causes` | PROSE | **Causes**: A metre-long worm slowly emerges through the skin. |
| `DISEASE/Guinea worm/Found` | PROSE | **Found**: ALMOST ERADICATED. From 3.5 million cases in 1986 to a handful today. |
| `DISEASE/Guinea worm/Prevent` | PROSE | **Prevent**: Filter drinking water. No drug, no vaccine. Just clean water. |
| `DISEASE/Guinea worm/Treat` | PROSE | **Treat**: Wind the worm out slowly. Proof that prevention alone can defeat a disease. |
| `DISEASE/Guinea worm/tropism` | TABLE | It can infect: **marrow**, and no other organ. |
| `DISEASE/Guinea worm/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Guinea worm/route` | TABLE | It enters the body by the **Wound**, and is a **Worm**. |
| `DISEASE/Guinea worm/stats` | TABLE | Contagion 2/5, severity 3/5, speed 1/5, cunning 2/5; tier Rare. |

### Histoplasmosis

**Type** Fungus · **Route** Wound · **Class** EUK · **Infects** lungs, spleen · **Contagion** 1/5 · **Severity** 3/5 · **Speed** 2/5 · **Cunning** 3/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Histoplasmosis/Discovered` | PROSE | **Discovered**: Described 1906. |
| `DISEASE/Histoplasmosis/Causes` | PROSE | **Causes**: A fungus from soil with bird or bat droppings; attacks the lungs and spleen. |
| `DISEASE/Histoplasmosis/Found` | PROSE | **Found**: Worldwide, including river valleys of India. |
| `DISEASE/Histoplasmosis/Prevent` | PROSE | **Prevent**: Avoid dusty caves and bird roosts. |
| `DISEASE/Histoplasmosis/Treat` | PROSE | **Treat**: Antifungals; often self-limiting in healthy people. |
| `DISEASE/Histoplasmosis/tropism` | TABLE | It can infect: **lungs, spleen**, and no other organ. |
| `DISEASE/Histoplasmosis/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Histoplasmosis/route` | TABLE | It enters the body by the **Wound**, and is a **Fungus**. |
| `DISEASE/Histoplasmosis/stats` | TABLE | Contagion 1/5, severity 3/5, speed 2/5, cunning 3/5; tier Common. |

### Typhoid

**Type** Bacteria · **Route** Gut · **Class** EXB · **Infects** liver, spleen · **Contagion** 3/5 · **Severity** 4/5 · **Speed** 2/5 · **Cunning** 4/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Typhoid/Discovered` | PROSE | **Discovered**: Salmonella Typhi; 'Typhoid Mary' spread it while healthy herself. |
| `DISEASE/Typhoid/Causes` | PROSE | **Causes**: Prolonged high fever; infects the liver, spleen and gut. |
| `DISEASE/Typhoid/Found` | PROSE | **Found**: Where sanitation is poor. Common in South Asia. |
| `DISEASE/Typhoid/Prevent` | PROSE | **Prevent**: Clean water; typhoid conjugate vaccine. |
| `DISEASE/Typhoid/Treat` | PROSE | **Treat**: Antibiotics. But drug-resistant typhoid is spreading in India and Pakistan. |
| `DISEASE/Typhoid/fact` | PROSE | **Card fact**: Unclean water; hits liver and spleen. |
| `DISEASE/Typhoid/tropism` | TABLE | It can infect: **liver, spleen**, and no other organ. |
| `DISEASE/Typhoid/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Typhoid/route` | TABLE | It enters the body by the **Gut**, and is a **Bacteria**. |
| `DISEASE/Typhoid/stats` | TABLE | Contagion 3/5, severity 4/5, speed 2/5, cunning 4/5; tier Rare. |

### Cholera

**Type** Bacteria · **Route** Gut · **Class** EXB · **Infects** kidneys · **Contagion** 4/5 · **Severity** 5/5 · **Speed** 5/5 · **Cunning** 2/5 · **Tier** Legendary · **Moves fast**: 2 steps per spread · **Produces** Cholera toxin

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Cholera/Discovered` | PROSE | **Discovered**: John Snow traced it to a London water pump in 1854. The birth of epidemiology. |
| `DISEASE/Cholera/Causes` | PROSE | **Causes**: Its TOXIN forces the gut to pour out litres of water. Dehydration kills within hours. |
| `DISEASE/Cholera/Found` | PROSE | **Found**: Outbreaks wherever water is contaminated. |
| `DISEASE/Cholera/Prevent` | PROSE | **Prevent**: Clean water and sanitation; oral vaccine. |
| `DISEASE/Cholera/Treat` | PROSE | **Treat**: Oral rehydration salts (ORS). Simple, cheap, and one of the great lifesavers. |
| `DISEASE/Cholera/fact` | PROSE | **Card fact**: Dehydration wrecks the kidneys. |
| `DISEASE/Cholera/tropism` | TABLE | It can infect: **kidneys**, and no other organ. |
| `DISEASE/Cholera/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Cholera/route` | TABLE | It enters the body by the **Gut**, and is a **Bacteria**. |
| `DISEASE/Cholera/stats` | TABLE | Contagion 4/5, severity 5/5, speed 5/5, cunning 2/5; tier Legendary. |

### Dysentery

**Type** Bacteria · **Route** Gut · **Class** ICB · **Infects** kidneys · **Contagion** 4/5 · **Severity** 3/5 · **Speed** 4/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Dysentery/Discovered` | PROSE | **Discovered**: Shigella, identified by Kiyoshi Shiga, 1897. |
| `DISEASE/Dysentery/Causes` | PROSE | **Causes**: Bloody diarrhoea; can damage the kidneys. |
| `DISEASE/Dysentery/Found` | PROSE | **Found**: Where hygiene is poor. |
| `DISEASE/Dysentery/Prevent` | PROSE | **Prevent**: Handwashing, clean water. |
| `DISEASE/Dysentery/Treat` | PROSE | **Treat**: Rehydration; antibiotics when severe. |
| `DISEASE/Dysentery/fact` | PROSE | **Card fact**: Bloody diarrhoea from dirty water. |
| `DISEASE/Dysentery/tropism` | TABLE | It can infect: **kidneys**, and no other organ. |
| `DISEASE/Dysentery/class` | TABLE | Its antigen class is **ICB**, so an antibody raised against that class works on it. |
| `DISEASE/Dysentery/route` | TABLE | It enters the body by the **Gut**, and is a **Bacteria**. |
| `DISEASE/Dysentery/stats` | TABLE | Contagion 4/5, severity 3/5, speed 4/5, cunning 2/5; tier Common. |

### Food poisoning

**Type** Bacteria · **Route** Gut · **Class** EXB · **Infects** kidneys · **Contagion** 3/5 · **Severity** 2/5 · **Speed** 4/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Food poisoning/Discovered` | PROSE | **Discovered**: E. coli described by Theodor Escherich, 1885. |
| `DISEASE/Food poisoning/Causes` | PROSE | **Causes**: Cramps and diarrhoea; some strains harm the kidneys. |
| `DISEASE/Food poisoning/Found` | PROSE | **Found**: Worldwide. |
| `DISEASE/Food poisoning/Prevent` | PROSE | **Prevent**: Cook food properly; wash hands. |
| `DISEASE/Food poisoning/Treat` | PROSE | **Treat**: Usually self-limiting; rehydration. |
| `DISEASE/Food poisoning/fact` | PROSE | **Card fact**: Some E. coli damage the kidneys (HUS). |
| `DISEASE/Food poisoning/tropism` | TABLE | It can infect: **kidneys**, and no other organ. |
| `DISEASE/Food poisoning/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Food poisoning/route` | TABLE | It enters the body by the **Gut**, and is a **Bacteria**. |
| `DISEASE/Food poisoning/stats` | TABLE | Contagion 3/5, severity 2/5, speed 4/5, cunning 2/5; tier Common. |

### Listeria

**Type** Bacteria · **Route** Gut · **Class** ICB · **Infects** brain · **Contagion** 2/5 · **Severity** 4/5 · **Speed** 2/5 · **Cunning** 4/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Listeria/Discovered` | PROSE | **Discovered**: Named after Joseph Lister, 1940. |
| `DISEASE/Listeria/Causes` | PROSE | **Causes**: Survives refrigeration; crosses into the BRAIN and the placenta. |
| `DISEASE/Listeria/Found` | PROSE | **Found**: Soft cheeses, deli meats; worldwide. |
| `DISEASE/Listeria/Prevent` | PROSE | **Prevent**: Avoid unpasteurised dairy in pregnancy. |
| `DISEASE/Listeria/Treat` | PROSE | **Treat**: Antibiotics. |
| `DISEASE/Listeria/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Listeria/class` | TABLE | Its antigen class is **ICB**, so an antibody raised against that class works on it. |
| `DISEASE/Listeria/route` | TABLE | It enters the body by the **Gut**, and is a **Bacteria**. |
| `DISEASE/Listeria/stats` | TABLE | Contagion 2/5, severity 4/5, speed 2/5, cunning 4/5; tier Rare. |

### Stomach ulcer (H. pylori)

**Type** Bacteria · **Route** Gut · **Class** EXB · **Infects** liver · **Contagion** 3/5 · **Severity** 2/5 · **Speed** 1/5 · **Cunning** 4/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Stomach ulcer (H. pylori)/Discovered` | PROSE | **Discovered**: Barry Marshall DRANK the bacteria in 1984 to prove they cause ulcers. He won the Nobel Prize. |
| `DISEASE/Stomach ulcer (H. pylori)/Causes` | PROSE | **Causes**: Burrows into the stomach lining; causes ulcers and stomach cancer. |
| `DISEASE/Stomach ulcer (H. pylori)/Found` | PROSE | **Found**: Perhaps half the world carries it. |
| `DISEASE/Stomach ulcer (H. pylori)/Prevent` | PROSE | **Prevent**: Hygiene and clean water. |
| `DISEASE/Stomach ulcer (H. pylori)/Treat` | PROSE | **Treat**: Antibiotics CURE it. Ulcers were once thought to be caused by stress. |
| `DISEASE/Stomach ulcer (H. pylori)/tropism` | TABLE | It can infect: **liver**, and no other organ. |
| `DISEASE/Stomach ulcer (H. pylori)/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Stomach ulcer (H. pylori)/route` | TABLE | It enters the body by the **Gut**, and is a **Bacteria**. |
| `DISEASE/Stomach ulcer (H. pylori)/stats` | TABLE | Contagion 3/5, severity 2/5, speed 1/5, cunning 4/5; tier Common. |

### Rotavirus

**Type** Virus · **Route** Gut · **Class** NAK · **Infects** kidneys · **Contagion** 5/5 · **Severity** 3/5 · **Speed** 4/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Rotavirus/Discovered` | PROSE | **Discovered**: Discovered 1973. |
| `DISEASE/Rotavirus/Causes` | PROSE | **Causes**: Severe diarrhoea and dehydration in young children. |
| `DISEASE/Rotavirus/Found` | PROSE | **Found**: Worldwide; a leading killer of children before vaccines. |
| `DISEASE/Rotavirus/Prevent` | PROSE | **Prevent**: Rotavirus vaccine. Now in India's immunisation programme. |
| `DISEASE/Rotavirus/Treat` | PROSE | **Treat**: Oral rehydration. |
| `DISEASE/Rotavirus/fact` | PROSE | **Card fact**: A top cause of child diarrhoea. Vaccine-preventable. |
| `DISEASE/Rotavirus/tropism` | TABLE | It can infect: **kidneys**, and no other organ. |
| `DISEASE/Rotavirus/class` | TABLE | Its antigen class is **NAK**, so an antibody raised against that class works on it. |
| `DISEASE/Rotavirus/route` | TABLE | It enters the body by the **Gut**, and is a **Virus**. |
| `DISEASE/Rotavirus/stats` | TABLE | Contagion 5/5, severity 3/5, speed 4/5, cunning 2/5; tier Common. |

### Hepatitis A

**Type** Virus · **Route** Gut · **Class** NAK · **Infects** liver · **Contagion** 3/5 · **Severity** 2/5 · **Speed** 2/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Hepatitis A/Discovered` | PROSE | **Discovered**: Virus identified 1973. |
| `DISEASE/Hepatitis A/Causes` | PROSE | **Causes**: Liver inflammation and jaundice; no chronic form. |
| `DISEASE/Hepatitis A/Found` | PROSE | **Found**: Where sanitation is poor. |
| `DISEASE/Hepatitis A/Prevent` | PROSE | **Prevent**: Vaccine; clean food and water. |
| `DISEASE/Hepatitis A/Treat` | PROSE | **Treat**: Rest; recovery is usually complete. |
| `DISEASE/Hepatitis A/fact` | PROSE | **Card fact**: A liver virus from contaminated food or water. |
| `DISEASE/Hepatitis A/tropism` | TABLE | It can infect: **liver**, and no other organ. |
| `DISEASE/Hepatitis A/class` | TABLE | Its antigen class is **NAK**, so an antibody raised against that class works on it. |
| `DISEASE/Hepatitis A/route` | TABLE | It enters the body by the **Gut**, and is a **Virus**. |
| `DISEASE/Hepatitis A/stats` | TABLE | Contagion 3/5, severity 2/5, speed 2/5, cunning 2/5; tier Common. |

### Hepatitis E

**Type** Virus · **Route** Gut · **Class** NAK · **Infects** liver · **Contagion** 3/5 · **Severity** 3/5 · **Speed** 2/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Hepatitis E/Discovered` | PROSE | **Discovered**: Recognised after outbreaks in INDIA in the 1970s-80s. |
| `DISEASE/Hepatitis E/Causes` | PROSE | **Causes**: Liver inflammation; especially dangerous in pregnancy. |
| `DISEASE/Hepatitis E/Found` | PROSE | **Found**: Waterborne; common in South Asia. |
| `DISEASE/Hepatitis E/Prevent` | PROSE | **Prevent**: Clean water. |
| `DISEASE/Hepatitis E/Treat` | PROSE | **Treat**: Supportive care. |
| `DISEASE/Hepatitis E/fact` | PROSE | **Card fact**: Waterborne liver virus. |
| `DISEASE/Hepatitis E/tropism` | TABLE | It can infect: **liver**, and no other organ. |
| `DISEASE/Hepatitis E/class` | TABLE | Its antigen class is **NAK**, so an antibody raised against that class works on it. |
| `DISEASE/Hepatitis E/route` | TABLE | It enters the body by the **Gut**, and is a **Virus**. |
| `DISEASE/Hepatitis E/stats` | TABLE | Contagion 3/5, severity 3/5, speed 2/5, cunning 2/5; tier Common. |

### Norovirus

**Type** Virus · **Route** Gut · **Class** NAK · **Infects** kidneys · **Contagion** 5/5 · **Severity** 2/5 · **Speed** 5/5 · **Cunning** 3/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Norovirus/Discovered` | PROSE | **Discovered**: Traced to an outbreak in Norwalk, Ohio, 1968. |
| `DISEASE/Norovirus/Causes` | PROSE | **Causes**: Sudden violent vomiting and diarrhoea; astonishingly contagious. |
| `DISEASE/Norovirus/Found` | PROSE | **Found**: Worldwide. Famous on cruise ships and in schools. |
| `DISEASE/Norovirus/Prevent` | PROSE | **Prevent**: Handwashing (alcohol gel works poorly here). |
| `DISEASE/Norovirus/Treat` | PROSE | **Treat**: Rehydration; passes in a couple of days. |
| `DISEASE/Norovirus/fact` | PROSE | **Card fact**: The 'winter vomiting' bug. |
| `DISEASE/Norovirus/tropism` | TABLE | It can infect: **kidneys**, and no other organ. |
| `DISEASE/Norovirus/class` | TABLE | Its antigen class is **NAK**, so an antibody raised against that class works on it. |
| `DISEASE/Norovirus/route` | TABLE | It enters the body by the **Gut**, and is a **Virus**. |
| `DISEASE/Norovirus/stats` | TABLE | Contagion 5/5, severity 2/5, speed 5/5, cunning 3/5; tier Rare. |

### Polio

**Type** Virus · **Route** Gut · **Class** NAK · **Infects** brain · **Contagion** 4/5 · **Severity** 5/5 · **Speed** 3/5 · **Cunning** 4/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Polio/Discovered` | PROSE | **Discovered**: Vaccines by Salk (1955) and Sabin (oral, 1961). |
| `DISEASE/Polio/Causes` | PROSE | **Causes**: Enters through the gut; destroys nerve cells and paralyses. |
| `DISEASE/Polio/Found` | PROSE | **Found**: Nearly eradicated. INDIA was declared polio-free in 2014. |
| `DISEASE/Polio/Prevent` | PROSE | **Prevent**: Oral polio vaccine. One of the great public-health triumphs. |
| `DISEASE/Polio/Treat` | PROSE | **Treat**: No cure for the paralysis. Prevention is everything. |
| `DISEASE/Polio/fact` | PROSE | **Card fact**: Enters via the gut, attacks nerves. |
| `DISEASE/Polio/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Polio/class` | TABLE | Its antigen class is **NAK**, so an antibody raised against that class works on it. |
| `DISEASE/Polio/route` | TABLE | It enters the body by the **Gut**, and is a **Virus**. |
| `DISEASE/Polio/stats` | TABLE | Contagion 4/5, severity 5/5, speed 3/5, cunning 4/5; tier Legendary. |

### Botulism

**Type** Toxin · **Route** Gut · **Class** TOX · **Infects** brain · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 5/5 · **Cunning** 3/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Botulism/Discovered` | PROSE | **Discovered**: Toxin identified 1895. The most poisonous substance known to science. |
| `DISEASE/Botulism/Causes` | PROSE | **Causes**: Not alive. Paralyses every muscle, including breathing. A few nanograms can kill. |
| `DISEASE/Botulism/Found` | PROSE | **Found**: Improperly canned or preserved food. |
| `DISEASE/Botulism/Prevent` | PROSE | **Prevent**: Proper canning; never feed honey to infants. |
| `DISEASE/Botulism/Treat` | PROSE | **Treat**: ANTITOXIN. (In tiny doses this same toxin is Botox.) |
| `DISEASE/Botulism/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Botulism/class` | TABLE | Its antigen class is **TOX**, so an antibody raised against that class works on it. |
| `DISEASE/Botulism/route` | TABLE | It enters the body by the **Gut**, and is a **Toxin**. |
| `DISEASE/Botulism/stats` | TABLE | Contagion 1/5, severity 5/5, speed 5/5, cunning 3/5; tier Legendary. |

### Shiga toxin (E. coli O157)

**Type** Toxin · **Route** Gut · **Class** TOX · **Infects** kidneys · **Contagion** 2/5 · **Severity** 5/5 · **Speed** 4/5 · **Cunning** 3/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Shiga toxin (E. coli O157)/Discovered` | PROSE | **Discovered**: Named after Kiyoshi Shiga. |
| `DISEASE/Shiga toxin (E. coli O157)/Causes` | PROSE | **Causes**: Not alive. Destroys the KIDNEYS (haemolytic uraemic syndrome), especially in children. |
| `DISEASE/Shiga toxin (E. coli O157)/Found` | PROSE | **Found**: Undercooked beef, unpasteurised milk. |
| `DISEASE/Shiga toxin (E. coli O157)/Prevent` | PROSE | **Prevent**: Cook meat thoroughly. |
| `DISEASE/Shiga toxin (E. coli O157)/Treat` | PROSE | **Treat**: Supportive care and dialysis. Antibiotics can make it WORSE by releasing more toxin. |
| `DISEASE/Shiga toxin (E. coli O157)/tropism` | TABLE | It can infect: **kidneys**, and no other organ. |
| `DISEASE/Shiga toxin (E. coli O157)/class` | TABLE | Its antigen class is **TOX**, so an antibody raised against that class works on it. |
| `DISEASE/Shiga toxin (E. coli O157)/route` | TABLE | It enters the body by the **Gut**, and is a **Toxin**. |
| `DISEASE/Shiga toxin (E. coli O157)/stats` | TABLE | Contagion 2/5, severity 5/5, speed 4/5, cunning 3/5; tier Rare. |

### Roundworm

**Type** Worm · **Route** Gut · **Class** EUK · **Infects** lungs, liver · **Contagion** 4/5 · **Severity** 3/5 · **Speed** 1/5 · **Cunning** 3/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Roundworm/Discovered` | PROSE | **Discovered**: Ascaris lumbricoides. Grows up to 35 cm long. |
| `DISEASE/Roundworm/Causes` | PROSE | **Causes**: Larvae migrate THROUGH THE LUNGS, then return to the gut. Can block the intestines. |
| `DISEASE/Roundworm/Found` | PROSE | **Found**: Where sanitation is poor. One of the commonest infections on Earth. |
| `DISEASE/Roundworm/Prevent` | PROSE | **Prevent**: Sanitation; deworming programmes. |
| `DISEASE/Roundworm/Treat` | PROSE | **Treat**: Deworming tablets. Too big for any cell to swallow. |
| `DISEASE/Roundworm/tropism` | TABLE | It can infect: **lungs, liver**, and no other organ. |
| `DISEASE/Roundworm/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Roundworm/route` | TABLE | It enters the body by the **Gut**, and is a **Worm**. |
| `DISEASE/Roundworm/stats` | TABLE | Contagion 4/5, severity 3/5, speed 1/5, cunning 3/5; tier Rare. |

### Tapeworm

**Type** Worm · **Route** Gut · **Class** EUK · **Infects** brain · **Contagion** 3/5 · **Severity** 5/5 · **Speed** 1/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Tapeworm/Discovered` | PROSE | **Discovered**: Neurocysticercosis recognised as a major cause of epilepsy. |
| `DISEASE/Tapeworm/Causes` | PROSE | **Causes**: Larvae form cysts IN THE BRAIN. A leading cause of adult-onset epilepsy in India. |
| `DISEASE/Tapeworm/Found` | PROSE | **Found**: Where pigs are raised with poor sanitation. |
| `DISEASE/Tapeworm/Prevent` | PROSE | **Prevent**: Cook pork thoroughly; sanitation; handwashing. |
| `DISEASE/Tapeworm/Treat` | PROSE | **Treat**: Antiparasitic drugs plus anti-seizure medicine. |
| `DISEASE/Tapeworm/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Tapeworm/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Tapeworm/route` | TABLE | It enters the body by the **Gut**, and is a **Worm**. |
| `DISEASE/Tapeworm/stats` | TABLE | Contagion 3/5, severity 5/5, speed 1/5, cunning 5/5; tier Legendary. |

### Whipworm

**Type** Worm · **Route** Gut · **Class** EUK · **Infects** marrow · **Contagion** 3/5 · **Severity** 2/5 · **Speed** 1/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Whipworm/Discovered` | PROSE | **Discovered**: Trichuris trichiura. |
| `DISEASE/Whipworm/Causes` | PROSE | **Causes**: Burrows into the gut wall; causes chronic blood loss and anaemia in children. |
| `DISEASE/Whipworm/Found` | PROSE | **Found**: Warm, humid regions worldwide. |
| `DISEASE/Whipworm/Prevent` | PROSE | **Prevent**: Sanitation; handwashing. |
| `DISEASE/Whipworm/Treat` | PROSE | **Treat**: Deworming tablets. |
| `DISEASE/Whipworm/tropism` | TABLE | It can infect: **marrow**, and no other organ. |
| `DISEASE/Whipworm/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Whipworm/route` | TABLE | It enters the body by the **Gut**, and is a **Worm**. |
| `DISEASE/Whipworm/stats` | TABLE | Contagion 3/5, severity 2/5, speed 1/5, cunning 2/5; tier Common. |

### Amoebiasis

**Type** Parasite · **Route** Gut · **Class** EUK · **Infects** liver · **Contagion** 3/5 · **Severity** 4/5 · **Speed** 2/5 · **Cunning** 4/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Amoebiasis/Discovered` | PROSE | **Discovered**: Entamoeba histolytica. The species name means 'tissue-dissolving'. |
| `DISEASE/Amoebiasis/Causes` | PROSE | **Causes**: Eats through the gut wall and forms a LIVER ABSCESS. |
| `DISEASE/Amoebiasis/Found` | PROSE | **Found**: Common in India and other tropical regions. |
| `DISEASE/Amoebiasis/Prevent` | PROSE | **Prevent**: Clean water; wash vegetables. |
| `DISEASE/Amoebiasis/Treat` | PROSE | **Treat**: Metronidazole; the abscess may need draining. |
| `DISEASE/Amoebiasis/tropism` | TABLE | It can infect: **liver**, and no other organ. |
| `DISEASE/Amoebiasis/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Amoebiasis/route` | TABLE | It enters the body by the **Gut**, and is a **Parasite**. |
| `DISEASE/Amoebiasis/stats` | TABLE | Contagion 3/5, severity 4/5, speed 2/5, cunning 4/5; tier Rare. |

### Giardia

**Type** Parasite · **Route** Gut · **Class** EUK · **Infects** liver · **Contagion** 4/5 · **Severity** 2/5 · **Speed** 2/5 · **Cunning** 3/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Giardia/Discovered` | PROSE | **Discovered**: Seen by Antonie van Leeuwenhoek in 1681. In his own stool. |
| `DISEASE/Giardia/Causes` | PROSE | **Causes**: Coats the gut and blocks absorption. You eat, but you starve. Draining your energy. |
| `DISEASE/Giardia/Found` | PROSE | **Found**: Worldwide; 'beaver fever' from streams and unclean water. |
| `DISEASE/Giardia/Prevent` | PROSE | **Prevent**: Filter or boil water. |
| `DISEASE/Giardia/Treat` | PROSE | **Treat**: Antiparasitic drugs. |
| `DISEASE/Giardia/tropism` | TABLE | It can infect: **liver**, and no other organ. |
| `DISEASE/Giardia/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Giardia/route` | TABLE | It enters the body by the **Gut**, and is a **Parasite**. |
| `DISEASE/Giardia/stats` | TABLE | Contagion 4/5, severity 2/5, speed 2/5, cunning 3/5; tier Common. |

### Toxoplasmosis

**Type** Hidden Virus · **Route** Gut · **Class** EUK · **Infects** brain · **Contagion** 4/5 · **Severity** 3/5 · **Speed** 1/5 · **Cunning** 5/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Toxoplasmosis/Discovered` | PROSE | **Discovered**: Identified 1908. |
| `DISEASE/Toxoplasmosis/Causes` | PROSE | **Causes**: Forms silent CYSTS IN THE BRAIN and hides there for life. Dangerous to unborn babies and to people with AIDS. |
| `DISEASE/Toxoplasmosis/Found` | PROSE | **Found**: Worldwide. From undercooked meat and cat faeces. |
| `DISEASE/Toxoplasmosis/Prevent` | PROSE | **Prevent**: Cook meat; pregnant women should avoid cat litter. |
| `DISEASE/Toxoplasmosis/Treat` | PROSE | **Treat**: Drugs only when it reactivates. |
| `DISEASE/Toxoplasmosis/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Toxoplasmosis/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Toxoplasmosis/route` | TABLE | It enters the body by the **Gut**, and is a **Hidden Virus**. |
| `DISEASE/Toxoplasmosis/stats` | TABLE | Contagion 4/5, severity 3/5, speed 1/5, cunning 5/5; tier Rare. |

### Candida

**Type** Fungus · **Route** Gut · **Class** EUK · **Infects** ANY organ · **Contagion** 2/5 · **Severity** 4/5 · **Speed** 2/5 · **Cunning** 4/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Candida/Discovered` | PROSE | **Discovered**: A yeast that lives on almost everyone, harmlessly. |
| `DISEASE/Candida/Causes` | PROSE | **Causes**: Normally kept in check by your immune system and your other microbes. But if either falls, it invades ANY organ. |
| `DISEASE/Candida/Found` | PROSE | **Found**: Everywhere. It is already on you right now. |
| `DISEASE/Candida/Prevent` | PROSE | **Prevent**: Careful antibiotic use. Killing your good bacteria lets Candida bloom. |
| `DISEASE/Candida/Treat` | PROSE | **Treat**: Antifungals. The classic OPPORTUNIST. |
| `DISEASE/Candida/tropism` | TABLE | It can infect: **ANY organ**. |
| `DISEASE/Candida/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Candida/route` | TABLE | It enters the body by the **Gut**, and is a **Fungus**. |
| `DISEASE/Candida/stats` | TABLE | Contagion 2/5, severity 4/5, speed 2/5, cunning 4/5; tier Rare. |

### Scabies

**Type** Parasite · **Route** Contact · **Class** EUK · **Infects** marrow · **Contagion** 5/5 · **Severity** 2/5 · **Speed** 2/5 · **Cunning** 3/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Scabies/Discovered` | PROSE | **Discovered**: The mite was seen under a microscope in 1687. Making scabies one of the FIRST diseases ever proven to have a specific cause. |
| `DISEASE/Scabies/Causes` | PROSE | **Causes**: A mite that burrows into your skin and lays eggs. The unbearable itch is an ALLERGIC reaction to it. Your own immune system causing the misery. |
| `DISEASE/Scabies/Found` | PROSE | **Found**: Worldwide; ~200 million people at any moment. Spreads by prolonged skin-to-skin contact and shared bedding. |
| `DISEASE/Scabies/Prevent` | PROSE | **Prevent**: Treat the whole household at once, and wash all bedding. |
| `DISEASE/Scabies/Treat` | PROSE | **Treat**: Permethrin cream or ivermectin. Cheap and curable. But it keeps coming back if only one person is treated. |
| `DISEASE/Scabies/tropism` | TABLE | It can infect: **marrow**, and no other organ. |
| `DISEASE/Scabies/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Scabies/route` | TABLE | It enters the body by the **Contact**, and is a **Parasite**. |
| `DISEASE/Scabies/stats` | TABLE | Contagion 5/5, severity 2/5, speed 2/5, cunning 3/5; tier Common. |

### Ringworm

**Type** Fungus · **Route** Contact · **Class** EUK · **Infects** lungs · **Contagion** 4/5 · **Severity** 1/5 · **Speed** 2/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Ringworm/Discovered` | PROSE | **Discovered**: Not a worm at all. A FUNGUS. The name comes from the ring-shaped rash. |
| `DISEASE/Ringworm/Causes` | PROSE | **Causes**: A fungus digesting the keratin in your skin, hair and nails. |
| `DISEASE/Ringworm/Found` | PROSE | **Found**: Everywhere. Spreads by touch, shared towels, and from animals. |
| `DISEASE/Ringworm/Prevent` | PROSE | **Prevent**: Do not share towels or combs; keep skin dry. |
| `DISEASE/Ringworm/Treat` | PROSE | **Treat**: Antifungal cream. The commonest fungal infection on Earth. And one of the most misnamed. |
| `DISEASE/Ringworm/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Ringworm/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Ringworm/route` | TABLE | It enters the body by the **Contact**, and is a **Fungus**. |
| `DISEASE/Ringworm/stats` | TABLE | Contagion 4/5, severity 1/5, speed 2/5, cunning 2/5; tier Common. |

### Impetigo

**Type** Bacteria · **Route** Contact · **Class** EXB · **Infects** heart, kidneys · **Contagion** 4/5 · **Severity** 2/5 · **Speed** 3/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Impetigo/Discovered` | PROSE | **Discovered**: Streptococcus or Staphylococcus on the skin. |
| `DISEASE/Impetigo/Causes` | PROSE | **Causes**: Golden crusted sores, mainly in children. Highly contagious by touch. Can lead to kidney damage. |
| `DISEASE/Impetigo/Found` | PROSE | **Found**: Worldwide; common where it is hot and crowded. |
| `DISEASE/Impetigo/Prevent` | PROSE | **Prevent**: Wash hands and cuts; do not share towels. |
| `DISEASE/Impetigo/Treat` | PROSE | **Treat**: Antibiotic cream or tablets. |
| `DISEASE/Impetigo/tropism` | TABLE | It can infect: **heart, kidneys**, and no other organ. |
| `DISEASE/Impetigo/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Impetigo/route` | TABLE | It enters the body by the **Contact**, and is a **Bacteria**. |
| `DISEASE/Impetigo/stats` | TABLE | Contagion 4/5, severity 2/5, speed 3/5, cunning 2/5; tier Common. |

### Trachoma

**Type** Bacteria · **Route** Contact · **Class** ICB · **Infects** brain · **Contagion** 3/5 · **Severity** 4/5 · **Speed** 1/5 · **Cunning** 4/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Trachoma/Discovered` | PROSE | **Discovered**: Chlamydia trachomatis. The SAME species that causes the sexually transmitted infection, arriving by a completely different route. |
| `DISEASE/Trachoma/Causes` | PROSE | **Causes**: Repeated infection scars the eyelid until the lashes turn INWARD and scrape the eye. Blindness comes slowly, over years. |
| `DISEASE/Trachoma/Found` | PROSE | **Found**: The world's leading INFECTIOUS cause of blindness. India has fought a long campaign against it. |
| `DISEASE/Trachoma/Prevent` | PROSE | **Prevent**: Face-washing and clean water. The 'SAFE' strategy. Flies spread it between children's eyes. |
| `DISEASE/Trachoma/Treat` | PROSE | **Treat**: A single dose of azithromycin. Surgery for the eyelid. **A disease of poverty, cured by soap and water.** |
| `DISEASE/Trachoma/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Trachoma/class` | TABLE | Its antigen class is **ICB**, so an antibody raised against that class works on it. |
| `DISEASE/Trachoma/route` | TABLE | It enters the body by the **Contact**, and is a **Bacteria**. |
| `DISEASE/Trachoma/stats` | TABLE | Contagion 3/5, severity 4/5, speed 1/5, cunning 4/5; tier Legendary. |

### Conjunctivitis

**Type** Virus · **Route** Contact · **Class** NAK · **Infects** lungs · **Contagion** 5/5 · **Severity** 1/5 · **Speed** 4/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Conjunctivitis/Discovered` | PROSE | **Discovered**: Adenovirus. 'pink eye'. |
| `DISEASE/Conjunctivitis/Causes` | PROSE | **Causes**: Red, weeping, gritty eyes. Astonishingly contagious: rub your eye, touch a door handle, and the next person has it. |
| `DISEASE/Conjunctivitis/Found` | PROSE | **Found**: Worldwide; sweeps through schools. |
| `DISEASE/Conjunctivitis/Prevent` | PROSE | **Prevent**: Wash hands. Do not share towels or pillows. |
| `DISEASE/Conjunctivitis/Treat` | PROSE | **Treat**: Usually clears itself. A NAKED virus. No envelope, so it survives on surfaces for days and hand-gel works poorly on it. |
| `DISEASE/Conjunctivitis/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Conjunctivitis/class` | TABLE | Its antigen class is **NAK**, so an antibody raised against that class works on it. |
| `DISEASE/Conjunctivitis/route` | TABLE | It enters the body by the **Contact**, and is a **Virus**. |
| `DISEASE/Conjunctivitis/stats` | TABLE | Contagion 5/5, severity 1/5, speed 4/5, cunning 2/5; tier Common. |

### Molluscum contagiosum

**Type** Virus · **Route** Contact · **Class** ENV · **Infects** lungs · **Contagion** 4/5 · **Severity** 1/5 · **Speed** 1/5 · **Cunning** 3/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Molluscum contagiosum/Discovered` | PROSE | **Discovered**: A poxvirus. A distant cousin of smallpox. |
| `DISEASE/Molluscum contagiosum/Causes` | PROSE | **Causes**: Small pearly bumps, spread by skin contact and shared towels. Harmless but stubborn. |
| `DISEASE/Molluscum contagiosum/Found` | PROSE | **Found**: Worldwide; common in children. |
| `DISEASE/Molluscum contagiosum/Prevent` | PROSE | **Prevent**: Do not share towels; cover the bumps. |
| `DISEASE/Molluscum contagiosum/Treat` | PROSE | **Treat**: Usually clears on its own. But it can take a year. Your immune system gets there eventually. |
| `DISEASE/Molluscum contagiosum/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Molluscum contagiosum/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Molluscum contagiosum/route` | TABLE | It enters the body by the **Contact**, and is a **Virus**. |
| `DISEASE/Molluscum contagiosum/stats` | TABLE | Contagion 4/5, severity 1/5, speed 1/5, cunning 3/5; tier Common. |

### Endocarditis

**Type** Bacteria · **Route** Blood · **Class** EXB · **Infects** heart · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 2/5 · **Cunning** 5/5 · **Tier** Legendary · **Moves fast**: 2 steps per spread

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Endocarditis/Discovered` | PROSE | **Discovered**: Infection of the heart valves. Described by William Osler, 1885. |
| `DISEASE/Endocarditis/Causes` | PROSE | **Causes**: Bacteria in the bloodstream settle on a HEART VALVE and build a colony there, where blood flow shields them from your immune cells. |
| `DISEASE/Endocarditis/Found` | PROSE | **Found**: Worldwide. A risk after dental work, IV drug use, or a contaminated line. And after rheumatic fever has damaged a valve. |
| `DISEASE/Endocarditis/Prevent` | PROSE | **Prevent**: Treat bloodstream infections early; look after damaged valves. |
| `DISEASE/Endocarditis/Treat` | PROSE | **Treat**: Weeks of intravenous antibiotics; sometimes surgery to replace the valve. |
| `DISEASE/Endocarditis/tropism` | TABLE | It can infect: **heart**, and no other organ. |
| `DISEASE/Endocarditis/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Endocarditis/route` | TABLE | It enters the body by the **Blood**, and is a **Bacteria**. |
| `DISEASE/Endocarditis/stats` | TABLE | Contagion 1/5, severity 5/5, speed 2/5, cunning 5/5; tier Legendary. |

### Gonorrhoea

**Type** Bacteria · **Route** Contact · **Class** EXB · **Infects** kidneys, heart · **Contagion** 4/5 · **Severity** 3/5 · **Speed** 3/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Gonorrhoea/Discovered` | PROSE | **Discovered**: Bacterium found by Albert Neisser, 1879. |
| `DISEASE/Gonorrhoea/Causes` | PROSE | **Causes**: Infects the reproductive tract; can spread to joints and heart valves. Often causes NO symptoms. So it spreads silently. |
| `DISEASE/Gonorrhoea/Found` | PROSE | **Found**: Worldwide; about 82 million new cases a year. |
| `DISEASE/Gonorrhoea/Prevent` | PROSE | **Prevent**: Condoms; testing and treating partners. |
| `DISEASE/Gonorrhoea/Treat` | PROSE | **Treat**: Antibiotics. But it has now defeated almost every antibiotic we have. The WHO lists it as a PRIORITY superbug. This is antibiotic resistance happening in real time. |
| `DISEASE/Gonorrhoea/tropism` | TABLE | It can infect: **kidneys, heart**, and no other organ. |
| `DISEASE/Gonorrhoea/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Gonorrhoea/route` | TABLE | It enters the body by the **Contact**, and is a **Bacteria**. |
| `DISEASE/Gonorrhoea/stats` | TABLE | Contagion 4/5, severity 3/5, speed 3/5, cunning 5/5; tier Legendary. |

### Chlamydia

**Type** Bacteria · **Route** Contact · **Class** ICB · **Infects** kidneys · **Contagion** 5/5 · **Severity** 3/5 · **Speed** 2/5 · **Cunning** 5/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Chlamydia/Discovered` | PROSE | **Discovered**: Chlamydia trachomatis. The same species that causes trachoma, the leading infectious cause of blindness. |
| `DISEASE/Chlamydia/Causes` | PROSE | **Causes**: An INTRACELLULAR bacterium. It lives inside your cells, where antibodies struggle to reach. Usually silent; can cause infertility. |
| `DISEASE/Chlamydia/Found` | PROSE | **Found**: The commonest bacterial STI in the world. |
| `DISEASE/Chlamydia/Prevent` | PROSE | **Prevent**: Condoms; routine screening. |
| `DISEASE/Chlamydia/Treat` | PROSE | **Treat**: Antibiotics. Easy to cure. But only if you know you have it. |
| `DISEASE/Chlamydia/tropism` | TABLE | It can infect: **kidneys**, and no other organ. |
| `DISEASE/Chlamydia/class` | TABLE | Its antigen class is **ICB**, so an antibody raised against that class works on it. |
| `DISEASE/Chlamydia/route` | TABLE | It enters the body by the **Contact**, and is a **Bacteria**. |
| `DISEASE/Chlamydia/stats` | TABLE | Contagion 5/5, severity 3/5, speed 2/5, cunning 5/5; tier Rare. |

### Genital herpes

**Type** Hidden Virus · **Route** Contact · **Class** ENV · **Infects** brain · **Contagion** 4/5 · **Severity** 2/5 · **Speed** 2/5 · **Cunning** 5/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Genital herpes/Discovered` | PROSE | **Discovered**: Herpes simplex virus type 2. |
| `DISEASE/Genital herpes/Causes` | PROSE | **Causes**: Like a cold sore, it retreats into your NERVES and hides there for life. Antibodies cannot follow it in. |
| `DISEASE/Genital herpes/Found` | PROSE | **Found**: Worldwide; extremely common. |
| `DISEASE/Genital herpes/Prevent` | PROSE | **Prevent**: Condoms reduce but do not eliminate the risk. |
| `DISEASE/Genital herpes/Treat` | PROSE | **Treat**: Antivirals control outbreaks. It is never cleared. A lifelong passenger. |
| `DISEASE/Genital herpes/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Genital herpes/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Genital herpes/route` | TABLE | It enters the body by the **Contact**, and is a **Hidden Virus**. |
| `DISEASE/Genital herpes/stats` | TABLE | Contagion 4/5, severity 2/5, speed 2/5, cunning 5/5; tier Rare. |

### Trichomoniasis

**Type** Parasite · **Route** Contact · **Class** EUK · **Infects** kidneys · **Contagion** 4/5 · **Severity** 2/5 · **Speed** 2/5 · **Cunning** 3/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Trichomoniasis/Discovered` | PROSE | **Discovered**: A single-celled protozoan parasite, described 1836. |
| `DISEASE/Trichomoniasis/Causes` | PROSE | **Causes**: The commonest curable STI on Earth. Often silent. |
| `DISEASE/Trichomoniasis/Found` | PROSE | **Found**: Worldwide. Around 156 million cases a year. |
| `DISEASE/Trichomoniasis/Prevent` | PROSE | **Prevent**: Condoms; treating partners. |
| `DISEASE/Trichomoniasis/Treat` | PROSE | **Treat**: A single course of metronidazole cures it. |
| `DISEASE/Trichomoniasis/tropism` | TABLE | It can infect: **kidneys**, and no other organ. |
| `DISEASE/Trichomoniasis/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Trichomoniasis/route` | TABLE | It enters the body by the **Contact**, and is a **Parasite**. |
| `DISEASE/Trichomoniasis/stats` | TABLE | Contagion 4/5, severity 2/5, speed 2/5, cunning 3/5; tier Common. |

### Hepatitis D

**Type** Hidden Virus · **Route** Blood · **Class** ENV · **Infects** liver · **Contagion** 2/5 · **Severity** 5/5 · **Speed** 2/5 · **Cunning** 5/5 · **Tier** Legendary

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Hepatitis D/Discovered` | PROSE | **Discovered**: Identified 1977. The strangest virus in this deck. |
| `DISEASE/Hepatitis D/Causes` | PROSE | **Causes**: It is INCOMPLETE. It cannot infect you on its own: it can ONLY survive if Hepatitis B is already there, because it borrows Hep B's outer coat. A virus that parasitises another virus. |
| `DISEASE/Hepatitis D/Found` | PROSE | **Found**: Wherever Hepatitis B is; the most severe form of viral hepatitis. |
| `DISEASE/Hepatitis D/Prevent` | PROSE | **Prevent**: The Hepatitis B vaccine ALSO prevents Hepatitis D. Block the host and the passenger cannot land. |
| `DISEASE/Hepatitis D/Treat` | PROSE | **Treat**: Hard to treat. Prevention through the Hep B vaccine is the real answer. |
| `DISEASE/Hepatitis D/tropism` | TABLE | It can infect: **liver**, and no other organ. |
| `DISEASE/Hepatitis D/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Hepatitis D/route` | TABLE | It enters the body by the **Blood**, and is a **Hidden Virus**. |
| `DISEASE/Hepatitis D/stats` | TABLE | Contagion 2/5, severity 5/5, speed 2/5, cunning 5/5; tier Legendary. |

### Transfusion malaria

**Type** Malaria · **Route** Blood · **Class** EUK · **Infects** liver · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 4/5 · **Cunning** 4/5 · **Tier** Rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Transfusion malaria/Discovered` | PROSE | **Discovered**: Malaria delivered straight into the bloodstream by transfused blood. |
| `DISEASE/Transfusion malaria/Causes` | PROSE | **Causes**: It SKIPS the mosquito and skips the tissues. It goes directly to the liver. |
| `DISEASE/Transfusion malaria/Found` | PROSE | **Found**: Anywhere blood is not properly screened. |
| `DISEASE/Transfusion malaria/Prevent` | PROSE | **Prevent**: Screening donated blood. Which is why blood banks test every unit. |
| `DISEASE/Transfusion malaria/Treat` | PROSE | **Treat**: Antimalarials. This is why safe transfusion is a public-health issue, not just a hospital one. |
| `DISEASE/Transfusion malaria/tropism` | TABLE | It can infect: **liver**, and no other organ. |
| `DISEASE/Transfusion malaria/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Transfusion malaria/route` | TABLE | It enters the body by the **Blood**, and is a **Malaria**. |
| `DISEASE/Transfusion malaria/stats` | TABLE | Contagion 1/5, severity 5/5, speed 4/5, cunning 4/5; tier Rare. |

### Catheter sepsis

**Type** Fungus · **Route** Blood · **Class** EUK · **Infects** ANY organ · **Contagion** 1/5 · **Severity** 4/5 · **Speed** 3/5 · **Cunning** 3/5 · **Tier** Rare · **Moves fast**: 2 steps per spread

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Catheter sepsis/Discovered` | PROSE | **Discovered**: A fungal bloodstream infection from a drip line or catheter. |
| `DISEASE/Catheter sepsis/Causes` | PROSE | **Causes**: Candida travelling up a plastic tube straight into your blood, bypassing every barrier you have. |
| `DISEASE/Catheter sepsis/Found` | PROSE | **Found**: Hospitals worldwide. One of the commonest hospital-acquired infections. |
| `DISEASE/Catheter sepsis/Prevent` | PROSE | **Prevent**: Sterile technique; remove lines as soon as they are not needed. |
| `DISEASE/Catheter sepsis/Treat` | PROSE | **Treat**: Antifungals. A reminder that medicine itself can open a door. |
| `DISEASE/Catheter sepsis/tropism` | TABLE | It can infect: **ANY organ**. |
| `DISEASE/Catheter sepsis/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Catheter sepsis/route` | TABLE | It enters the body by the **Blood**, and is a **Fungus**. |
| `DISEASE/Catheter sepsis/stats` | TABLE | Contagion 1/5, severity 4/5, speed 3/5, cunning 3/5; tier Rare. |

### Cannula infection

**Type** Bacteria · **Route** Blood · **Class** EXB · **Infects** heart, marrow · **Contagion** 2/5 · **Severity** 3/5 · **Speed** 3/5 · **Cunning** 2/5 · **Tier** Common

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Cannula infection/Discovered` | PROSE | **Discovered**: Bacteria entering through a drip needle. |
| `DISEASE/Cannula infection/Causes` | PROSE | **Causes**: Staph from the skin, pushed straight into the bloodstream by a needle. Can seed the heart valves. |
| `DISEASE/Cannula infection/Found` | PROSE | **Found**: Hospitals worldwide. |
| `DISEASE/Cannula infection/Prevent` | PROSE | **Prevent**: Clean the skin; change the line; wash hands. |
| `DISEASE/Cannula infection/Treat` | PROSE | **Treat**: Antibiotics. And remove the line. |
| `DISEASE/Cannula infection/tropism` | TABLE | It can infect: **heart, marrow**, and no other organ. |
| `DISEASE/Cannula infection/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Cannula infection/route` | TABLE | It enters the body by the **Blood**, and is a **Bacteria**. |
| `DISEASE/Cannula infection/stats` | TABLE | Contagion 2/5, severity 3/5, speed 3/5, cunning 2/5; tier Common. |

### Tetanus toxin

**Type** Toxin · **Class** TOX · **Infects** brain · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 5/5 · **Cunning** 2/5 · **Tier** Rare · **Arises from** Tetanus via toxin

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Tetanus toxin/Discovered` | PROSE | **Discovered**: Isolated 1890. |
| `DISEASE/Tetanus toxin/Causes` | PROSE | **Causes**: Not alive. Locks the muscles rigid. It does not reproduce. It simply poisons. |
| `DISEASE/Tetanus toxin/Found` | PROSE | **Found**: Released by tetanus bacteria in a wound. |
| `DISEASE/Tetanus toxin/Prevent` | PROSE | **Prevent**: Tetanus vaccine trains you to make ANTITOXIN. |
| `DISEASE/Tetanus toxin/Treat` | PROSE | **Treat**: Only antibodies can neutralise it. No cell can eat a toxin. |
| `DISEASE/Tetanus toxin/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Tetanus toxin/class` | TABLE | Its antigen class is **TOX**, so an antibody raised against that class works on it. |
| `DISEASE/Tetanus toxin/stats` | TABLE | Contagion 1/5, severity 5/5, speed 5/5, cunning 2/5; tier Rare. |

### Cholera toxin

**Type** Toxin · **Class** TOX · **Infects** kidneys · **Contagion** 1/5 · **Severity** 4/5 · **Speed** 5/5 · **Cunning** 2/5 · **Tier** Rare · **Arises from** Cholera via toxin

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Cholera toxin/Discovered` | PROSE | **Discovered**: The reason cholera kills. |
| `DISEASE/Cholera toxin/Causes` | PROSE | **Causes**: Not alive. Forces gut cells to pump out water; the kidneys fail from dehydration. |
| `DISEASE/Cholera toxin/Found` | PROSE | **Found**: Released by cholera bacteria. |
| `DISEASE/Cholera toxin/Prevent` | PROSE | **Prevent**: Clean water. |
| `DISEASE/Cholera toxin/Treat` | PROSE | **Treat**: Rehydration; antibodies neutralise the toxin. |
| `DISEASE/Cholera toxin/tropism` | TABLE | It can infect: **kidneys**, and no other organ. |
| `DISEASE/Cholera toxin/class` | TABLE | Its antigen class is **TOX**, so an antibody raised against that class works on it. |
| `DISEASE/Cholera toxin/stats` | TABLE | Contagion 1/5, severity 4/5, speed 5/5, cunning 2/5; tier Rare. |

### Clostridial toxin

**Type** Toxin · **Class** TOX · **Infects** kidneys, liver · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 5/5 · **Cunning** 2/5 · **Tier** Rare · **Arises from** Gas gangrene via toxin

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Clostridial toxin/Discovered` | PROSE | **Discovered**: The toxin of gas gangrene. |
| `DISEASE/Clostridial toxin/Causes` | PROSE | **Causes**: Not alive. Destroys tissue and poisons the kidneys and liver. |
| `DISEASE/Clostridial toxin/Found` | PROSE | **Found**: Deep dirty wounds. |
| `DISEASE/Clostridial toxin/Prevent` | PROSE | **Prevent**: Clean wounds promptly. |
| `DISEASE/Clostridial toxin/Treat` | PROSE | **Treat**: Antitoxin, surgery, antibiotics. |
| `DISEASE/Clostridial toxin/tropism` | TABLE | It can infect: **kidneys, liver**, and no other organ. |
| `DISEASE/Clostridial toxin/class` | TABLE | Its antigen class is **TOX**, so an antibody raised against that class works on it. |
| `DISEASE/Clostridial toxin/stats` | TABLE | Contagion 1/5, severity 5/5, speed 5/5, cunning 2/5; tier Rare. |

### Diphtheria toxin

**Type** Toxin · **Class** TOX · **Infects** heart · **Contagion** 1/5 · **Severity** 5/5 · **Speed** 5/5 · **Cunning** 2/5 · **Tier** Rare · **Arises from** null via none

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Diphtheria toxin/Discovered` | PROSE | **Discovered**: The toxin von Behring made the first antitoxin against. |
| `DISEASE/Diphtheria toxin/Causes` | PROSE | **Causes**: Not alive. Poisons the HEART muscle directly. |
| `DISEASE/Diphtheria toxin/Found` | PROSE | **Found**: Released by diphtheria bacteria. |
| `DISEASE/Diphtheria toxin/Prevent` | PROSE | **Prevent**: DPT vaccine. |
| `DISEASE/Diphtheria toxin/Treat` | PROSE | **Treat**: Antitoxin. Antibodies, urgently. |
| `DISEASE/Diphtheria toxin/tropism` | TABLE | It can infect: **heart**, and no other organ. |
| `DISEASE/Diphtheria toxin/class` | TABLE | Its antigen class is **TOX**, so an antibody raised against that class works on it. |
| `DISEASE/Diphtheria toxin/stats` | TABLE | Contagion 1/5, severity 5/5, speed 5/5, cunning 2/5; tier Rare. |

### Shingles

**Type** Hidden Virus · **Class** ENV · **Infects** brain · **Contagion** 2/5 · **Severity** 3/5 · **Speed** 2/5 · **Cunning** 5/5 · **Tier** Rare · **Arises from** Chickenpox via rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Shingles/Discovered` | PROSE | **Discovered**: Recognised as reactivated chickenpox, 1953. |
| `DISEASE/Shingles/Causes` | PROSE | **Causes**: The chickenpox virus hid in your nerves for decades and re-emerged. |
| `DISEASE/Shingles/Found` | PROSE | **Found**: Anyone who has had chickenpox. |
| `DISEASE/Shingles/Prevent` | PROSE | **Prevent**: Shingles vaccine. |
| `DISEASE/Shingles/Treat` | PROSE | **Treat**: Antivirals. Proof that some viruses never truly leave. |
| `DISEASE/Shingles/tropism` | TABLE | It can infect: **brain**, and no other organ. |
| `DISEASE/Shingles/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Shingles/stats` | TABLE | Contagion 2/5, severity 3/5, speed 2/5, cunning 5/5; tier Rare. |

### Dengue (ADE)

**Type** Virus · **Class** ENV · **Infects** liver, marrow · **Contagion** 3/5 · **Severity** 5/5 · **Speed** 5/5 · **Cunning** 5/5 · **Tier** Legendary · **Arises from** Dengue via rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Dengue (ADE)/Discovered` | PROSE | **Discovered**: Antibody-dependent enhancement, described in the 1970s. |
| `DISEASE/Dengue (ADE)/Causes` | PROSE | **Causes**: Your antibodies from a PREVIOUS dengue do not neutralise this serotype. They HELP it into your cells. |
| `DISEASE/Dengue (ADE)/Found` | PROSE | **Found**: Tropics. |
| `DISEASE/Dengue (ADE)/Prevent` | PROSE | **Prevent**: Mosquito control. This is exactly why a dengue vaccine is so hard to make. |
| `DISEASE/Dengue (ADE)/Treat` | PROSE | **Treat**: Antibodies will NOT work here. Use cells. |
| `DISEASE/Dengue (ADE)/tropism` | TABLE | It can infect: **liver, marrow**, and no other organ. |
| `DISEASE/Dengue (ADE)/class` | TABLE | Its antigen class is **ENV**, so an antibody raised against that class works on it. |
| `DISEASE/Dengue (ADE)/stats` | TABLE | Contagion 3/5, severity 5/5, speed 5/5, cunning 5/5; tier Legendary. |

### Malaria (relapse)

**Type** Malaria · **Class** EUK · **Infects** liver · **Contagion** 2/5 · **Severity** 4/5 · **Speed** 2/5 · **Cunning** 5/5 · **Tier** Legendary · **Arises from** Malaria via rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Malaria (relapse)/Discovered` | PROSE | **Discovered**: Hypnozoites described 1982. |
| `DISEASE/Malaria (relapse)/Causes` | PROSE | **Causes**: A dormant form of P. vivax slept in your liver and woke months later. From nothing. |
| `DISEASE/Malaria (relapse)/Found` | PROSE | **Found**: Wherever P. vivax occurs, including India. |
| `DISEASE/Malaria (relapse)/Prevent` | PROSE | **Prevent**: Finish the full course of primaquine to clear the liver. |
| `DISEASE/Malaria (relapse)/Treat` | PROSE | **Treat**: A second drug is needed specifically for the liver forms. |
| `DISEASE/Malaria (relapse)/tropism` | TABLE | It can infect: **liver**, and no other organ. |
| `DISEASE/Malaria (relapse)/class` | TABLE | Its antigen class is **EUK**, so an antibody raised against that class works on it. |
| `DISEASE/Malaria (relapse)/stats` | TABLE | Contagion 2/5, severity 4/5, speed 2/5, cunning 5/5; tier Legendary. |

### Tuberculosis (reactivated)

**Type** Bacteria · **Class** ICB · **Infects** lungs · **Contagion** 3/5 · **Severity** 5/5 · **Speed** 1/5 · **Cunning** 5/5 · **Tier** Legendary · **Arises from** Tuberculosis via rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Tuberculosis (reactivated)/Discovered` | PROSE | **Discovered**: Latency has been known since the 19th century. |
| `DISEASE/Tuberculosis (reactivated)/Causes` | PROSE | **Causes**: TB you thought you had beaten was only sleeping. It woke when your defences fell. |
| `DISEASE/Tuberculosis (reactivated)/Found` | PROSE | **Found**: About a quarter of the world carries latent TB. |
| `DISEASE/Tuberculosis (reactivated)/Prevent` | PROSE | **Prevent**: Treat latent TB in high-risk people. |
| `DISEASE/Tuberculosis (reactivated)/Treat` | PROSE | **Treat**: Months of combination antibiotics. |
| `DISEASE/Tuberculosis (reactivated)/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Tuberculosis (reactivated)/class` | TABLE | Its antigen class is **ICB**, so an antibody raised against that class works on it. |
| `DISEASE/Tuberculosis (reactivated)/stats` | TABLE | Contagion 3/5, severity 5/5, speed 1/5, cunning 5/5; tier Legendary. |

### Pneumococcal pneumonia

**Type** Bacteria · **Class** EXB · **Infects** lungs · **Contagion** 3/5 · **Severity** 4/5 · **Speed** 3/5 · **Cunning** 2/5 · **Tier** Rare · **Arises from** Influenza via rare

| Claim id | Kind | The claim |
|---|---|---|
| `DISEASE/Pneumococcal pneumonia/Discovered` | PROSE | **Discovered**: Streptococcus pneumoniae, 1881. |
| `DISEASE/Pneumococcal pneumonia/Causes` | PROSE | **Causes**: Moves into lungs stripped bare by influenza. This. Not the flu itself. Killed most victims in 1918. |
| `DISEASE/Pneumococcal pneumonia/Found` | PROSE | **Found**: Worldwide. |
| `DISEASE/Pneumococcal pneumonia/Prevent` | PROSE | **Prevent**: Pneumococcal and flu vaccines. |
| `DISEASE/Pneumococcal pneumonia/Treat` | PROSE | **Treat**: Antibiotics. |
| `DISEASE/Pneumococcal pneumonia/tropism` | TABLE | It can infect: **lungs**, and no other organ. |
| `DISEASE/Pneumococcal pneumonia/class` | TABLE | Its antigen class is **EXB**, so an antibody raised against that class works on it. |
| `DISEASE/Pneumococcal pneumonia/stats` | TABLE | Contagion 3/5, severity 4/5, speed 3/5, cunning 2/5; tier Rare. |

## G. Crisis and rare events

Every event carries a `why` — the biological reason the game gives for it happening. These are short and they are the app explaining pathophysiology in one sentence, which is where a compression error is most likely.

| # | Claim id | Kind | The claim | Lives in |
|---|---|---|---|---|
| 1088 | `EVENT/immunosuppression/why` | PROSE | **Immunosuppression**: Stress or malnutrition blunts the response. (in game: No antibodies can be made next turn.) | rules/events.json |
| 1089 | `EVENT/neutropenia/why` | PROSE | **Neutropenia**: Neutrophil count crashes. (in game: The Neutrophil goes offline for 2 turns.) | rules/events.json |
| 1090 | `EVENT/lymphopenia/why` | PROSE | **Lymphopenia**: A virus is destroying lymphocytes. (in game: The Killer T-Cell goes offline for 2 turns.) | rules/events.json |
| 1091 | `EVENT/antibodyShortage/why` | PROSE | **Antibody shortage**: Plasma cells can't keep up. (in game: Antibody store capped at 2 for 3 turns.) | rules/events.json |
| 1092 | `EVENT/fatigue/why` | PROSE | **Fatigue**: The whole body is exhausted: <b>1 fewer Action Point this turn only</b>. (in game: 1 fewer Action Point next turn.) | rules/events.json |
| 1093 | `EVENT/coInfection/why` | PROSE | **Co-infection**: A second germ slips in while you're busy. (in game: An extra invader breaks in next turn.) | rules/events.json |
| 1094 | `EVENT/surge/why` | PROSE | **Acute-phase surge**: Inflammation floods the tissue with defenders: <b>+2 Action Points this turn only</b>. (Acute-phase proteins and a burst of cells released from the marrow.) (in game: ) | rules/events.json |
| 1095 | `EVENT/passiveAntibodies/why` | PROSE | **Passive antibodies**: A booster tops up your antibodies. (in game: ) | rules/events.json |
| 1096 | `EVENT/fever/why` | PROSE | **Fever**: Raised temperature slows the invaders (at an energy cost). (in game: ) | rules/events.json |
| 1097 | `RARE/malariaRelapse/why` | PROSE | **Malaria relapse**: A dormant hypnozoite of P. vivax woke up in your liver — months later, from nothing. This is why vivax malaria needs a second drug to clear the liver. | rules/events.json |
| 1098 | `RARE/dengueADE/why` | PROSE | **Dengue — antibody-dependent enhancement**: Your dengue antibodies from last time do NOT neutralise this serotype — they HELP it into your cells. Your own immune memory is being used against you. This is why the second dengue infection is the dangerous one. | rules/events.json |
| 1099 | `RARE/tbReactivation/why` | PROSE | **TB reactivation**: Latent TB woke up while your defences were down. A quarter of the world carries TB silently. | rules/events.json |
| 1100 | `RARE/shingles/why` | PROSE | **Shingles**: The chickenpox virus never left — it hid in your nerves for years and has re-emerged. | rules/events.json |
| 1101 | `RARE/postFluPneumonia/why` | PROSE | **Post-influenza pneumonia**: Flu stripped your airway lining and bacteria moved in. This is what killed most victims of the 1918 pandemic — not the flu itself. | rules/events.json |
| 1102 | `RARE/rheumaticFever/why` | PROSE | **Rheumatic fever**: MOLECULAR MIMICRY: your anti-Strep antibodies cannot tell the difference between the bacterium and your own heart valve — so they are attacking your heart. A leading cause of heart disease in Indian children. | rules/events.json |
| 1103 | `RARE/cytokineStorm/why` | PROSE | **Cytokine storm**: Your immune response went into overdrive and the inflammation itself burned an organ. This is what killed young, healthy people in COVID and in 1918 — the response, not the germ. | rules/events.json |

## H. The fifteen "why it works this way" boxes

These are the game's own defence of its design: each explains why a rule is shaped the way it is. They are the passages most likely to be quoted at a science fair, and they make general claims about how immunity works rather than claims about one disease.

| # | Claim id | Kind | The claim | Lives in |
|---|---|---|---|---|
| 1104 | `WHY/window` | PROSE | **Why surviving the window is not the win**: Real infections do not end when the exposure stops. They end when the last organism is cleared. A person is not well the moment they stop being infected; they are well when their body has finished the job. That is why surviving the window is not a win. | diseases/why.json |
| 1105 | `WHY/bloodRoute` | PROSE | **Why the Blood route is short**: The Blood route is short because a needle, a transfusion or a deep wound puts an infection straight into the bloodstream, skipping the skin, the mucus and the stomach acid that stop almost everything else. Bloodborne infection is fast because it has cheated the barriers. | diseases/why.json |
| 1106 | `WHY/lymphatics` | PROSE | **Why the lymphatic shortcuts join the routes they do**: Mucosal surfaces share a common defensive system (MALT), and skin wounds drain to shared regional lymph nodes. A needle into a vein bypasses lymphatic drainage entirely, which is exactly why the Blood route has no shortcut. | diseases/why.json |
| 1107 | `WHY/brain` | PROSE | **Why the Brain is so hard to defend**: The blood-brain barrier deliberately keeps immune cells out, to protect neurons that cannot be replaced. That protection is also a weakness: it is why brain infections are so hard to clear, and why the Brain has only 2 integrity instead of 3. | diseases/why.json |
| 1108 | `WHY/noAntibodies` | PROSE | **Why you start with no antibodies**: You start with zero antibodies because the first adaptive response genuinely takes five to ten days: the one matching B-cell must be found among millions and then multiplied. The innate cells exist to buy exactly those days. | diseases/why.json |
| 1109 | `WHY/worms` | PROSE | **Why worms do not multiply inside you**: Worms are large animals that burrow into tissue rather than travelling in the blood like a virus. And unlike bacteria they cannot multiply inside you: most human worms lay eggs that must leave the body and develop outside. A person's worm burden grows through repeated exposure, not internal breeding, which is why two per game is biologically honest as well as playable. | diseases/why.json |
| 1110 | `WHY/toxinMakers` | PROSE | **Why coating a toxin-maker stops its countdown**: Coating a toxin-making bacterium stops its countdown completely: a coated bacterium never advances toward releasing its toxin. That is the game rewarding you for dealing with tetanus early, which is exactly the clinical advice. | diseases/why.json |
| 1111 | `WHY/coating` | PROSE | **Why coating is not killing**: Coating is separated from killing on purpose. An antibody is a handle, not a weapon. This is opsonisation, and it is why the B-Cell and the Monocyte have to work as a pair. | diseases/why.json |
| 1112 | `WHY/priming` | PROSE | **Why the Helper must be primed first**: A naive helper T-cell genuinely cannot help anyone until a dendritic cell presents it an antigen. The three bonuses are the real T-helper subsets: Th2 releases IL-5 to recruit eosinophils, Th17 releases IL-17 which drives G-CSF and steps up neutrophil production in the marrow, and helper contact is what licenses a B-cell to make antibodies properly. | diseases/why.json |
| 1113 | `WHY/nkCell` | PROSE | **Why the NK Cell rolls a die**: The NK cell is innate: it needs no antibody, no antigen presentation and no priming, so it works from turn one. The die is the honest price of that speed. It is fast and always available, but less precise than a Killer T-Cell. | diseases/why.json |
| 1114 | `WHY/eosinophil` | PROSE | **Why the Eosinophil burns the organ it stands in**: Eosinophil granules are indiscriminate poison. Killing a parasite inside tissue damages that tissue, which is why parasitic infections cause chronic inflammation and scarring, and why degranulating should feel like a decision rather than a free hit. | diseases/why.json |
| 1115 | `WHY/residents` | PROSE | **Why a resident never leaves its organ**: Tissue-resident macrophages, Kupffer cells in the liver, alveolar macrophages in the lungs, microglia in the brain, live permanently in one organ and never circulate. The 'never leaves' rule is what tissue-residency means. | diseases/why.json |
| 1116 | `WHY/malaria` | PROSE | **Why malaria needs three different defences**: This is the clearest example in medicine of why the same pathogen needs different defences at different moments. The RTS,S malaria vaccine targets the travelling sporozoite precisely because that brief window is when antibodies can act at all. | diseases/why.json |
| 1117 | `WHY/vaccines` | PROSE | **Why you must vaccinate on Normal and Hard**: On the harder modes the game forces the real public-health lesson: waiting to catch a disease is a terrible strategy. A vaccine gives you the memory without the illness, and paying 5 Action Points before an outbreak is far cheaper than fighting it twice. | diseases/why.json |
| 1118 | `WHY/pathogenX` | PROSE | **Why Pathogen X takes so long to answer**: This is clonal selection, and the delay is the point: it is precisely why a genuinely new virus is so dangerous. Your body is not missing the tools; it is searching a library of a hundred million receptor shapes for the one that fits. | diseases/why.json |

## I. How to play — the in-app explanation

The ten sections a newcomer reads. Mechanical instructions are not medical claims, so this section is filtered to the entries that assert something about biology; the filter is keyword-based and deliberately generous, so some pure game text appears here too.

| # | Claim id | Kind | The claim | Lives in |
|---|---|---|---|---|
| 1119 | `HELP/s1.p1` | PROSE | You command the body's immune cells. New infections keep breaking in until the window closes: turn {training} on Training, {normal} on Normal, {hard} on Hard. After that, destroy every pathogen still inside the body. That is the win. If an organ fails, or the body is still infected {grace} turns after the window closes, the body is lost. | i18n/en/ui.json |
| 1120 | `HELP/s1.p2` | PROSE | Each of you commands one immune cell. Alone, every cell is nearly useless: the Monocyte cannot swallow a worm, the Killer T-Cell cannot touch a toxin, and the B-Cell's antibodies cannot reach anything hiding inside your own cells. Together, you can hold. | i18n/en/ui.json |
| 1121 | `HELP/s1.p3` | PROSE | All seven organs count. Losing the spleen ends the game as surely as losing the heart. | i18n/en/ui.json |
| 1122 | `HELP/s2.command.text` | PROSE | Your part. Tap Command your cells and spend your Action Points in any order, on any cells. Unspent points are lost at the end of the turn. | i18n/en/ui.json |
| 1123 | `HELP/s2.spread.text` | PROSE | Every invader advances one step toward its target. Anything reaching an organ box attacks that organ, removing 1 integrity. | i18n/en/ui.json |
| 1124 | `HELP/s3.routes.text` | PROSE | Germs enter here and march inward. Nose, Contact, Gut, Wound and Bite are five steps long. Blood is only three. | i18n/en/ui.json |
| 1125 | `HELP/s3.blood.text` | PROSE | The red hub at the centre. All cells start here. Every route ends here and every organ branch begins here. Any cell may Recall to the bloodstream from anywhere for 1 Action Point, losing all its forward position. | i18n/en/ui.json |
| 1126 | `HELP/s3.branches.text` | PROSE | Each organ hangs off the bloodstream on a short branch of numbered circles, with the organ box itself as the final position. A germ that reaches the organ box attacks the organ. | i18n/en/ui.json |
| 1127 | `HELP/s3.pips` | PROSE | The pips above each organ are its integrity. A damaged organ also costs you something, and the organ's own line says what: tap an organ, or its resident, and the sheet reads, for example: | i18n/en/ui.json |
| 1128 | `HELP/s3.brain.text` | PROSE | Inside the Brain branch, every cell moves only 1 step per Action Point, no matter how fast it normally is. | i18n/en/ui.json |
| 1129 | `HELP/s5.lead` | PROSE | Seven cells, all starting in the bloodstream. Each has one job, and the card behind each one says why. | i18n/en/ui.json |
| 1130 | `HELP/cell.macrophage.hint` | PROSE | Engulf: free once a turn, then 1 AP. Swallows a virus, a coated bacterium, a fungus, blood-stage malaria, or a parasite already down to its last hit point. | i18n/en/ui.json |
| 1131 | `HELP/cell.macrophage.rest` | PROSE | Strike: 1 damage to a coated worm or parasite. | i18n/en/ui.json |
| 1132 | `HELP/cell.neutrophil.rest` | PROSE | Then it is spent and returns after 4 turns, or 2 if a primed Helper T-Cell is in the bloodstream. | i18n/en/ui.json |
| 1133 | `HELP/cell.bcell.hint` | PROSE | Never moves. Produce antibodies of one antigen class. | i18n/en/ui.json |
| 1134 | `HELP/cell.bcell.rest` | PROSE | Coat a bacterium, worm or parasite. Neutralise a virus, or a toxin for 2 AP. Vaccinate, 5 AP in total. Search for the clone, 3 AP, for Pathogen X. | i18n/en/ui.json |
| 1135 | `HELP/cell.tcell.hint` | PROSE | Snipe: destroys a pathogen hiding inside one of your cells. Never misses. | i18n/en/ui.json |
| 1136 | `HELP/cell.helper.hint` | PROSE | It kills nothing. It licenses your other cells, and only after it has been primed. | i18n/en/ui.json |
| 1137 | `HELP/cell.helper.rest` | PROSE | Priming means an antigen has been presented, which happens the first time any of your cells engulfs or destroys a pathogen. With the B-Cell: +1 antibody per action. With the Killer T-Cell: +1 range. With the Eosinophil: +1 step. In the bloodstream: the Neutrophil returns in 2 turns. | i18n/en/ui.json |
| 1138 | `HELP/cell.nk.hint` | PROSE | NK strike: attacks a hidden or infected cell within one step, on a die roll of 3 or more. | i18n/en/ui.json |
| 1139 | `HELP/cell.eosinophil.hint` | PROSE | Strike: 2 damage to a coated worm or parasite. | i18n/en/ui.json |
| 1140 | `HELP/cell.eosinophil.rest` | PROSE | Degranulate, 2 AP: 3 damage, enough to kill a worm outright, but it burns the organ it stands in and the cell is spent for 4 turns. | i18n/en/ui.json |
| 1141 | `HELP/cell.resident.text.hint` | PROSE | One lives in each organ. Patrol: 1 AP per step along its own organ branch. | i18n/en/ui.json |
| 1142 | `HELP/cell.resident.text.rest` | PROSE | It may never leave that branch, and it must be out on the branch to meet anything: nothing can be engulfed in the organ box itself. Engulf, free once per turn: destroy one virus or coated bacterium on its space. | i18n/en/ui.json |
| 1143 | `HELP/invader.virus.hint` | PROSE | Neutralise with a matching antibody, or the Monocyte engulfs it. | i18n/en/ui.json |
| 1144 | `HELP/invader.virus.rest` | PROSE | If it hides inside a cell, only the Killer T-Cell or NK Cell can reach it. | i18n/en/ui.json |
| 1145 | `HELP/invader.hidden.hint` | PROSE | It is inside one of your own cells, where antibodies cannot go. Killer T-Cell (never misses) or NK Cell (3 or more). | i18n/en/ui.json |
| 1146 | `HELP/invader.hidden.rest` | PROSE | Not all are viruses: Toxoplasmosis and Chagas are protozoa that live inside cells. | i18n/en/ui.json |
| 1147 | `HELP/invader.bacteria.hint` | PROSE | Coat it with a matching antibody, then engulf it, or trap the swarm in a NET. It divides if you ignore it. | i18n/en/ui.json |
| 1148 | `HELP/invader.toxin.hint` | PROSE | Not alive: nothing can eat it, trap it or snipe it. Antitoxin antibodies only, and neutralising costs 2 AP. | i18n/en/ui.json |
| 1149 | `HELP/invader.venom.hint` | PROSE | Not alive, and far too fast for your B-cells. Only a ready-made antivenom dose works. | i18n/en/ui.json |
| 1150 | `HELP/invader.worm.hint` | PROSE | Too big to swallow and immune to NETs. Coat it, then the Eosinophil strikes (2) or degranulates (3). | i18n/en/ui.json |
| 1151 | `HELP/invader.worm.rest` | PROSE | It lodges in an organ and chews it every 3 turns. | i18n/en/ui.json |
| 1152 | `HELP/invader.malaria.hint` | PROSE | Three stages. Travelling in the blood: antibodies or the Monocyte. Inside liver cells: Killer T-Cell or NK Cell only. Back in the blood: antibodies again. | i18n/en/ui.json |
| 1153 | `HELP/s7.p1` | PROSE | An antibody only fits its own antigen class. Making the wrong one is wasted work. | i18n/en/ui.json |
| 1154 | `HELP/s7.p2` | PROSE | Six classes: ENV and NAK for enveloped and naked viruses, EXB and ICB for bacteria outside and inside your cells, TOX for toxins, EUK for worms, protozoa and fungi. Every pathogen card names its class, and the antibody panel shows each store. | i18n/en/ui.json |
| 1155 | `HELP/s7.p3` | PROSE | The B-Cell produces into one class at a time, up to the store's cap. Then the antibodies are spent: coat a bacterium, worm or parasite so your cells can attack it, or neutralise a virus or toxin outright. | i18n/en/ui.json |
| 1156 | `HELP/s7.x.text` | PROSE | Brand new: no antibody fits. Search for the clone, 3 AP, to find the one B-cell that does, then produce it. | i18n/en/ui.json |
| 1157 | `HELP/s8.p2` | PROSE | On Training, beating a pathogen is enough: your body remembers it. On Normal and Hard, only a vaccine gives memory: invest 5 Action Points across as many turns as you like against a disease you have already seen. | i18n/en/ui.json |
| 1158 | `HELP/s8.p3` | PROSE | A remembered pathogen shows a ring on the board. Tap it to destroy it at once. | i18n/en/ui.json |
| 1159 | `HELP/event.neutropenia.effect` | PROSE | The Neutrophil goes offline for 2 turns. | i18n/en/ui.json |
| 1160 | `HELP/event.lymphopenia.effect` | PROSE | The Killer T-Cell goes offline for 2 turns. | i18n/en/ui.json |
| 1161 | `HELP/event.antibodyShortage.effect` | PROSE | Every antibody store is capped at 2 for 3 turns. | i18n/en/ui.json |
| 1162 | `HELP/s9.rare` | PROSE | A few cards carry rarer events that fire at the end of a spread, such as a malaria relapse or shingles. The log names each one and says why. | i18n/en/ui.json |
| 1163 | `HELP/s10.p1` | PROSE | What changes: Action Points per turn ({apT}, {apN}, {apH}), how long the infections keep coming ({wT}, {wN}, {wH} turns), how many cards a turn can bring, how many antibodies a store holds, where a worm starts, and whether surviving a disease gives memory or only a vaccine does. | i18n/en/ui.json |
| 1164 | `HELP/antibodyClass.hint` | PROSE | An antibody only fits its own antigen class. Making the wrong one is wasted work. | i18n/en/ui.json |

## J. Text shown during play

Selection hints, inspect panels, effects and action descriptions — the sentences a player reads most often, because they appear every turn rather than once in a help screen. Filtered the same way as section I.

| # | Claim id | Kind | The claim | Lives in |
|---|---|---|---|---|
| 1165 | `PLAY/selection.noAntibodyToTag` | PROSE | No antibody you hold matches a bacterium, worm or parasite in reach | i18n/en/ui.json |
| 1166 | `PLAY/selection.noAntibodyToNeutralise` | PROSE | No antibody you hold matches a virus or toxin in reach | i18n/en/ui.json |
| 1167 | `PLAY/selection.noMemoryTarget` | PROSE | No pathogen your body remembers is in reach | i18n/en/ui.json |
| 1168 | `PLAY/selection.noAntivenomStock` | PROSE | No antivenom in stock. Order a vial in the panel below | i18n/en/ui.json |
| 1169 | `PLAY/effects.noProduce` | PROSE | Immunosuppression: no antibodies can be made | i18n/en/ui.json |
| 1170 | `PLAY/effects.capTurns` | PROSE | Antibody shortage: every store is capped at 2 | i18n/en/ui.json |
| 1171 | `PLAY/effects.tcellOffline` | PROSE | Lymphopenia: the Killer T-Cell is offline | i18n/en/ui.json |
| 1172 | `PLAY/effects.lymphBlocked` | PROSE | Lymphatics blocked by filarial worms, so no lymph shortcuts | i18n/en/ui.json |
| 1173 | `PLAY/effects.hiv` | PROSE | HIV: the Helper T-Cells are destroyed, so no help for the B-Cell or Killer T-Cell | i18n/en/ui.json |
| 1174 | `PLAY/effects.helperUnprimed` | PROSE | Helper T-Cell not yet primed: no antigen has been presented to it | i18n/en/ui.json |
| 1175 | `PLAY/effects.residentInfected` | PROSE | {name} disabled: a parasite is living inside it | i18n/en/ui.json |
| 1176 | `PLAY/effects.helperPrimed` | PROSE | Helper T-Cell primed: it now helps any cell it stands with | i18n/en/ui.json |
| 1177 | `PLAY/effects.helperPrimedDetail` | PROSE | Beside the B-Cell, +1 antibody per action. Beside the Killer T-Cell, +1 step of range. Beside the Eosinophil, +1 step. In the Bloodstream, the Neutrophil returns in 2 turns instead of 4 | i18n/en/ui.json |
| 1178 | `PLAY/effects.windowClosed` | PROSE | No more pathogens will arrive. Clear the body to win by turn {last} | i18n/en/ui.json |
| 1179 | `PLAY/selection.stationary` | PROSE | The B-Cell does not move. It makes antibodies | i18n/en/ui.json |
| 1180 | `PLAY/selection.notCommand` | PROSE | Command your cells first, then this cell can act | i18n/en/ui.json |
| 1181 | `PLAY/selection.notOnSwarm` | PROSE | Move the Neutrophil onto a swarm of bacteria or viruses to NET them | i18n/en/ui.json |
| 1182 | `PLAY/selection.noHiddenInRange` | PROSE | No hidden pathogen in the Killer T-Cell's range | i18n/en/ui.json |
| 1183 | `PLAY/selection.noInfectedCellInRange` | PROSE | No infected cell within the NK Cell's reach | i18n/en/ui.json |
| 1184 | `PLAY/selection.nothingCoatedHere` | PROSE | Nothing coated in antibody here. The Eosinophil needs a coated worm or parasite on its node | i18n/en/ui.json |
| 1185 | `PLAY/selection.nothingToEngulfHere` | PROSE | Nothing here the Monocyte can engulf. Move it onto a virus or fungus | i18n/en/ui.json |
| 1186 | `PLAY/selection.helperContact` | PROSE | The Helper T-Cell works by contact. Stand it with the B-Cell or Killer T-Cell | i18n/en/ui.json |
| 1187 | `PLAY/commandBar.tapOrChoose` | PROSE | Tap a highlighted pathogen. Where two attacks apply, you choose | i18n/en/ui.json |
| 1188 | `PLAY/selection.productionBlocked` | PROSE | No antibodies can be made this turn: the body is immunosuppressed | i18n/en/ui.json |
| 1189 | `PLAY/selection.storesFull` | PROSE | Every antibody store is full. Use them on a pathogen in reach | i18n/en/ui.json |
| 1190 | `PLAY/selection.noMatchingAntibody` | PROSE | No antibody you hold matches a pathogen in reach. Make some against what you have seen | i18n/en/ui.json |
| 1191 | `PLAY/selection.residentInfected` | PROSE | A parasite is living inside this {name}. It cannot eat until the parasite is killed by the Killer T-Cell or NK Cell | i18n/en/ui.json |
| 1192 | `PLAY/selection.residentAtOrgan` | PROSE | Nothing to engulf at the organ itself. Patrol the {name} up its branch to meet a virus or a tagged bacterium | i18n/en/ui.json |
| 1193 | `PLAY/selection.residentNothingHere` | PROSE | Nothing here the {name} can engulf. It eats viruses, tagged bacteria and blood-stage malaria on its own step | i18n/en/ui.json |
| 1194 | `PLAY/inspect.stageSporozoite` | PROSE | Just arrived in the blood. Antibodies and the Monocyte can reach it | i18n/en/ui.json |
| 1195 | `PLAY/inspect.stageLiver` | PROSE | Hiding inside liver cells. Only the Killer T-Cell or NK Cell can reach it | i18n/en/ui.json |
| 1196 | `PLAY/inspect.stageBlood` | PROSE | In the blood. Antibodies or the Monocyte can reach it | i18n/en/ui.json |
| 1197 | `PLAY/inspect.hiddenInMacrophage` | PROSE | Hiding inside the {name}. Only the Killer T-Cell or NK Cell can reach it | i18n/en/ui.json |
| 1198 | `PLAY/body.memoryReady` | PROSE | Memory response ready. A pathogen your body has beaten before is here. Tap its ring on the board to destroy it at once, free | i18n/en/ui.json |
| 1199 | `PLAY/body.memoryReadyHard` | PROSE | Memory response ready. A pathogen your body has beaten before is here. Tap its ring on the board to destroy it for 1 AP | i18n/en/ui.json |
| 1200 | `PLAY/body.cloneHint` | PROSE | An unknown antigen is here. Search millions of B-cell receptors for the one that fits. This is why a first response to a new germ takes days | i18n/en/ui.json |
| 1201 | `PLAY/body.cloneFound` | PROSE | Clone found. Antibodies against the unknown antigen can now be made | i18n/en/ui.json |
| 1202 | `PLAY/body.vaccineHint` | PROSE | Invest at your own pace, {cost} AP each. A vaccine is memory without the disease | i18n/en/ui.json |
| 1203 | `PLAY/body.vaccineNone` | PROSE | Nothing to vaccinate against yet. The lab works on diseases the body has seen | i18n/en/ui.json |
| 1204 | `PLAY/body.trainingNoVaccine` | PROSE | On Training, immunity comes from surviving an infection. Beat a disease and your body remembers it. Vaccines come in on Normal and Hard | i18n/en/ui.json |
| 1205 | `PLAY/commandBar.memoryHint` | PROSE | Tap the highlighted pathogen. Your body remembers it | i18n/en/ui.json |
| 1206 | `PLAY/card.memory` | PROSE | Your body remembers this one. Memory cells are ready | i18n/en/ui.json |
| 1207 | `PLAY/title.tagline` | PROSE | A cooperative immunology game, designed by Kartik Chaudhary | i18n/en/ui.json |
| 1208 | `PLAY/difficulty.trainingDesc` | PROSE | The gentlest start. Learn the immune system as you play | i18n/en/ui.json |
| 1209 | `PLAY/reveal.novel` | PROSE | A pathogen nobody has ever seen. No antibody fits it | i18n/en/ui.json |
| 1210 | `PLAY/reveal.remembered` | PROSE | Memory response: your body already knows this one | i18n/en/ui.json |
| 1211 | `PLAY/goal.arrive` | PROSE | You command the body's immune cells. New infections will keep breaking in until turn {maxTurn}. | i18n/en/ui.json |
| 1212 | `PLAY/goal.win` | PROSE | After that, destroy every pathogen still inside the body. That is the win. | i18n/en/ui.json |
| 1213 | `PLAY/goal.lose` | PROSE | If an organ fails, or the body is still infected at turn {lastTurn}, the body is lost. | i18n/en/ui.json |
| 1214 | `PLAY/cellCard.empty` | PROSE | Notes on this cell are still being written | i18n/en/ui.json |
| 1215 | `PLAY/planning.figureHint` | PROSE | Tap an organ, an entry or the bloodstream to see what is there | i18n/en/ui.json |
| 1216 | `PLAY/regen.helped` | PROSE | Back in 2 turns instead of 4: a primed Helper T-Cell is in the Bloodstream | i18n/en/ui.json |
| 1217 | `PLAY/regen.marrow` | PROSE | Not coming back while the Bone Marrow is damaged | i18n/en/ui.json |
| 1218 | `PLAY/inspect.organ` | PROSE | {organ}, {kind}, integrity {hp} of {max} | i18n/en/ui.json |
| 1219 | `PLAY/selection.helperHiv` | PROSE | HIV has destroyed the helper T-cells. This cell can help no one until the HIV is cleared | i18n/en/ui.json |
| 1220 | `PLAY/selection.helperUnprimed` | PROSE | Not yet primed: engulf a pathogen to present an antigen, then stand it with the B-Cell or Killer T-Cell | i18n/en/ui.json |
| 1221 | `PLAY/selection.lymphBlocked` | PROSE | The lymphatics are blocked by filarial worms, so there is no lymph shortcut from here | i18n/en/ui.json |
| 1222 | `PLAY/library.lead` | PROSE | Every pathogen in the deck, grouped by how you beat it. Tap one for its card. | i18n/en/ui.json |
| 1223 | `PLAY/library.pathogenX` | PROSE | One pathogen has no entry here: nobody has ever seen it. | i18n/en/ui.json |
| 1224 | `PLAY/library.why.lymphatics.title` | PROSE | Why the lymphatic shortcuts join the routes they do | i18n/en/ui.json |
| 1225 | `PLAY/library.why.toxinMakers.title` | PROSE | Why coating a toxin-maker stops its countdown | i18n/en/ui.json |
| 1226 | `PLAY/library.why.eosinophil.title` | PROSE | Why the Eosinophil burns the organ it stands in | i18n/en/ui.json |
| 1227 | `PLAY/library.why.malaria.title` | PROSE | Why malaria needs three different defences | i18n/en/ui.json |
| 1228 | `PLAY/library.why.vaccines.title` | PROSE | Why you must vaccinate on Normal and Hard | i18n/en/ui.json |
| 1229 | `PLAY/difficulty.goal` | PROSE | New infections stop arriving after a set number of turns. Surviving that is not the win: you win by clearing the body. | i18n/en/ui.json |

---

*1229 claims compiled from 106 diseases, 7 cells, 7 organs, 6 antigen classes, 6 routes and 16 events.*
