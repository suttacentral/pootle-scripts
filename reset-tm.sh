#!/bin/bash

POOTLE_DIR=/home/$USER/pootle
AMAGAMA_DIR=$POOTLE_DIR/amagama
PO_DIR=$POOTLE_DIR/env/lib/python2.7/site-packages/pootle/po/suttas/en

echo $POOTLE_DIR

cd $POOTLE_DIR
# Activate Python virtualenv
source ./env/bin/activate

# Export paths needed for amagama executables
export PATH=$AMAGAMA_DIR/bin:$PATH
export PYTHONPATH=$AMAGAMA_DIR:$PYTHONPATH

echo "Removing old database"
echo 'y' | amagama-manage dropdb -s pi
echo "Initializing fresh database"
amagama-manage initdb -s pi
rm state.pickle
