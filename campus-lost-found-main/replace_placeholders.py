import re
import os

files = ['frontend/src/pages/Home.jsx', 'frontend/src/pages/Guard.jsx', 'frontend/src/pages/Admin.jsx']
for f in files:
    if os.path.exists(f):
        content = open(f, 'r', encoding='utf-8').read()
        new_content = re.sub(r'https://via\.placeholder\.com/[^"]+', '/placeholder.svg', content)
        open(f, 'w', encoding='utf-8').write(new_content)
        print(f"Updated {f}")
