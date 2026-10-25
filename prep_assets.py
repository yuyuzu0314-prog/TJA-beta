import os, shutil, json, glob, sys
from PIL import Image
SRC = sys.argv[1]   # 例: .../System/0.JpnNijiiro
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'skins', os.path.basename(SRC.rstrip('/')))
shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT, exist_ok=True)
G = os.path.join(SRC, 'Graphics')
dirs = ['1_Title','2_Config','4_SongLoading','6_Result','7_DanResult','9_NamePlateEffect']
roots = ['Tile_Black','NamePlate','Menu_Title','Menu_Highlight','Enum_Song','Scanning_Loudness','Network_Connection','Readme','Console_Font','Console_Font_Small']
manifest = {'images': {}, 'sounds': []}
n = 0; raw = 0; out = 0
def conv(src, rel):
    global n, raw, out
    dst = os.path.join(OUT, 'Graphics', rel[:-4] + '.webp')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.open(src).convert('RGBA')
    im.save(dst, 'WEBP', lossless=True, quality=100, method=4)
    manifest['images'][rel[:-4].replace('\\','/')] = [im.width, im.height]
    n += 1; raw += os.path.getsize(src); out += os.path.getsize(dst)
for d in dirs:
    for p in sorted(glob.glob(os.path.join(G, d, '**', '*.png'), recursive=True)):
        conv(p, os.path.relpath(p, G))
for r in roots:
    conv(os.path.join(G, r + '.png'), r + '.png')
# sounds (skip Dan wavs: used only by dan select/play)
S = os.path.join(SRC, 'Sounds')
for p in sorted(glob.glob(os.path.join(S, '**', '*.ogg'), recursive=True)):
    rel = os.path.relpath(p, S).replace('\\','/')
    dst = os.path.join(OUT, 'Sounds', rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy(p, dst)
    manifest['sounds'].append(rel)
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts'), exist_ok=True)
shutil.copy(os.path.join(G, 'ipag.ttf'), os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts', 'ipag.ttf'))
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=0)
print('images', n, 'png', raw//1024, 'KB -> webp', out//1024, 'KB; sounds', len(manifest['sounds']))
