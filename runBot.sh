while true
do
	bun start dev | tee -a "pedchicken.$(date +'%Y-%m-%d').log"
	sleep 10
done
