#!/usr/bin/env bash

printf "load .env into environment...\n"
if [ -f .env ]; then
  set -o allexport
  source .env
  set +o allexport
fi


printf "Setting up microk8s permission...\n"
sudo usermod -a -G microk8s vagrant

printf "Setting up microk8s and helm...\n"
printf "Enable dns..\n"
microk8s.enable dashboard
printf "Enable dash..\n"
microk8s.enable dns
printf "Enable helm..\n"
microk8s.enable helm
printf "Init helm..\n"
microk8s.helm init


printf "Build our docker images...\n"
# --force-rm --no-cache
docker-compose build texas-service
#docker-compose build texas-query texas-logging texas-hmi texas-replay texas-replay-hmi texas-service-bin texas-couch-setup
#docker-compose push texas-query texas-logging texas-hmi texas-replay texas-replay-hmi texas-service-bin texas-couch-setup

docker-compose build texas-query texas-logging texas-hmi texas-service-bin texas-couch-setup texas-replicator
docker-compose push texas-query texas-logging texas-hmi texas-service-bin texas-couch-setup texas-replicator

cd kubernetes/texas-chart
microk8s.helm dependency update
microk8s.helm install ./helm-charts-stable/traefik-helm-chart/ --namespace texas --name texas-traefik  -f ./values/vagrant-values.yaml --debug
microk8s.helm install . --namespace texas -f ./values/vagrant-values.yaml --debug
