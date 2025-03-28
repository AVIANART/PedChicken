#!/usr/bin/bash

cd /home/pedchicken/LadderChicken/

while true
do
	npx bun run start dev | tee -a "ladderchicken.$(date +'%Y-%m-%d').log"
	sleep 10
done
