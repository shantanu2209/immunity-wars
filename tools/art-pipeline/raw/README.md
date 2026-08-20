# Raw generated art — pipeline inputs

Originals as generated, untouched. One file per asset, named by asset key
(`class-key.ext`, keys from `docs/ART_BRIEF.md`). The P2.4 pipeline reads from here;
nothing renders these directly. Provenance for every file lives in `docs/ASSETS.md` —
a file may not land here without its register row.

Known deviation of the first batch (accepted): the tool exports JPEG with a drawn
checkerboard "transparency" pattern instead of a true alpha channel. The background is
neutral (R≈G≈B) and the art strongly saturated, so the pipeline keys it out on
saturation. True transparent PNG remains the preferred export where the tool offers it.
