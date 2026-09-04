# Raw generated art — pipeline inputs

Originals as generated, untouched. One file per asset, named by asset key
(`class-key.ext`, keys from `docs/ART_BRIEF.md`). The P2.4 pipeline reads from here;
nothing renders these directly. Provenance for every file lives in `docs/ASSETS.md` —
a file may not land here without its register row.

Known deviation of the first batches (accepted): the tool exports JPEG with a drawn
checkerboard "transparency" pattern — or plain white — instead of a true alpha channel.
**Key the background by flood-filling from the image edges inward, not by saturation:**
asset 2's pale nucleus is itself low-saturation, and a saturation key would punch holes in
interior details. True transparent PNG remains the preferred export where the tool offers it.
