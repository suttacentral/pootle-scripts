#!/usr/bin/env python

import io
import os
import time
import re
import pickle
import pathlib
import tempfile
import subprocess

# Scan for changes every SCAN_PERIOD seconds, looking only at files
# likely to have changed.
SCAN_PERIOD = 0.25

# Scan everything for changes every DEEP_SCAN_PERIOD
DEEP_SCAN_PERIOD = 10


POOTLE_DIR = pathlib.Path(os.environ.get('POOTLE_DIR', '.'))
if 'PO_DIR' in os.environ:
    PO_DIR = os.environ['PO_DIR']
else:
    PO_DIR = POOTLE_DIR / 'env/lib/python2.7/site-packages/pootle/po/'

def clean_text(text):
    if re.search(ur'msgid ".+"\nmsgstr "([^"]|\n"[^"])', text) == None:
        return None
    # Remove variant notes and other span classes
    text = re.sub(ur'<span[^>]+class=\\?"(?:var|cross|dquo|squo|gatn|brnum)\\?"[^>]+>([^>]+)</span>', ur'\1', text)
    # Remove anchors
    text = re.sub(ur'<a[^>]+>([^<]*)</a>', ur'\1', text)
    # Remove comments
    text = re.sub(ur'^#.+\n', ur'', text, re.MULTILINE)
    
    return text
    


def clear_temp_dir(rmdir=False):
    for file in temp_dir.glob('*'):
        file.unlink()
    if rmdir:
        temp_dir.rmdir()

def get_files():
    files = []
    for folder in PO_DIR.glob('*'):
        if not folder.is_dir():
            continue
        if folder.name in {'tutorial', 'terminology', 'test', '.tmp'}:
            continue
        files.extend(folder.glob('en/**/*.po'))
    files.sort(key=lambda f: f.stem)
    return files
    

temp_dir = pathlib.Path(tempfile.mkdtemp(prefix='amagama-working-'))
state = {}
watch_list = []

subprocess.check_output('./reset-tm.sh')

try:
    i = 0
    while True:
        if i % int(DEEP_SCAN_PERIOD / SCAN_PERIOD) == 0:
            files_to_scan = get_files()
        else:
            files_to_scan = watch_list
        i += 1
        
        file_mtimes = []
        for i, file in enumerate(files_to_scan):
            mtime = int(100 * file.stat().st_mtime)
            next_files = files_to_scan[i + 1: i + 2]
            file_mtimes.append((file, mtime, next_files[0] if next_files else None))
        
        if file_mtimes:
            file_mtimes.sort(key=lambda t: t[1], reverse=True)
            watch_list = [file_mtimes[0][0]]
            if file_mtimes[0][2] != None:
                watch_list.append(file_mtimes[0][2])
        
        todo = []
        for file, mtime, next_file in file_mtimes:
            if mtime == state.get(file):
                continue
            state[file] = mtime
            todo.append(file)
        if len(todo) > 0:
            for file in todo:
                with file.open('r', encoding='utf8') as f:
                    text = f.read()
                text = clean_text(text)
                if text is None:
                    continue
                outfile = temp_dir / (file.parent.stem + '_' + file.name)
                with outfile.open('w', encoding='utf8') as f:
                    f.write(text)                
            
            r = subprocess.check_output(['amagama-manage',
                                        'build_tmdb',
                                        '--verbose',
                                        '-s', 'pi',
                                        '-t', 'en',
                                        '-i', str(temp_dir)])
            print(r)
    
    time.sleep(SCAN_PERIOD)

except KeyboardInterrupt:
    exit(0)
finally:
    clear_temp_dir(rmdir=True)
    
