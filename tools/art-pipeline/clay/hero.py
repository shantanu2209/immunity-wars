# THE TITLE'S PICTURE (stage L5 of docs/LOOK_PLAN.md): the seven cells on their board, seen at an
# angle, the Monocyte in the bloodstream's dish and the other six round it. It is the picture of the
# title screen Shantanu picked at stage L1 (docs/look/l1-clay-title.webp), made again from the pieces
# of the kit he approved at L3, so the cells on the title are the cells on the board: each on its
# rimmed base, and the bloodstream a coral rim round a dark dish, as the measurements of L3 made them.
#
# Run in Blender AFTER pieces.py and board.py, in the same namespace (it uses their models, their
# materials and their helpers), through the connector:
#
#   ns = bpy.app.driver_namespace["iwk"]; exec(open(".../clay/hero.py").read(), ns)
#   ns["render_hero"](wait=False)      # renders in Blender's window; poll is_job_running("RENDER")
#
# It writes _png/scene/title.png. It decides nothing about the game and reads nothing from the
# content pack but what pieces.py already read: which seven cells there are.
#
# WHAT IT CLAIMS, for a scientist: nothing new. It arranges the seven cell models pieces.py builds,
# whose header says what each shape claims. The Monocyte stands in the bloodstream because that is
# where a monocyte is until it is called into tissue, and where the game starts it.
import math
import os

import bpy

HERO = P + "hero"  # noqa: F821  (P, and every helper below, is pieces.py's, in this namespace)
HERO_PX = (1080, 960)
HERO_TILT = math.radians(36)
HERO_ORTHO = 7.9
HERO_BOARD_R = 3.5
HERO_RING_R = 2.42
HERO_CELL = 0.56
HERO_MONOCYTE = 1.0
HERO_DISH_R = 1.52


def build_hero():
    if HERO in bpy.data.scenes:
        old = bpy.data.scenes[HERO]
        for o in list(old.collection.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.scenes.remove(old)
    sc = bpy.data.scenes.new(HERO)
    setup_render(sc, 160)  # noqa: F821
    sc.render.resolution_x, sc.render.resolution_y = HERO_PX
    root = sc.collection
    # The ground only catches the board's shadow: the picture stands on the page's own table.
    catcher("hero_catcher", -0.2, 30, root)  # noqa: F821
    area("hero_key", (-5.5, -1.5, 9.0), (0, 0, 0.3), 7.0, 2300, "#FFF2E2", root)  # noqa: F821
    area("hero_fill", (6, -6, 4.0), (0, 0, 0.3), 9.0, 420, "#DCE9FF", root)  # noqa: F821
    cam = bpy.data.cameras.new(HERO + "_cam")
    cam.type = "ORTHO"
    cam.ortho_scale = HERO_ORTHO
    cam_ob = bpy.data.objects.new(HERO + "_cam", cam)
    # Aimed a little above the board's middle: the cells stand up from it, and the board's shadow
    # falls below it, and neither may be cut by the picture's edge.
    cam_ob.location = (0, -math.sin(HERO_TILT) * 20, math.cos(HERO_TILT) * 20 + 0.12)
    cam_ob.rotation_euler = (HERO_TILT, 0, 0)
    root.objects.link(cam_ob)
    sc.camera = cam_ob

    # The board: the play screen's own ground and rim colours, as a disc.
    cyl("hero_rim", (0, 0, -0.14), HERO_BOARD_R + 0.1, 0.09, mat(shade(BOARD, 0.62), rough=0.8, sss=0.0), root, bevel=0.03, seg=128)  # noqa: F821
    cyl("hero_board", (0, 0, -0.1), HERO_BOARD_R, 0.1, mat(BOARD, rough=0.9, sss=0.0, spec=0.12), root, bevel=0.03, seg=128)  # noqa: F821
    # The bloodstream: a coral rim round a dark dish (L3's measurement: nothing reads on plain coral).
    cyl("hero_dish_rim", (0, 0, 0.0), HERO_DISH_R, 0.07, mat("#E8674A", rough=0.5, sss=0.25), root, bevel=0.03, seg=96)  # noqa: F821
    cyl("hero_dish", (0, 0, 0.012), HERO_DISH_R - 0.16, 0.07, mat(WELL, rough=0.85, sss=0.0, spec=0.12), root, bevel=0.02, seg=96)  # noqa: F821
    instance("hero_macrophage", MODELS["macrophage"], (0, 0, 0.085), HERO_MONOCYTE, root)  # noqa: F821

    others = [k for k in CELL_KEYS if k != "macrophage"]  # noqa: F821
    for i, k in enumerate(others):
        a = math.pi / 2 - i / len(others) * math.tau
        x, y = math.cos(a) * HERO_RING_R, math.sin(a) * HERO_RING_R
        instance("hero_base_" + k, MODELS["base"], (x, y, 0.0), HERO_CELL, root)  # noqa: F821
        instance("hero_" + k, MODELS[k], (x, y, 0.0), HERO_CELL, root)  # noqa: F821
    return sc


def render_hero(samples=160, wait=True):
    """Writes _png/scene/title.png. With wait=False it renders in Blender's window and returns."""
    sc = build_hero()
    sc.cycles.samples = samples
    os.makedirs(os.path.join(PNG, "scene"), exist_ok=True)  # noqa: F821
    sc.render.filepath = os.path.join(PNG, "scene", "title.png")  # noqa: F821
    if wait:
        bpy.ops.render.render(write_still=True, scene=sc.name)
    else:
        bpy.context.window.scene = sc
        bpy.ops.render.render("INVOKE_DEFAULT", write_still=True, scene=sc.name)
    return sc.render.filepath
