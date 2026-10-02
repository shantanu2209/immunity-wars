# THE BOARD ITSELF, as Blender builds it. Stage L4 of docs/LOOK_PLAN.md (section 14).
#
# Run inside Blender, AFTER pieces.py and in the same namespace, because it is made of the same
# clay under the same lamps and uses that script's shapes and materials:
#
#     exec(compile(open(ROOT + "/tools/art-pipeline/clay/board.py").read(), "board.py", "exec"), ns)
#     ns["render_table"]()      # tools/art-pipeline/clay/_png/table/board.png
#
# then, outside Blender:   pnpm art:clay --ingest   and   pnpm art:clay
#
# WHERE EVERYTHING IS comes from packages/content/src/board/geometry.json, the one source for
# the board on the screen and the board in print, and from nowhere else: no position is written
# down here. What is written here is how thick a line is and what colour the clay is.
#
# WHAT IS IN THE PICTURE: the board, its rim, the six routes and the seven branches with their
# steps, the lymph nodes and the dotted links between them, and the bloodstream.
# WHAT IS NOT, because the page draws each as its own picture: the pieces, the organs' coins and
# the ways in.
#
# WHAT MEASURING CHANGED (stage L3, 1 October 2026), and why this is not the board of the L1 frame:
#   the board is a darker teal and nearly matt: four pieces read under 3:1 against the first one;
#   the bloodstream is a dark dish with a coral rim: nothing could be read on solid coral.
import bpy, bmesh, json, math, os

GEO = json.load(open(os.path.join(ROOT, "packages", "content", "src", "board", "geometry.json")))
U = 0.01  # one board unit, in Blender units
# Board units of margin round the content pack's VIEWBOX, wide enough for the board's own soft
# shadow. packages/ui/src/board/clay.ts lays the picture out with the same number, and its test
# reads this line to hold the two together.
PAD = 24
ROUTE_COL = "#E08E7E"
BRANCH_COL = "#DDB06A"
LYMPH_COL = "#8FD3E8"
CORAL = "#E8674A"
RIM = "#0A2B31"
# Sizes, in board units. The page reads none of them: it only needs where things are.
LANE_R = 4.5
NODE_R = 8.5
LYMPH_R = 10.0
TISSUE_R = 11.0  # the last step of a branch, where an organ's resident stands
HUB_R = 53.0  # the bloodstream's rim; the print's hub is 50.3
HUB_WELL_R = 47.0
BOARD_R = 309.0
# A way in's coin stands this far beyond the content pack's ENTRY point, along the line from the
# bloodstream. packages/ui/src/board/clay.ts places the coin with the same number, and its test
# reads this line to hold the two together.
ENTRY_OUT = 20

vb = GEO["VIEWBOX"]
VW, VH = vb["w"] + PAD * 2, vb["h"] + PAD * 2
HUB = GEO["HUB"]
HX, HY = HUB["x"] * U, -HUB["y"] * U

for _s in [s for s in bpy.data.scenes if s.name == P + "table"]:
    bpy.data.scenes.remove(_s)
for _c in [c for c in bpy.data.collections if c.name.startswith(P + "table")]:
    for _o in list(_c.objects):
        bpy.data.objects.remove(_o, do_unlink=True)
    bpy.data.collections.remove(_c)

ts = bpy.data.scenes.new(P + "table")
setup_render(ts, 160)
table = bpy.data.collections.new(P + "table_parts")
ts.collection.children.link(table)


def at(p, z=0.0):
    return (p["x"] * U, -p["y"] * U, z)


_c = catcher("table_catcher", -0.09, 20, table)
_c.location = (HX, HY, -0.09)
# The lamps stand where the piece pictures' lamps stand, measured from the bloodstream.
area("table_key", (HX - 5.5, HY + 5.0, 9.0), (HX, HY, 0), 7.0, 1700, "#FFF2E2", table)
area("table_fill", (HX + 6, HY - 6, 6.0), (HX, HY, 0), 10.0, 260, "#DCE9FF", table)
tcam = bpy.data.cameras.new(P + "table_cam")
tcam.type = "ORTHO"
tcam.ortho_scale = max(VW, VH) * U
tcam_ob = bpy.data.objects.new(P + "table_cam", tcam)
tcam_ob.location = ((vb["x"] - PAD + VW / 2) * U, -(vb["y"] - PAD + VH / 2) * U, 12)
table.objects.link(tcam_ob)
ts.camera = tcam_ob

M_BOARD = mat(BOARD, rough=0.85, sss=0.0, spec=0.12)
M_RIM = mat(RIM, rough=0.8, sss=0.0, spec=0.12)
M_ROUTE = mat(ROUTE_COL, rough=0.6)
M_BRANCH = mat(BRANCH_COL, rough=0.6)
M_NODE = mat(CREAM, rough=0.55)
M_LYMPH = mat(LYMPH_COL, rough=0.5)

_b = cyl("table_board", (HX, HY, -0.08), BOARD_R * U, 0.08, M_BOARD, table, bevel=0.02, seg=128)
_r = cyl("table_rim", (HX, HY, -0.1), (BOARD_R + 6) * U, 0.06, M_RIM, table, bevel=0.02, seg=128)


def lane(name, pts, material):
    tube("table_" + name, [at(p) for p in pts], LANE_R * U, material, table, bez=False, caps=False)


def node(name, p, r, material):
    # Taller than a lane is thick, so a step is a clean dot ON its lane and not a dot with a line
    # through it. The first render had them lower, and the gate read a step as its lane's colour.
    cyl("table_" + name, at(p), r * U, 0.062, material, table, bevel=0.012, seg=40)


def beyond(p, by):
    """The point `by` board units further out than `p`, along the line from the bloodstream."""
    dx, dy = p["x"] - HUB["x"], p["y"] - HUB["y"]
    k = 1 + by / math.hypot(dx, dy)
    return {"x": HUB["x"] + dx * k, "y": HUB["y"] + dy * k}


for _lane in RULES["ROUTE_KEYS"]:
    steps = sorted(GEO["ROUTE"][_lane], key=int)
    # A route runs on to its way in: that is where its coin stands, and where a germ comes from.
    lane("route_" + _lane, [HUB] + [GEO["ROUTE"][_lane][s] for s in steps] + [beyond(GEO["ENTRY"][_lane], ENTRY_OUT)], M_ROUTE)
    grp = RULES["LYMPH_GROUP"][_lane]
    for s in steps:
        ly = bool(grp) and int(s) == RULES["LYMPH_STEP"]
        node(f"node_{_lane}_{s}", GEO["ROUTE"][_lane][s], LYMPH_R if ly else NODE_R, M_LYMPH if ly else M_NODE)

for _o in RULES["ALL_ORGANS"]:
    steps = sorted(GEO["BRANCH"][_o], key=int, reverse=True)
    # A branch STOPS at the organ's own step: nothing can go further, so no line does.
    lane("branch_" + _o, [HUB] + [GEO["BRANCH"][_o][s] for s in steps] + [GEO["ORGAN_POS"][_o]], M_BRANCH)
    for s in steps:
        node(f"bnode_{_o}_{s}", GEO["BRANCH"][_o][s], NODE_R, M_NODE)
    node("tissue_" + _o, GEO["ORGAN_POS"][_o], TISSUE_R, M_NODE)

# The lymph: a dotted link between the lymph nodes of the routes that share a group.
_groups = {}
for _lane, grp in RULES["LYMPH_GROUP"].items():
    if grp:
        _groups.setdefault(grp, []).append(GEO["ROUTE"][_lane][str(RULES["LYMPH_STEP"])])
for grp, pts in _groups.items():
    pts.sort(key=lambda p: math.atan2(p["y"] - HUB["y"], p["x"] - HUB["x"]))
    for a, b in zip(pts, pts[1:]):
        n = int(math.hypot(b["x"] - a["x"], b["y"] - a["y"]) / 9)
        for i in range(1, n):
            t = i / n
            sphere(f"table_ly_{grp}_{a['x']:.0f}_{i}", ((a["x"] + (b["x"] - a["x"]) * t) * U, -(a["y"] + (b["y"] - a["y"]) * t) * U, 0.0), (0.028, 0.028, 0.02), M_LYMPH, table, seg=12)

# The bloodstream: a coral rim round a dark dish, the same well a cell's base has.
cyl("table_hub_rim", (HX, HY, 0), HUB_R * U, 0.06, mat(CORAL, rough=0.5, sss=0.25), table, bevel=0.02, seg=96)
cyl("table_hub_well", (HX, HY, 0.035), HUB_WELL_R * U, 0.03, mat(WELL, rough=0.8, sss=0.0, spec=0.12), table, bevel=0.0, seg=96)


def render_table(px=2400, samples=128, wait=True):
    """The board with nothing on it. `px` is the picture's width.

    A large render outlasts the connector's patience. With `wait=False` the render is started in
    Blender's own window and this returns at once; the picture is finished when the file's time
    changes."""
    ts.cycles.samples = samples
    ts.render.resolution_x = px
    ts.render.resolution_y = round(px * VH / VW)
    ts.render.filepath = os.path.join(PNG, "table", "board.png")
    if wait:
        bpy.ops.render.render(write_still=True, scene=ts.name)
    else:
        bpy.ops.render.render("INVOKE_DEFAULT", write_still=True, scene=ts.name)
    return ts.render.filepath


result = {"scene": ts.name, "parts": len(table.objects), "aspect": [VW, VH]}
