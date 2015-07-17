#!/usr/bin/env python

import os
import pickle
import time
import pathlib
import subprocess

# Sync Period in seconds
SYNC_PERIOD = 5


POOTLE_DIR = pathlib.Path(os.environ.get('POOTLE_DIR', '.'))
if 'PO_DIR' in os.environ:
    PO_DIR = os.environ['PO_DIR']
else:
    PO_DIR = POOTLE_DIR / 'env/lib/python2.7/site-packages/pootle/po/'
STATE_FILE = POOTLE_DIR / 'state.pickle'

try:
    i = 0
    while True:
        try:
            with STATE_FILE.open('rb') as f:
                state = pickle.load(f)
        except IOError:
            state = {}
        i += 1
        for folder in PO_DIR.glob('*'):
            if not folder.is_dir():
                continue
            if folder.name in {'tutorial', 'terminology', '.tmp'}:
                continue
            todo = []
            files = list(folder.glob('**/*.po'))
            for file in files:
                uid = file.stem
                mtime = file.stat().st_mtime
                if state.get(uid) == mtime:
                    continue
                todo.append((uid, file, mtime))
            
            if len(files) == len(todo):
                r = subprocess.check_output(['amagama-manage',
                                                'build_tmdb',
                                                '--verbose',
                                                '-s', 'pi',
                                                '-t', 'en',
                                                '-i', str(folder)])
                print(r)
                state.update({uid:mtime for uid, file, mtime in todo})
                
            else:
                for uid, file, mtime in todo:
                    r = subprocess.check_output(['amagama-manage', 
                                                    'build_tmdb',
                                                    '--verbose',
                                                    '-s', 'pi', 
                                                    '-t', 'en', 
                                                    '-i', str(file)])
                    print(r)
                    state[uid] = mtime
        
        with STATE_FILE.open('wb') as f:
            pickle.dump(state, f)
        time.sleep(SYNC_PERIOD)

except KeyboardInterrupt:
    exit(0)
