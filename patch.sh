#!/bin/bash

source ./env/bin/activate

echo "Copying files"
cp -rv patches/pootle/* env/lib/python2.7/site-packages/pootle/

echo "Clearing Django Cache in Really Hacky Way"
echo "from django.core.cache import cache; cache.clear();" | pootle shell
echo "But it worked"

pootle assets clean
echo "yes" | pootle collectstatic
pootle assets build


echo "Killing pootle/amagama if running"
killall start.sh

echo "restart pootle/amagama by running start.sh"
