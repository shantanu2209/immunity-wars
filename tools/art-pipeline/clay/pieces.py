# THE CLAY PIECES, as Blender builds them. Stage L3 of docs/LOOK_PLAN.md (section 13).
#
# Run inside Blender (5.x), through its connector or its Python console:
#
#     ns = {"ROOT": "<the repository's folder>"}
#     exec(compile(open(ROOT + "/tools/art-pipeline/clay/pieces.py").read(), "pieces.py", "exec"), ns)
#     ns["render_all"]()        # every picture, both views, as PNG under tools/art-pipeline/clay/_png/
#
# then, outside Blender:   pnpm art:clay --ingest   and   pnpm art:clay
#
# It makes scenes of its own, all named IW_K_*, and leaves any other scene untouched. Nothing is
# downloaded or bought: every shape below is built from spheres, cylinders and curves.
#
# THREE RULES THE SET FOLLOWS (ruled by Shantanu, 1 October 2026)
#   1. Shape says what kind of thing it is. One shape per kind of pathogen.
#   2. Colour says its antigen class, which is what an antibody has to match. The six class
#      colours are read from packages/content/src/rules/families.json and written nowhere else.
#   3. Soft and rounded is alive; hard-edged is not. Only the toxin and the venom have hard edges.
# and one more, so that colour never has to tell friend from foe:
#   4. Your own cells stand on a base, a cream rim round a dark well. An invader never does.
#
# WHAT EACH SHAPE CLAIMS, so it can be defended to a scientist
#   Monocyte       one large kidney-shaped nucleus; an irregular outline
#   Neutrophil     a nucleus of several lobes joined by thin strands; fine granules
#   B-Cell         nearly all nucleus; antibody receptors on its surface, stems in the membrane,
#                  arms outward
#   Killer T-Cell  nearly all nucleus; short paired receptors; killing granules gathered to a side
#   Helper T-Cell  the same build; it sends signals (cytokines) outward
#   NK Cell        a larger lymphocyte; an indented nucleus; coarse granules
#   Eosinophil     a nucleus of two lobes; large granules filling the cell
#   virus, enveloped   a membrane studded with spike proteins
#   virus, naked       a bare many-sided protein shell, no envelope
#   bacterium      a rod with a flagellum. ONE shape for every bacterial disease, though some are
#                  caused by round bacteria (ruled: one shape per kind)
#   coated         antibodies with their ARMS ON THE MICROBE and their stems outward, where a
#                  phagocyte can grip them; the other way round from a B cell's receptors
#   fungus         a yeast cell, budding
#   parasite       one long cell with a whip running along its edge and on past its front (a
#                  trypanosome). ONE shape for six diseases, among them an amoeba and a mite
#   worm           a long body tapering at both ends (a roundworm). ONE shape for seven diseases,
#                  among them a tapeworm and a fluke
#   malaria        the parasite as a ring inside a red blood cell: its blood stage
#   hidden         one of your own cells with the pathogen showing through it, tinted by class
#   toxin          not alive: a binding part carrying a smaller active part
#   venom          not alive: a drop of liquid carrying several different toxins
import bpy, bmesh, json, math, os, random
from mathutils import Vector

ROOT = globals().get("ROOT") or os.environ.get("IW_ROOT")
if not ROOT:
    raise RuntimeError('set ROOT to the repository folder before running: ns = {"ROOT": "..."}')
HERE = os.path.join(ROOT, "tools", "art-pipeline", "clay")
PNG = os.path.join(HERE, "_png")
FAMILIES = json.load(open(os.path.join(ROOT, "packages", "content", "src", "rules", "families.json")))["FAMILIES"]
CLASS = {k: v["col"] for k, v in FAMILIES.items()}
CELL_KEYS = ["macrophage", "neutrophil", "bcell", "tcell", "helper", "nk", "eosinophil"]

# The board's own colours, as materials. What they LOOK like once lit is measured from the
# renders by the pipeline (tools/art-pipeline/clay.ts), which is what its contrast gate uses.
BOARD = "#0D4049"
WELL = "#06262D"
CREAM = "#E9DCC3"
GOLD = "#E7B549"
PIECE_SCALE = 0.23  # a piece's body radius on the board, in Blender units (23 board units)
PIECE_SPAN = 0.9  # the square a board-view picture covers (90 board units)
P = "IW_K_"


def lin(hexcol, a=1.0):
    h = hexcol.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], a)


def shade(hexcol, k):
    """Darker (k < 1) or lighter (k > 1) version of a colour."""
    h = hexcol.lstrip("#")
    ch = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    ch = [round(c * k) for c in ch] if k <= 1 else [round(c + (255 - c) * (k - 1)) for c in ch]
    return "#%02x%02x%02x" % tuple(ch)


def wipe(prefix):
    for sc in [s for s in bpy.data.scenes if s.name.startswith(prefix)]:
        bpy.data.scenes.remove(sc)
    for o in [o for o in bpy.data.objects if o.name.startswith(prefix)]:
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in [c for c in bpy.data.collections if c.name.startswith(prefix)]:
        bpy.data.collections.remove(coll)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.textures, bpy.data.worlds):
        for d in [d for d in block if d.name.startswith(prefix) and d.users == 0]:
            block.remove(d)


wipe(P)
_mats = {}


def mat(col, rough=0.62, sss=0.12, emit=0.0, spec=0.5):
    """`spec` is how much a surface mirrors the lamps. The board and the wells are kept nearly
    matt (0.12): at the default the lamps' reflection lays a grey veil over a dark colour, and the
    board came out grey instead of teal (measured: #344242 from a material of #0B2A31)."""
    key = (col.lower(), rough, sss, emit, spec)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(P + "m_" + col.lstrip("#"))
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = lin(col)
    b.inputs["Roughness"].default_value = rough
    for nm, val in (("Subsurface Weight", sss), ("Emission Strength", emit), ("Specular IOR Level", spec)):
        if nm in b.inputs:
            b.inputs[nm].default_value = val
    if "Subsurface Radius" in b.inputs:
        b.inputs["Subsurface Radius"].default_value = (0.25, 0.14, 0.1)
    if "Subsurface Scale" in b.inputs:
        b.inputs["Subsurface Scale"].default_value = 0.25
    if emit and "Emission Color" in b.inputs:
        b.inputs["Emission Color"].default_value = lin(col)
    _mats[key] = m
    return m


def mesh_obj(name, bm, material, coll, smooth=True):
    me = bpy.data.meshes.new(P + name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    ob = bpy.data.objects.new(P + name, me)
    me.materials.append(material)
    coll.objects.link(ob)
    return ob


def sphere(name, loc, scale, material, coll, seg=48):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(4, seg // 2), radius=1.0)
    ob = mesh_obj(name, bm, material, coll)
    ob.location = loc
    ob.scale = scale if isinstance(scale, (tuple, list)) else (scale, scale, scale)
    return ob


def cyl(name, loc, r, h, material, coll, bevel=0.012, seg=72):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=h)
    ob = mesh_obj(name, bm, material, coll, smooth=False)
    for p in ob.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    ob.location = (loc[0], loc[1], loc[2] + h / 2)
    if bevel:
        mod = ob.modifiers.new("bev", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
    return ob


def tube(name, pts, radius, material, coll, bez=True, caps=True):
    cu = bpy.data.curves.new(P + name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 6
    cu.use_fill_caps = True
    cu.resolution_u = 16
    if bez and len(pts) > 2:
        sp = cu.splines.new("BEZIER")
        sp.bezier_points.add(len(pts) - 1)
        for bp, p in zip(sp.bezier_points, pts):
            bp.co = p
            bp.handle_left_type = "AUTO"
            bp.handle_right_type = "AUTO"
    else:
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for sp_p, p in zip(sp.points, pts):
            sp_p.co = (p[0], p[1], p[2], 1.0)
    ob = bpy.data.objects.new(P + name, cu)
    cu.materials.append(material)
    coll.objects.link(ob)
    if caps:
        for i, p in enumerate((pts[0], pts[-1])):
            sphere(f"{name}_cap{i}", p, radius, material, coll, seg=16)
    return ob


def taper(name, pts, radii, material, coll):
    """A tube whose thickness changes along its length; it lies on the ground."""
    cu = bpy.data.curves.new(P + name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 1.0
    cu.bevel_resolution = 6
    cu.use_fill_caps = True
    cu.resolution_u = 16
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for bp, (x, y), r in zip(sp.bezier_points, pts, radii):
        bp.co = (x, y, max(r, 0.02))
        bp.radius = max(r, 0.001)
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    ob = bpy.data.objects.new(P + name, cu)
    cu.materials.append(material)
    coll.objects.link(ob)
    return ob


def crystal(name, loc, scale, col, coll, rot=(0, 0, 0)):
    """A faceted lump: flat faces, hard edges. Used only for what is not alive."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    ob = mesh_obj(name, bm, mat(col, rough=0.35, sss=0.0), coll, smooth=False)
    ob.location = loc
    ob.scale = scale
    ob.rotation_euler = rot
    return ob


# ── the cells ────────────────────────────────────────────────────────────────
# A soft flattened body with its nucleus and granules laid on top, so the features that tell
# the cells apart are readable from above. Body radius is 1.
FLAT = 0.6
BASE = FLAT * 0.82


def top(x, y, R=1.0):
    r2 = (x * x + y * y) / (R * R)
    return BASE + FLAT * R * math.sqrt(max(0.0, 1.0 - r2))


def body(name, col, coll, R=1.0, lumpy=0.0, seed=0.0):
    ob = sphere(name + "_body", (0, 0, BASE), (R, R, FLAT * R), mat(col, rough=0.58, sss=0.2), coll, seg=64)
    if lumpy:
        tex = bpy.data.textures.new(P + "tex_" + name, "CLOUDS")
        tex.noise_scale = 1.1
        mod = ob.modifiers.new("lump", "DISPLACE")
        mod.texture = tex
        mod.strength = lumpy
        mod.texture_coords = "LOCAL"
        ob.rotation_euler = (0, 0, seed)
    return ob


def lobe(name, x, y, rx, ry, col, coll, R=1.0, h=0.16):
    return sphere(name, (x, y, top(x, y, R) - 0.02), (rx, ry, h), mat(col, rough=0.5, sss=0.1), coll, seg=24)


def granules(name, pts, r, col, coll, R=1.0):
    for i, (x, y) in enumerate(pts):
        sphere(f"{name}_g{i}", (x, y, top(x, y, R) + r * 0.1), r, mat(col, rough=0.45, sss=0.05), coll, seg=16)


def scatter(n, rmin, rmax, seed, avoid=(), gap=0.2):
    rnd = random.Random(seed)
    out = []
    guard = 0
    while len(out) < n and guard < 5000:
        guard += 1
        t = rnd.random() * math.tau
        r = rmin + math.sqrt(rnd.random()) * (rmax - rmin)
        p = (math.cos(t) * r, math.sin(t) * r)
        if any(math.hypot(p[0] - a[0], p[1] - a[1]) < a[2] for a in avoid):
            continue
        if any(math.hypot(p[0] - o[0], p[1] - o[1]) < gap for o in out):
            continue
        out.append(p)
    return out


def antibody(name, origin, ang, coll, flip=False, size=1.0):
    """A Y, starting at `origin` and pointing along `ang`. On a B cell the stem sits in the
    membrane and the arms point out. On a coated microbe it is the other way round (flip): the
    arms hold the microbe and the stem points away, where a phagocyte can grip it."""
    ox, oy, z = origin
    c, s = math.cos(ang), math.sin(ang)
    m = mat(GOLD, rough=0.45, sss=0.05)
    stem, arm, rad = 0.2 * size, 0.18 * size, 0.04 * size
    if not flip:
        j = (ox + c * stem, oy + s * stem, z)
        tube(name + "_s", [(ox, oy, z), j], rad, m, coll, bez=False)
        for k, da in enumerate((0.62, -0.62)):
            tube(f"{name}_a{k}", [j, (j[0] + math.cos(ang + da) * arm, j[1] + math.sin(ang + da) * arm, z + 0.03)], rad, m, coll, bez=False)
    else:
        j = (ox + c * arm, oy + s * arm, z)
        tube(name + "_s", [j, (ox + c * (arm + stem), oy + s * (arm + stem), z)], rad, m, coll, bez=False)
        for k, da in enumerate((0.7, -0.7)):
            tube(f"{name}_a{k}", [j, (j[0] - math.cos(ang + da) * arm, j[1] - math.sin(ang + da) * arm, z)], rad, m, coll, bez=False)


def paired_receptors(name, off, col, coll, skip=None):
    """T-cell receptors: two short chains side by side."""
    m = mat(col, rough=0.5)
    for i in range(9):
        a = i / 9 * math.tau + off
        if skip and skip[0] < (a % math.tau) < skip[1]:
            continue
        for g in (-0.055, 0.055):
            ox, oy = -math.sin(a) * g, math.cos(a) * g
            tube(f"{name}_r{i}{'a' if g > 0 else 'b'}", [(math.cos(a) * 0.8 + ox, math.sin(a) * 0.8 + oy, BASE + 0.05), (math.cos(a) * 1.0 + ox, math.sin(a) * 1.0 + oy, BASE + 0.05)], 0.032, m, coll, bez=False)


MODELS = {}


def new(name):
    coll = bpy.data.collections.new(P + "model_" + name)
    MODELS[name] = coll
    return coll


def build_cells():
    n = "macrophage"
    coll = new(n)
    body(n, "#3DB6A2", coll, R=1.02, lumpy=0.22, seed=0.4)
    pts = []
    for i in range(9):
        a = math.radians(200 - i * 27.5)
        x, y = math.cos(a) * 0.4 - 0.02, math.sin(a) * 0.4 + 0.02
        pts.append((x, y, top(x, y) - 0.08))
    tube(n + "_nuc", pts, 0.2, mat("#1C6F63", rough=0.5), coll)
    granules(n, [(-0.15, -0.5), (0.3, -0.52), (0.58, -0.2)], 0.07, "#8FDCCB", coll)

    n = "neutrophil"
    coll = new(n)
    body(n, "#C4B2EE", coll, R=0.98, lumpy=0.06, seed=1.3)
    lobes = [(-0.42, -0.16), (-0.22, 0.3), (0.22, 0.32), (0.44, -0.12)]
    tube(n + "_strand", [(x, y, top(x, y) - 0.03) for x, y in lobes], 0.045, mat("#6E52BE"), coll, caps=False)
    for i, (x, y) in enumerate(lobes):
        lobe(f"{n}_l{i}", x, y, 0.22, 0.22, "#6E52BE", coll)
    granules(n, scatter(24, 0.15, 0.82, 11, [(x, y, 0.3) for x, y in lobes], 0.14), 0.035, "#8E78D0", coll)

    n = "bcell"
    coll = new(n)
    body(n, "#86B6F0", coll, R=0.82)
    lobe(n + "_nuc", 0.02, -0.02, 0.54, 0.54, "#2F6FD0", coll, R=0.82, h=0.2)
    for i in range(10):
        a = i / 10 * math.tau + 0.2
        antibody(f"{n}_y{i}", (math.cos(a) * 0.78, math.sin(a) * 0.78, BASE + 0.05), a, coll, size=1.05)

    n = "tcell"
    coll = new(n)
    body(n, "#97D48F", coll, R=0.85)
    lobe(n + "_nuc", -0.12, -0.1, 0.5, 0.5, "#3E9B4F", coll, R=0.85, h=0.2)
    granules(n, [(0.42, 0.32), (0.56, 0.12), (0.26, 0.52), (0.5, 0.5)], 0.08, "#1F6B33", coll, R=0.85)
    paired_receptors(n, 0.5, "#3E9B4F", coll)

    n = "helper"
    coll = new(n)
    body(n, "#F5CF7A", coll, R=0.85)
    lobe(n + "_nuc", -0.08, -0.08, 0.51, 0.51, "#DE951A", coll, R=0.85, h=0.2)
    paired_receptors(n, 2.6, "#DE951A", coll, skip=(0.3, 1.3))
    sm = mat("#F08A3C", rough=0.4, emit=0.4)
    for ring in range(3):
        for k in (-1, 0, 1):
            a = 0.8 + k * 0.3
            r = 1.0 + ring * 0.16
            sphere(f"{n}_sig{ring}{k + 1}", (math.cos(a) * r, math.sin(a) * r, BASE + 0.12 + ring * 0.05), 0.07 - ring * 0.015, sm, coll, seg=16)

    n = "nk"
    coll = new(n)
    body(n, "#BCC5E4", coll, R=0.95, lumpy=0.05, seed=2.2)
    lobe(n + "_nuc", -0.12, 0.0, 0.46, 0.44, "#5A6AA8", coll, R=0.95, h=0.2)
    lobe(n + "_nuc2", 0.12, 0.12, 0.26, 0.26, "#5A6AA8", coll, R=0.95, h=0.18)
    granules(n, scatter(11, 0.6, 0.8, 21, [(-0.1, 0.0, 0.55)], 0.24), 0.085, "#3B4A85", coll, R=0.95)

    n = "eosinophil"
    coll = new(n)
    body(n, "#F6B4C2", coll, R=0.98, lumpy=0.05, seed=3.1)
    lobes = [(-0.28, 0.12), (0.3, 0.1)]
    tube(n + "_strand", [(-0.28, 0.12, top(-0.28, 0.12) - 0.02), (0, 0.3, top(0, 0.3) - 0.02), (0.3, 0.1, top(0.3, 0.1) - 0.02)], 0.05, mat("#C8507A"), coll, caps=False)
    for i, (x, y) in enumerate(lobes):
        lobe(f"{n}_l{i}", x, y, 0.27, 0.3, "#C8507A", coll)
    granules(n, scatter(17, 0.1, 0.8, 31, [(x, y, 0.4) for x, y in lobes], 0.2), 0.09, "#E8674A", coll)


# ── what invades ─────────────────────────────────────────────────────────────
ROD_COAT = [(-0.4, 0.34, math.pi / 2), (0.0, 0.34, math.pi / 2), (0.4, 0.34, math.pi / 2), (-0.4, -0.34, -math.pi / 2), (0.0, -0.34, -math.pi / 2), (0.4, -0.34, -math.pi / 2), (-0.94, 0, math.pi)]


def bacterium(cls, coated=False):
    name = f"bacteria-{cls}" + ("-coated" if coated else "")
    coll = new(name)
    col = CLASS[cls]
    z = 0.34
    tube(name + "_rod", [(-0.6, 0, z), (0.6, 0, z)], 0.34, mat(col, rough=0.5, sss=0.2), coll, bez=False)
    tube(name + "_fl", [(0.9, 0, z), (1.1, 0.16, z), (1.3, -0.12, z), (1.5, 0.12, z), (1.72, 0.0, z)], 0.035, mat(shade(col, 0.7)), coll)
    tube(name + "_dna", [(-0.45, 0.0, z + 0.33), (-0.25, 0.1, z + 0.34), (-0.05, -0.1, z + 0.34), (0.15, 0.1, z + 0.34), (0.4, 0.0, z + 0.33)], 0.035, mat(shade(col, 0.6)), coll)
    if coated:
        for i, (x, y, a) in enumerate(ROD_COAT):
            antibody(f"{name}_ab{i}", (x, y, z), a, coll, flip=True, size=1.2)


def virus_enveloped():
    name = "virus-ENV"
    coll = new(name)
    col = CLASS["ENV"]
    sphere(name + "_core", (0, 0, 0.62), 0.6, mat(col, rough=0.5, sss=0.2), coll)
    sm = mat(shade(col, 1.45), rough=0.45)
    count = 26
    for i in range(count):
        yv = 1 - (i + 0.5) / count * 1.25
        rad = math.sqrt(max(0.0, 1 - yv * yv))
        th = i * 2.399963
        d = Vector((math.cos(th) * rad, math.sin(th) * rad, yv))
        p0 = Vector((0, 0, 0.62)) + d * 0.58
        p1 = Vector((0, 0, 0.62)) + d * 0.82
        tube(f"{name}_sp{i}", [tuple(p0), tuple(p1)], 0.035, sm, coll, bez=False, caps=False)
        sphere(f"{name}_kn{i}", tuple(p1), 0.075, sm, coll, seg=12)


def virus_naked():
    name = "virus-NAK"
    coll = new(name)
    col = CLASS["NAK"]
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.62)
    verts = [v.co.copy() for v in bm.verts]
    ob = mesh_obj(name + "_shell", bm, mat(col, rough=0.5, sss=0.2), coll, smooth=False)
    ob.location = (0, 0, 0.66)
    mod = ob.modifiers.new("bev", "BEVEL")
    mod.width = 0.07
    mod.segments = 3
    for i, v in enumerate(verts):
        sphere(f"{name}_k{i}", (v.x, v.y, v.z + 0.66), 0.085, mat(shade(col, 1.45), rough=0.45), coll, seg=12)


def fungus():
    name = "fungus-EUK"
    coll = new(name)
    col = CLASS["EUK"]
    m = mat(col, rough=0.5, sss=0.2)
    sphere(name + "_a", (-0.15, -0.15, 0.5), (0.62, 0.62, 0.5), m, coll)
    sphere(name + "_b", (0.52, 0.4, 0.34), (0.34, 0.34, 0.3), m, coll, seg=32)
    sphere(name + "_c", (0.86, 0.76, 0.22), (0.18, 0.18, 0.17), m, coll, seg=24)
    sphere(name + "_n", (-0.25, -0.2, 0.96), (0.2, 0.2, 0.08), mat(shade(col, 0.55)), coll, seg=24)


def parasite(coated=False):
    name = "parasite-EUK" + ("-coated" if coated else "")
    coll = new(name)
    col = CLASS["EUK"]
    taper(name + "_body", [(-1.0, -0.25), (-0.5, 0.0), (0.05, 0.08), (0.6, -0.08), (1.0, 0.1)], [0.05, 0.24, 0.28, 0.2, 0.04], mat(col, rough=0.5, sss=0.25), coll)
    sphere(name + "_nuc", (0.05, 0.08, 0.5), (0.16, 0.13, 0.08), mat(shade(col, 0.5)), coll, seg=20)
    sphere(name + "_kin", (-0.6, -0.04, 0.4), (0.07, 0.07, 0.05), mat(shade(col, 0.45)), coll, seg=12)
    whip = [(-0.62, 0.18, 0.2), (-0.3, 0.36, 0.2), (0.0, 0.3, 0.2), (0.3, 0.42, 0.2), (0.6, 0.24, 0.2), (0.9, 0.3, 0.12), (1.2, 0.5, 0.08), (1.5, 0.4, 0.06), (1.75, 0.56, 0.05)]
    tube(name + "_whip", whip, 0.035, mat(shade(col, 0.7)), coll)
    if coated:
        for i, (x, y, a) in enumerate([(-0.5, -0.24, -1.6), (0.05, -0.2, -1.5), (0.6, -0.28, -1.4), (-0.75, 0.0, 2.9)]):
            antibody(f"{name}_ab{i}", (x, y, 0.22), a, coll, flip=True, size=1.0)


def worm(coated=False):
    name = "worm-EUK" + ("-coated" if coated else "")
    coll = new(name)
    col = CLASS["EUK"]
    taper(name + "_body", [(-1.15, 0.55), (-0.7, 0.05), (-0.2, 0.35), (0.25, -0.2), (0.7, 0.2), (1.1, -0.35)], [0.06, 0.2, 0.22, 0.22, 0.17, 0.05], mat(col, rough=0.5, sss=0.25), coll)
    if coated:
        for i, (x, y, a) in enumerate([(-0.7, 0.26, 1.9), (-0.2, 0.58, 1.4), (0.25, 0.03, 1.2), (0.7, 0.38, 1.3), (-0.45, -0.02, -1.3), (0.0, -0.1, -1.9), (0.5, -0.12, -1.5)]):
            antibody(f"{name}_ab{i}", (x, y, 0.2), a, coll, flip=True, size=1.0)


def malaria():
    name = "malaria-EUK"
    coll = new(name)
    col = CLASS["EUK"]
    sphere(name + "_rbc", (0, 0, 0.26), (0.92, 0.92, 0.26), mat("#F0736A", rough=0.5, sss=0.3), coll)
    sphere(name + "_dish", (0, 0, 0.47), (0.5, 0.5, 0.07), mat("#D85850", rough=0.55, sss=0.2), coll, seg=32)
    ring = [(0.2 + math.cos(i / 20 * math.tau) * 0.27, -0.12 + math.sin(i / 20 * math.tau) * 0.27, 0.54) for i in range(21)]
    tube(name + "_ring", ring, 0.055, mat(col, rough=0.45), coll, bez=False, caps=False)
    sphere(name + "_dot", (0.47, -0.12, 0.56), 0.1, mat(shade(col, 0.6), rough=0.45), coll, seg=16)


def hidden(cls):
    name = f"hidden-{cls}"
    coll = new(name)
    body(name, "#E9CFAE", coll, R=0.98, lumpy=0.06, seed=0.9)
    lobe(name + "_nuc", -0.3, 0.22, 0.3, 0.27, "#B98A62", coll)
    col = CLASS[cls]
    for i, (x, y) in enumerate([(0.22, -0.12), (0.5, 0.2), (0.12, 0.42), (-0.1, -0.4), (0.42, -0.42)]):
        sphere(f"{name}_p{i}", (x, y, top(x, y) - 0.05), (0.15, 0.15, 0.1), mat(col, rough=0.45, sss=0.1), coll, seg=20)


def toxin():
    name = "toxin-TOX"
    coll = new(name)
    col = CLASS["TOX"]
    crystal(name + "_b", (-0.12, -0.05, 0.42), (0.6, 0.52, 0.42), col, coll, rot=(0.2, 0.1, 0.5))
    crystal(name + "_a", (0.46, 0.3, 0.62), (0.32, 0.28, 0.3), shade(col, 0.62), coll, rot=(0.6, 0.3, 1.2))


def venom():
    name = "venom-TOX"
    coll = new(name)
    col = CLASS["TOX"]
    liquid = mat(shade(col, 1.25), rough=0.22, sss=0.3)
    taper(name + "_drop", [(-0.95, 0.5), (-0.5, 0.26), (0.0, 0.0), (0.42, -0.2)], [0.03, 0.2, 0.5, 0.62], liquid, coll)
    sphere(name + "_round", (0.42, -0.2, 0.62), 0.62, liquid, coll, seg=40)
    for i, (x, y, s, k) in enumerate([(0.2, -0.05, 0.19, 0.5), (0.62, -0.4, 0.16, 0.7), (0.56, 0.06, 0.13, 0.4), (0.3, -0.5, 0.12, 0.85)]):
        crystal(f"{name}_c{i}", (x, y, 1.18 - abs(x - 0.42) * 0.25 - abs(y + 0.2) * 0.25), (s, s, s), shade(col, k), coll, rot=(i * 0.7, i * 0.4, i))


def base():
    """What a cell stands on: a cream rim round a dark well. Radius 1.2, to sit under a cell of 1."""
    coll = new("base")
    cyl("base_rim", (0, 0, 0), 1.2, 0.1, mat(CREAM, rough=0.55), coll, bevel=0.03)
    cyl("base_well", (0, 0, 0.06), 1.02, 0.045, mat(WELL, rough=0.8, sss=0.0, spec=0.12), coll, bevel=0.0)


def swatch():
    """A plain piece of the board, for measuring what the board's colour looks like once lit."""
    coll = new("swatch-board")
    cyl("swatch", (0, 0, -0.05), 6.0, 0.05, mat(BOARD, rough=0.85, sss=0.0, spec=0.12), coll, bevel=0.0)


build_cells()
for cls in ("EXB", "ICB"):
    bacterium(cls)
    bacterium(cls, coated=True)
virus_enveloped()
virus_naked()
fungus()
parasite()
parasite(coated=True)
worm()
worm(coated=True)
malaria()
for cls in ("ENV", "NAK", "EUK"):
    hidden(cls)
toxin()
venom()
base()
swatch()
PIECES = [n for n in MODELS if n not in ("base", "swatch-board")]
WIDE = {n for n in MODELS if n.startswith(("bacteria", "worm", "parasite", "venom"))}


def instance(name, coll_model, loc, scale, coll):
    e = bpy.data.objects.new(P + "i_" + name, None)
    e.instance_type = "COLLECTION"
    e.instance_collection = coll_model
    e.location = loc
    e.scale = (scale, scale, scale)
    coll.objects.link(e)
    return e


def setup_render(sc, samples):
    sc.render.engine = "CYCLES"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.get_devices()
        if any(d.type == prefs.compute_device_type and d.use for d in prefs.devices):
            sc.cycles.device = "GPU"
    except Exception:
        sc.cycles.device = "CPU"
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    world = bpy.data.worlds.new(P + "world_" + sc.name)
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = lin("#FFF1E0")
    bg.inputs[1].default_value = 0.32
    sc.world = world


def area(name, loc, target, size, power, col, coll):
    li = bpy.data.lights.new(P + name, "AREA")
    li.shape = "DISK"
    li.size = size
    li.energy = power
    li.color = lin(col)[:3]
    ob = bpy.data.objects.new(P + name, li)
    ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    coll.objects.link(ob)
    return ob


def catcher(name, z, size, coll):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=size)
    ob = mesh_obj(name, bm, mat("#ffffff"), coll, smooth=False)
    ob.location = (0, 0, z)
    ob.is_shadow_catcher = True
    return ob


# ── THE BOARD VIEW: seen from straight above, under the board's own lamps ─────
# The lamps stand where the board picture's do (tools/look-prototype/blender/clay.py), so a
# piece's picture carries the light and the soft shadow it has on the board.
bv = bpy.data.scenes.new(P + "board_view")
setup_render(bv, 128)
bv.render.resolution_x = bv.render.resolution_y = 300
bv_catch = catcher("bv_catcher", 0.0, 3, bv.collection)
area("bv_key", (-5.5, 5.0, 9.0), (0, 0, 0), 7.0, 1700, "#FFF2E2", bv.collection)
area("bv_fill", (6, -6, 6.0), (0, 0, 0), 10.0, 260, "#DCE9FF", bv.collection)
bcam = bpy.data.cameras.new(P + "bv_cam")
bcam.type = "ORTHO"
bcam.ortho_scale = PIECE_SPAN
bcam_ob = bpy.data.objects.new(P + "bv_cam", bcam)
bcam_ob.location = (0, 0, 12)
bv.collection.objects.link(bcam_ob)
bv.camera = bcam_ob
BV = {n: instance("bv_" + n, MODELS[n], (0, 0, 0), PIECE_SCALE, bv.collection) for n in MODELS}

# ── THE CARD VIEW: seen at an angle, as a card and the title see a piece ──────
cv = bpy.data.scenes.new(P + "card_view")
setup_render(cv, 128)
cv.render.resolution_x = cv.render.resolution_y = 360
catcher("cv_catcher", 0.0, 14, cv.collection)
area("cv_key", (-3.2, -1.2, 6.0), (0, 0, 0.4), 4.0, 430, "#FFF4E6", cv.collection)
area("cv_fill", (3.5, -3.5, 2.5), (0, 0, 0.4), 6.0, 70, "#DDEBFF", cv.collection)
ccam = bpy.data.cameras.new(P + "cv_cam")
ccam.type = "ORTHO"
ccam_ob = bpy.data.objects.new(P + "cv_cam", ccam)
TILT = math.radians(32)
ccam_ob.location = (0, -math.sin(TILT) * 10, math.cos(TILT) * 10 + 0.45)
ccam_ob.rotation_euler = (TILT, 0, 0)
cv.collection.objects.link(ccam_ob)
cv.camera = ccam_ob
CV = {n: instance("cv_" + n, MODELS[n], (0, 0, 0), 1.0, cv.collection) for n in PIECES}


def render_board_view(name):
    """`name` is a piece, `base`, or `swatch-board`. Written to _png/board/<name>.png."""
    for n, e in BV.items():
        e.hide_render = n != name
    # the swatch IS the ground; everything else stands on a ground that only catches its shadow
    bv_catch.hide_render = name == "swatch-board"
    bv.render.filepath = os.path.join(PNG, "board", name + ".png")
    bpy.ops.render.render(write_still=True, scene=bv.name)
    return bv.render.filepath


def render_card_view(name):
    for n, e in CV.items():
        e.hide_render = n != name
    ccam.ortho_scale = 4.4 if name in WIDE else 3.3
    cv.render.filepath = os.path.join(PNG, "card", name + ".png")
    bpy.ops.render.render(write_still=True, scene=cv.name)
    return cv.render.filepath


def render_all(only=None):
    done = []
    for n in list(MODELS):
        if only and n not in only:
            continue
        render_board_view(n)
        if n in CV:
            render_card_view(n)
        done.append(n)
    return done


result = {"pieces": PIECES, "others": ["base", "swatch-board"]}
