import sys
import subprocess
try:
    import rembg
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'rembg', 'Pillow', 'numpy'])

from rembg import remove
from PIL import Image

try:
    input_bg = Image.open('public/notfound.png')
    output_bg = remove(input_bg)
    output_bg.save('public/notfound_transparent.png')
    print('Done generating transparent 404 image!')
except Exception as e:
    print('Error:', e)
