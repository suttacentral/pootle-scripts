#!/bin/bash

POOTLE_DIR=/home/$USER/pootle
AMAGAMA_DIR=$POOTLE_DIR/amagama

cd $POOTLE_DIR
# Activate Python virtualenv
source ./env/bin/activate

# Export paths needed for amagama executables
export PATH=$AMAGAMA_DIR/bin:$PATH
export PYTHONPATH=$AMAGAMA_DIR:$PYTHONPATH

# Terminate all background tasks on exit
trap 'kill $(jobs -p)' EXIT

# Start amagama server
amagama &

# Start pootle server
pootle start &

# Start script which updates TM
nice ./remember.py

