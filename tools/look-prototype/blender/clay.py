# The Clay set, as Blender builds it. Stage L2 of docs/LOOK_PLAN.md.
#
# Run inside Blender (5.x), through its connector or its Python console:
#
#     ns = {"ROOT": "<the repository's folder>"}
#     exec(compile(open(ROOT + "/tools/look-prototype/blender/clay.py").read(), "clay.py", "exec"), ns)
#     ns["render_board"]()            # public/art/board.png, the board with nothing on it
#     ns["render_piece"]("bcell")     # public/art/pieces/bcell.png, seen from above, lit as the board is
#     ns["export_models"]()           # public/art/models/*.glb, for the way that draws the models live
#
# It makes scenes of its own, all named IW_L2_*, and leaves any other scene untouched.
# Nothing here is downloaded or bought: every shape is built below from spheres, cylinders and
# curves, and the board's positions are read from packages/content/src/board/geometry.json,
# the one source, and nowhere else.
#
# What each model claims, so it can be defended to a scientist:
#   monocyte     one large kidney-shaped nucleus, an irregular outline
#   neutrophil   a nucleus of several lobes joined by thin strands, fine granules
#   B cell       a round cell that is nearly all nucleus; antibody receptors on its surface,
#                stems in the membrane and arms outward
#   killer T     nearly all nucleus; short paired receptors; killing granules gathered to one side
#   helper T     the same build; it sends signals (cytokines) outward
#   NK cell      a larger lymphocyte, an indented nucleus, coarse granules
#   eosinophil   a nucleus of two lobes, large granules filling the cell
#   bacterium    a rod with a flagellum. ONE generic shape for every bacterial disease, as in the
#                art it replaces; a coated one carries antibodies the right way round, arms on
#                the microbe and stems outward
#   fungus       a yeast cell, budding
#   virus        an envelope studded with spike proteins
import bpy, bmesh, json, math, os, random
from mathutils import Vector

ROOT = globals().get("ROOT") or os.environ.get("IW_ROOT")
if not ROOT:
    raise RuntimeError('set ROOT to the repository folder before running: ns = {"ROOT": "..."}')
HERE = os.path.join(ROOT, "tools", "look-prototype")
ART = os.path.join(HERE, "public", "art")
TEX = os.path.join(HERE, "blender", "tex")
GEO = json.load(open(os.path.join(ROOT, "packages", "content", "src", "board", "geometry.json")))
BOARD = json.load(open(os.path.join(ROOT, "packages", "content", "src", "rules", "board.json")))
CELL_KEYS = ["macrophage", "neutrophil", "bcell", "tcell", "helper", "nk", "eosinophil"]
U = 0.01  # one board unit in Blender units
PAD = 15  # board units of margin round the content pack's VIEWBOX, as in the page
PIECE_SCALE = 0.23  # a piece's body radius on the board, in Blender units
PIECE_SPAN = 0.9  # the square a piece picture covers, in Blender units


def lin(hexcol, a=1.0):
    h = hexcol.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], a)


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


wipe("IW_L2")
P = "IW_L2_"
_mats = {}


def mat(col, rough=0.62, sss=0.12, emit=0.0):
    key = (col, rough, sss, emit)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(P + "m_" + col.lstrip("#"))
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = lin(col)
    b.inputs["Roughness"].default_value = rough
    for nm, val in (("Subsurface Weight", sss), ("Emission Strength", emit)):
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


class Quality:
    """How finely the round things are cut. Pictures are rendered from FINE; the models that are
    drawn live on the phone are exported from LIGHT."""

    def __init__(self, tag, seg, small, bevel, curve):
        self.tag, self.seg, self.small, self.bevel, self.curve = tag, seg, small, bevel, curve


FINE = Quality("fine", 48, 16, 6, 16)
LIGHT = Quality("light", 20, 8, 2, 6)


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


def tube(name, pts, radius, material, coll, q, bez=True, caps=True):
    cu = bpy.data.curves.new(P + name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = q.bevel
    cu.use_fill_caps = True
    cu.resolution_u = q.curve
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
            sphere(f"{name}_cap{i}", p, radius, material, coll, seg=q.small)
    return ob


# ── the cells ────────────────────────────────────────────────────────────────
# A soft flattened body with its nucleus and granules laid on top, so the features that tell
# the cells apart are readable from above. Body radius is 1.
FLAT = 0.6
BASE = FLAT * 0.82


def top(x, y, R=1.0):
    r2 = (x * x + y * y) / (R * R)
    return BASE + FLAT * R * math.sqrt(max(0.0, 1.0 - r2))


def body(name, col, coll, q, R=1.0, lumpy=0.0, seed=0.0):
    ob = sphere(name + "_body", (0, 0, BASE), (R, R, FLAT * R), mat(col, rough=0.58, sss=0.2), coll, seg=max(q.seg, 24))
    if lumpy:
        tex = bpy.data.textures.new(P + "tex_" + name, "CLOUDS")
        tex.noise_scale = 1.1
        mod = ob.modifiers.new("lump", "DISPLACE")
        mod.texture = tex
        mod.strength = lumpy
        mod.texture_coords = "LOCAL"
        ob.rotation_euler = (0, 0, seed)
    return ob


def lobe(name, x, y, rx, ry, col, coll, q, R=1.0, h=0.16):
    return sphere(name, (x, y, top(x, y, R) - 0.02), (rx, ry, h), mat(col, rough=0.5, sss=0.1), coll, seg=max(12, q.seg // 2))


def granules(name, pts, r, col, coll, q, R=1.0):
    for i, (x, y) in enumerate(pts):
        sphere(f"{name}_g{i}", (x, y, top(x, y, R) + r * 0.1), r, mat(col, rough=0.45, sss=0.05), coll, seg=q.small)


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


def antibody(name, origin, ang, col, coll, q, flip=False, size=1.0):
    """A Y, starting at `origin` and pointing along `ang`. On a B cell the stem sits in the
    membrane and the arms point out. On a coated microbe it is the other way round (flip): the
    arms hold the microbe and the stem points away, where a phagocyte can grip it."""
    ox, oy, z = origin
    c, s = math.cos(ang), math.sin(ang)
    m = mat(col, rough=0.45, sss=0.05)
    stem, arm, rad = 0.2 * size, 0.18 * size, 0.04 * size
    if not flip:
        j = (ox + c * stem, oy + s * stem, z)
        tube(name + "_s", [(ox, oy, z), j], rad, m, coll, q, bez=False)
        for k, da in enumerate((0.62, -0.62)):
            tube(f"{name}_a{k}", [j, (j[0] + math.cos(ang + da) * arm, j[1] + math.sin(ang + da) * arm, z + 0.03)], rad, m, coll, q, bez=False)
    else:
        j = (ox + c * arm, oy + s * arm, z)
        tube(name + "_s", [j, (ox + c * (arm + stem), oy + s * (arm + stem), z)], rad, m, coll, q, bez=False)
        for k, da in enumerate((0.7, -0.7)):
            tube(f"{name}_a{k}", [j, (j[0] - math.cos(ang + da) * arm, j[1] - math.sin(ang + da) * arm, z)], rad, m, coll, q, bez=False)


def paired_receptors(name, R0, R1, off, col, coll, q, skip=None):
    """T-cell receptors: two short chains side by side."""
    m = mat(col, rough=0.5)
    for i in range(9):
        a = i / 9 * math.tau + off
        if skip and skip[0] < (a % math.tau) < skip[1]:
            continue
        for g in (-0.055, 0.055):
            ox, oy = -math.sin(a) * g, math.cos(a) * g
            tube(f"{name}_r{i}{'a' if g > 0 else 'b'}", [(math.cos(a) * R0 + ox, math.sin(a) * R0 + oy, BASE + 0.05), (math.cos(a) * R1 + ox, math.sin(a) * R1 + oy, BASE + 0.05)], 0.032, m, coll, q, bez=False)


def build_cell(key, q):
    coll = bpy.data.collections.new(f"{P}{q.tag}_{key}")
    n = f"{q.tag}_{key}"
    if key == "macrophage":
        body(n, "#3DB6A2", coll, q, R=1.02, lumpy=0.22, seed=0.4)
        pts = []
        for i in range(9):
            a = math.radians(200 - i * 27.5)
            x, y = math.cos(a) * 0.4 - 0.02, math.sin(a) * 0.4 + 0.02
            pts.append((x, y, top(x, y) - 0.08))
        tube(n + "_nuc", pts, 0.2, mat("#1C6F63", rough=0.5), coll, q)
        granules(n, [(-0.15, -0.5), (0.3, -0.52), (0.58, -0.2)], 0.07, "#8FDCCB", coll, q)
    elif key == "neutrophil":
        body(n, "#C4B2EE", coll, q, R=0.98, lumpy=0.06, seed=1.3)
        lobes = [(-0.42, -0.16), (-0.22, 0.3), (0.22, 0.32), (0.44, -0.12)]
        tube(n + "_strand", [(x, y, top(x, y) - 0.03) for x, y in lobes], 0.045, mat("#6E52BE"), coll, q, caps=False)
        for i, (x, y) in enumerate(lobes):
            lobe(f"{n}_l{i}", x, y, 0.22, 0.22, "#6E52BE", coll, q)
        granules(n, scatter(24, 0.15, 0.82, 11, [(x, y, 0.3) for x, y in lobes], 0.14), 0.035, "#8E78D0", coll, q)
    elif key == "bcell":
        body(n, "#86B6F0", coll, q, R=0.82)
        lobe(n + "_nuc", 0.02, -0.02, 0.54, 0.54, "#2F6FD0", coll, q, R=0.82, h=0.2)
        for i in range(10):
            a = i / 10 * math.tau + 0.2
            antibody(f"{n}_y{i}", (math.cos(a) * 0.78, math.sin(a) * 0.78, BASE + 0.05), a, "#E7B549", coll, q, size=1.05)
    elif key == "tcell":
        body(n, "#97D48F", coll, q, R=0.85)
        lobe(n + "_nuc", -0.12, -0.1, 0.5, 0.5, "#3E9B4F", coll, q, R=0.85, h=0.2)
        granules(n, [(0.42, 0.32), (0.56, 0.12), (0.26, 0.52), (0.5, 0.5)], 0.08, "#1F6B33", coll, q, R=0.85)
        paired_receptors(n, 0.8, 1.0, 0.5, "#3E9B4F", coll, q)
    elif key == "helper":
        body(n, "#F5CF7A", coll, q, R=0.85)
        lobe(n + "_nuc", -0.08, -0.08, 0.51, 0.51, "#DE951A", coll, q, R=0.85, h=0.2)
        paired_receptors(n, 0.8, 1.0, 2.6, "#DE951A", coll, q, skip=(0.3, 1.3))
        sm = mat("#F08A3C", rough=0.4, emit=0.4)
        for ring in range(3):
            for k in (-1, 0, 1):
                a = 0.8 + k * 0.3
                r = 1.0 + ring * 0.16
                sphere(f"{n}_sig{ring}{k + 1}", (math.cos(a) * r, math.sin(a) * r, BASE + 0.12 + ring * 0.05), 0.07 - ring * 0.015, sm, coll, seg=q.small)
    elif key == "nk":
        body(n, "#BCC5E4", coll, q, R=0.95, lumpy=0.05, seed=2.2)
        lobe(n + "_nuc", -0.12, 0.0, 0.46, 0.44, "#5A6AA8", coll, q, R=0.95, h=0.2)
        lobe(n + "_nuc2", 0.12, 0.12, 0.26, 0.26, "#5A6AA8", coll, q, R=0.95, h=0.18)
        granules(n, scatter(11, 0.6, 0.8, 21, [(-0.1, 0.0, 0.55)], 0.24), 0.085, "#3B4A85", coll, q, R=0.95)
    elif key == "eosinophil":
        body(n, "#F6B4C2", coll, q, R=0.98, lumpy=0.05, seed=3.1)
        lobes = [(-0.28, 0.12), (0.3, 0.1)]
        tube(n + "_strand", [(-0.28, 0.12, top(-0.28, 0.12) - 0.02), (0, 0.3, top(0, 0.3) - 0.02), (0.3, 0.1, top(0.3, 0.1) - 0.02)], 0.05, mat("#C8507A"), coll, q, caps=False)
        for i, (x, y) in enumerate(lobes):
            lobe(f"{n}_l{i}", x, y, 0.27, 0.3, "#C8507A", coll, q)
        granules(n, scatter(17, 0.1, 0.8, 31, [(x, y, 0.4) for x, y in lobes], 0.2), 0.09, "#E8674A", coll, q)
    return coll


def build_pathogen(kind, q, coated=False):
    name = kind + ("_coated" if coated else "")
    coll = bpy.data.collections.new(f"{P}{q.tag}_{name}")
    n = f"{q.tag}_{name}"
    if kind == "bacteria":
        m = mat("#9BB02F", rough=0.5, sss=0.2)
        z = 0.34
        tube(n + "_rod", [(-0.6, 0, z), (0.6, 0, z)], 0.34, m, coll, q, bez=False)
        tube(n + "_fl", [(0.9, 0, z), (1.1, 0.16, z), (1.3, -0.12, z), (1.5, 0.12, z), (1.72, 0.0, z)], 0.035, mat("#6E8018"), coll, q)
        tube(n + "_dna", [(-0.45, 0.0, z + 0.33), (-0.25, 0.1, z + 0.34), (-0.05, -0.1, z + 0.34), (0.15, 0.1, z + 0.34), (0.4, 0.0, z + 0.33)], 0.035, mat("#5E7010"), coll, q)
        if coated:
            spots = [(-0.4, 0.34, math.pi / 2), (0.0, 0.34, math.pi / 2), (0.4, 0.34, math.pi / 2), (-0.4, -0.34, -math.pi / 2), (0.0, -0.34, -math.pi / 2), (0.4, -0.34, -math.pi / 2), (-0.94, 0, math.pi)]
            for i, (x, y, a) in enumerate(spots):
                antibody(f"{n}_ab{i}", (x, y, z), a, "#E7B549", coll, q, flip=True, size=1.2)
    elif kind == "fungus":
        m = mat("#D873E8", rough=0.5, sss=0.2)
        sphere(n + "_a", (-0.15, -0.15, 0.5), (0.62, 0.62, 0.5), m, coll, seg=max(q.seg, 24))
        sphere(n + "_b", (0.52, 0.4, 0.34), (0.34, 0.34, 0.3), m, coll, seg=max(16, q.seg // 2))
        sphere(n + "_c", (0.86, 0.76, 0.22), (0.18, 0.18, 0.17), m, coll, seg=max(12, q.seg // 2))
        sphere(n + "_n", (-0.25, -0.2, 0.96), (0.2, 0.2, 0.08), mat("#8A2CA0"), coll, seg=max(12, q.seg // 2))
    elif kind == "virus":
        m = mat("#EF4444", rough=0.5, sss=0.2)
        sphere(n + "_core", (0, 0, 0.62), 0.6, m, coll, seg=max(q.seg, 24))
        sm = mat("#FF9A7A", rough=0.45)
        count = 26
        for i in range(count):
            yv = 1 - (i + 0.5) / count * 1.25
            rad = math.sqrt(max(0.0, 1 - yv * yv))
            th = i * 2.399963
            d = Vector((math.cos(th) * rad, math.sin(th) * rad, yv))
            p0 = Vector((0, 0, 0.62)) + d * 0.58
            p1 = Vector((0, 0, 0.62)) + d * 0.82
            tube(f"{n}_sp{i}", [tuple(p0), tuple(p1)], 0.035, sm, coll, q, bez=False, caps=False)
            sphere(f"{n}_kn{i}", tuple(p1), 0.075, sm, coll, seg=q.small)
    return coll


NAMES = CELL_KEYS + ["bacteria", "bacteria_coated", "fungus", "virus"]


def build_set(q):
    out = {k: build_cell(k, q) for k in CELL_KEYS}
    out["bacteria"] = build_pathogen("bacteria", q)
    out["bacteria_coated"] = build_pathogen("bacteria", q, coated=True)
    out["fungus"] = build_pathogen("fungus", q)
    out["virus"] = build_pathogen("virus", q)
    return out


MODELS = build_set(FINE)
MODELS_LIGHT = build_set(LIGHT)


def instance(name, coll_model, loc, scale, rot_z, coll):
    e = bpy.data.objects.new(P + "i_" + name, None)
    e.instance_type = "COLLECTION"
    e.instance_collection = coll_model
    e.location = loc
    e.scale = (scale, scale, scale)
    e.rotation_euler = (0, 0, rot_z)
    coll.objects.link(e)
    return e


def setup_render(sc, w, h, samples):
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
    sc.render.resolution_x = w
    sc.render.resolution_y = h
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


def catcher(name, loc, size, coll):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=size)
    ob = mesh_obj(name, bm, mat("#ffffff"), coll, smooth=False)
    ob.location = loc
    ob.is_shadow_catcher = True
    return ob


# ── the board ────────────────────────────────────────────────────────────────
vb = GEO["VIEWBOX"]
VW, VH = vb["w"] + PAD * 2, vb["h"] + PAD * 2
RES_W = 1080
RES_H = round(RES_W * VH / VW)
HUB = GEO["HUB"]
HX, HY = HUB["x"] * U, -HUB["y"] * U

bs = bpy.data.scenes.new(P + "board")
setup_render(bs, RES_W, RES_H, samples=160)
static = bpy.data.collections.new(P + "board_static")
bs.collection.children.link(static)
rig = bpy.data.collections.new(P + "board_rig")
bs.collection.children.link(rig)


def Pt(p, z=0.0):
    return (p["x"] * U, -p["y"] * U, z)


KEY_FROM = (HX - 5.5, HY + 5.0, 9.0)
board_catcher = catcher("board_catcher", (HX, HY, -0.09), 20, rig)
area("board_key", KEY_FROM, (HX, HY, 0), 7.0, 1700, "#FFF2E2", rig)
area("board_fill", (HX + 6, HY - 6, 6.0), (HX, HY, 0), 10.0, 260, "#DCE9FF", rig)
bcam = bpy.data.cameras.new(P + "board_cam")
bcam.type = "ORTHO"
bcam.ortho_scale = max(VW, VH) * U
bcam_ob = bpy.data.objects.new(P + "board_cam", bcam)
bcam_ob.location = ((vb["x"] - PAD + VW / 2) * U, -(vb["y"] - PAD + VH / 2) * U, 12)
rig.objects.link(bcam_ob)
bs.camera = bcam_ob

M_BOARD = mat("#17474F", rough=0.8, sss=0.0)
M_RIM = mat("#0F2F35", rough=0.7, sss=0.0)
M_ROUTE = mat("#E08E7E", rough=0.6)
M_BRANCH = mat("#DDB06A", rough=0.6)
M_CREAM = mat("#E9DCC3", rough=0.55)
M_LYMPH = mat("#8FD3E8", rough=0.5)
M_HUB = mat("#E8674A", rough=0.5, sss=0.25)
ORGAN_COL = {"brain": "#C98BA6", "lungs": "#E08F86", "heart": "#D9574B", "liver": "#B7684B", "spleen": "#9A5B86", "kidneys": "#C5674F", "marrow": "#D8A24A"}

cyl("board", (HX, HY, -0.08), 3.09, 0.08, M_BOARD, static, bevel=0.02, seg=128)
cyl("board_rim", (HX, HY, -0.1), 3.15, 0.06, M_RIM, static, bevel=0.02, seg=128)


def decal(name, loc, size, tex, col):
    """A pictogram laid flat on a coin: a square whose picture is the pictogram's shape."""
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=size)
    uv = bm.loops.layers.uv.new("uv")
    for face in bm.faces:
        for loop in face.loops:
            loop[uv].uv = ((loop.vert.co.x / size + 1) / 2, (loop.vert.co.y / size + 1) / 2)
    m = bpy.data.materials.new(P + "decal_" + name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = lin(col)
    b.inputs["Roughness"].default_value = 0.5
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(os.path.join(TEX, tex + ".png"), check_existing=False)
    nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
    if hasattr(m, "blend_method"):
        m.blend_method = "BLEND"
    ob = mesh_obj("decal_" + name, bm, m, static, smooth=False)
    ob.location = loc
    ob.visible_shadow = False
    return ob


def ridge(name, pts, material):
    tube(name, [(p["x"] * U, -p["y"] * U, 0.0) for p in pts], 0.045, material, static, FINE, bez=False, caps=False)


for lane in BOARD["ROUTE_KEYS"]:
    steps = sorted(GEO["ROUTE"][lane], key=int)
    ridge("route_" + lane, [HUB] + [GEO["ROUTE"][lane][s] for s in steps], M_ROUTE)
    grp = BOARD["LYMPH_GROUP"][lane]
    for s in steps:
        ly = grp and int(s) == BOARD["LYMPH_STEP"]
        cyl(f"node_{lane}_{s}", Pt(GEO["ROUTE"][lane][s]), 0.1 if ly else 0.085, 0.035, M_LYMPH if ly else M_CREAM, static, bevel=0.01, seg=40)
    e = GEO["ENTRY"][lane]
    dx, dy = e["x"] - HUB["x"], e["y"] - HUB["y"]
    k = 1 + 20 / math.hypot(dx, dy)
    ex, ey = (HUB["x"] + dx * k) * U, -(HUB["y"] + dy * k) * U
    cyl("entry_" + lane, (ex, ey, 0), 0.25, 0.06, M_CREAM, static, bevel=0.015)
    decal("entry_" + lane, (ex, ey, 0.066), 0.19, "entry-" + lane, "#3B2A4A")

for o in BOARD["ALL_ORGANS"]:
    steps = sorted(GEO["BRANCH"][o], key=int, reverse=True)
    ridge("branch_" + o, [HUB] + [GEO["BRANCH"][o][s] for s in steps] + [GEO["ORGAN_POS"][o]], M_BRANCH)
    for s in steps:
        cyl(f"bnode_{o}_{s}", Pt(GEO["BRANCH"][o][s]), 0.085, 0.035, M_CREAM, static, bevel=0.01, seg=40)
    c = GEO["CHIP_POS"][o]
    cyl("organ_" + o, Pt(c), 0.3, 0.09, mat(ORGAN_COL[o], rough=0.5, sss=0.2), static, bevel=0.02)
    decal("organ_" + o, Pt(c, 0.096), 0.22, "organ-" + o, "#FFF6EA")
    cyl("res_dish_" + o, Pt(GEO["ORGAN_POS"][o]), 0.19, 0.03, M_CREAM, static, bevel=0.01, seg=48)

groups = {}
for lane, grp in BOARD["LYMPH_GROUP"].items():
    if grp:
        groups.setdefault(grp, []).append(GEO["ROUTE"][lane][str(BOARD["LYMPH_STEP"])])
for grp, pts in groups.items():
    pts.sort(key=lambda p: math.atan2(p["y"] - HUB["y"], p["x"] - HUB["x"]))
    for a, b in zip(pts, pts[1:]):
        n = int(math.hypot(b["x"] - a["x"], b["y"] - a["y"]) / 9)
        for i in range(1, n):
            t = i / n
            sphere(f"ly_{grp}_{a['x']:.0f}_{i}", ((a["x"] + (b["x"] - a["x"]) * t) * U, -(a["y"] + (b["y"] - a["y"]) * t) * U, 0.0), (0.028, 0.028, 0.02), M_LYMPH, static, seg=12)

cyl("hub", (HX, HY, 0), 0.48, 0.05, M_HUB, static, bevel=0.02, seg=96)
cyl("hub_rim", (HX, HY, -0.01), 0.53, 0.035, M_CREAM, static, bevel=0.012, seg=96)

# ── one piece at a time, seen exactly as the board is seen ──────────────────
# The piece stands at the hub's position under the board's own lights, on a catcher at the
# height a piece stands at, so its picture carries the same light and the same soft shadow it
# would have had in a render of the whole board.
PIECE_Z = 0.035
pieces = bpy.data.collections.new(P + "piece_stage")
bs.collection.children.link(pieces)
piece_catcher = catcher("piece_catcher", (HX, HY, PIECE_Z), 3, pieces)
pcam = bpy.data.cameras.new(P + "piece_cam")
pcam.type = "ORTHO"
pcam.ortho_scale = PIECE_SPAN
pcam_ob = bpy.data.objects.new(P + "piece_cam", pcam)
pcam_ob.location = (HX, HY, 12)
pieces.objects.link(pcam_ob)
STAGE = {name: instance("stage_" + name, MODELS[name], (HX, HY, PIECE_Z), PIECE_SCALE, 0.0, pieces) for name in NAMES}


def _show(board, piece):
    for ob in static.objects:
        ob.hide_render = not board
    board_catcher.hide_render = not board
    piece_catcher.hide_render = piece is None
    for name, e in STAGE.items():
        e.hide_render = name != piece


def render_board():
    _show(True, None)
    bs.camera = bcam_ob
    bs.render.resolution_x, bs.render.resolution_y = RES_W, RES_H
    bs.cycles.samples = 160
    bs.render.filepath = os.path.join(ART, "board.png")
    bpy.ops.render.render(write_still=True, scene=bs.name)
    return bs.render.filepath


def render_piece(name, px=320):
    _show(False, name)
    bs.camera = pcam_ob
    bs.render.resolution_x, bs.render.resolution_y = px, px
    bs.cycles.samples = 128
    bs.render.filepath = os.path.join(ART, "pieces", name + ".png")
    bpy.ops.render.render(write_still=True, scene=bs.name)
    return bs.render.filepath


# ── the models themselves, for drawing live ──────────────────────────────────
# Each model is joined into one mesh with one part per material, so a piece costs a few draw
# calls on the phone, not one per granule.
xs = bpy.data.scenes.new(P + "export")
xstage = {name: instance("x_" + name, MODELS_LIGHT[name], (0, 0, 0), 1.0, 0.0, xs.collection) for name in NAMES}


def _part(ob, mx):
    """A real mesh made from an evaluated object, with where it stands and what it is made of."""
    material = ob.material_slots[0].material if ob.material_slots else None
    return (bpy.data.meshes.new_from_object(ob), mx.copy(), material.original if material else None)


def _joined(name, parts):
    """parts: (mesh, world matrix, material). Returns one object holding them all."""
    bm = bmesh.new()
    mats = []
    for part, mx, material in parts:
        if material not in mats:
            mats.append(material)
        v0, f0 = len(bm.verts), len(bm.faces)
        bm.from_mesh(part)
        bm.verts.ensure_lookup_table()
        bm.faces.ensure_lookup_table()
        for v in bm.verts[v0:]:
            v.co = mx @ v.co
        for f in bm.faces[f0:]:
            f.material_index = mats.index(material)
        bpy.data.meshes.remove(part)
    me = bpy.data.meshes.new(P + "x_" + name)
    bm.to_mesh(me)
    tris = sum(len(f.verts) - 2 for f in bm.faces)
    bm.free()
    for m in mats:
        me.materials.append(m)
    out = bpy.data.objects.new(P + "x_" + name, me)
    coll = bpy.data.collections.new(P + "x_" + name)
    coll.objects.link(out)
    xs.collection.children.link(coll)
    return coll, tris, len(mats)


def _export(coll, path):
    # The exporter reads the collection from the scene the window is showing. Asked from any
    # other scene it writes a file with nothing in it and reports success (seen: 140 bytes), so
    # the scene is switched for the export and the size is checked afterwards.
    win = bpy.context.window
    before = win.scene
    win.scene = xs
    try:
        bpy.ops.export_scene.gltf(filepath=path, collection=coll.name, export_format="GLB", export_apply=True, export_cameras=False, export_lights=False)
    finally:
        win.scene = before
    size = os.path.getsize(path)
    if size < 2000:
        raise RuntimeError(f"{os.path.basename(path)} is {size} bytes: the export wrote no geometry")
    return size


def export_models():
    report = {}
    # a scene nobody has looked at has no dependency graph until its layer is updated
    xs.view_layers[0].update()
    dg = xs.view_layers[0].depsgraph
    dg.update()
    parts = {name: [] for name in NAMES}
    by_empty = {e.name: name for name, e in xstage.items()}
    for inst in dg.object_instances:
        if not inst.is_instance or inst.object.type not in ("MESH", "CURVE"):
            continue
        name = by_empty.get(inst.parent.original.name)
        if name:
            # made into a real mesh here, while the instance is still valid
            parts[name].append(_part(inst.object, inst.matrix_world))
    for name in NAMES:
        coll, tris, nmat = _joined(name, parts[name])
        size = _export(coll, os.path.join(ART, "models", name + ".glb"))
        report[name] = {"triangles": tris, "materials": nmat, "bytes": size}
    # the board, joined the same way; the pictograms keep their own materials because each
    # carries its own picture
    for ob in static.objects:
        ob.hide_render = False
    bs.view_layers[0].update()
    bdg = bs.view_layers[0].depsgraph
    bdg.update()
    # The pictograms are left out: a picture whose only link is to transparency does not survive
    # the export (seen: blank coins), so the live way lays them on from blender/tex itself.
    solid = [_part(o.evaluated_get(bdg), o.matrix_world) for o in static.objects if o.type in ("MESH", "CURVE") and "decal_" not in o.name]
    coll, tris, nmat = _joined("board", solid)
    size = _export(coll, os.path.join(ART, "models", "board.glb"))
    report["board"] = {"triangles": tris, "materials": nmat, "bytes": size}
    return report


result = {"models": NAMES, "board_res": [RES_W, RES_H], "objects": len(bpy.data.objects)}
