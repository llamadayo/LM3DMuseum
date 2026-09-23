"""Optional poster generation: Blender --background --python scripts/render-posters.py.
Renders real GLB assets without modifying source models. Requires Blender 4+.
"""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parent.parent
exhibits = json.loads((root / 'src/data/exhibits.json').read_text())

for item in exhibits:
    if item['model'].startswith('https://'):
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(root / 'public' / item['model']))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    points = [o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
    minimum = Vector([min(v[i] for v in points) for i in range(3)])
    maximum = Vector([max(v[i] for v in points) for i in range(3)])
    center = (minimum + maximum) / 2
    size = max(maximum - minimum)
    # Normalize the imported root hierarchy together; maintain all child transforms.
    parents = [o for o in bpy.context.scene.objects if o.parent is None]
    rig = bpy.data.objects.new('Display root', None)
    bpy.context.collection.objects.link(rig)
    for obj in parents:
        obj.parent = rig
    rig.scale = (2 / size,) * 3
    rig.location = -center * (2 / size)
    bpy.context.view_layer.update()
    ground_z = (minimum.z - center.z) * 2 / size
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, ground_z - .012))
    floor = bpy.context.object
    material = bpy.data.materials.new('Warm limestone backdrop')
    material.diffuse_color = (.72, .71, .68, 1)
    floor.data.materials.append(material)
    scene = bpy.context.scene
    scene.world = bpy.data.worlds.new('Studio')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.8, .8, .78, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .5
    for name, loc, power, scale in [('Key', (-3,-4,6), 500, 5), ('Fill',(4,-2,3),160,4), ('Rim',(0,4,4),350,3)]:
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.object
        light.name = name; light.data.energy = power; light.data.shape = 'DISK'; light.data.size = scale
        light.rotation_euler = (-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(2.6,-5.6,2.0))
    camera = bpy.context.object
    target = Vector((0,0,-.06))
    camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type = 'ORTHO'; camera.data.ortho_scale = 3.0
    scene.camera = camera
    scene.render.engine = 'CYCLES'; scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1100; scene.render.resolution_y = 1100; scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.render.image_settings.file_format = 'WEBP'; scene.render.image_settings.quality = 90
    scene.render.filepath = str(root / 'public' / item['poster'])
    bpy.ops.render.render(write_still=True)
    print('Poster rendered:', item['poster'])
