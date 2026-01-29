rsync -avz \
  --exclude='node_modules/' \
  --exclude='.git/' \
  --exclude='.next/' \
  CRM-IA ubuntu@51.222.106.205:/home/ubuntu/projects/botia/
