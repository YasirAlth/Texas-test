#!/usr/bin/env bash

repos = (texas-query texas-logging texas-hmi texas-replay texas-replay-hmi texas-service-bin texas-couch-setup)

 for i in "${repos[@]}"; do echo "$i"; done

printf "tag the local repos...\n"


printf "Create the ECR  repos...\n"



sudo docker tag localhost:32000/texas-couch-setup 244843866845.dkr.ecr.ap-southeast-2.amazonaws.com/texas-couch-setup
sudo docker push 244843866845.dkr.ecr.ap-southeast-2.amazonaws.com/texas-couch-setup

sudo docker tag localhost:32000/texas-hmi 244843866845.dkr.ecr.ap-southeast-2.amazonaws.com/texas-hmi
sudo docker push 244843866845.dkr.ecr.ap-southeast-2.amazonaws.com/texas-hmi

sudo docker tag localhost:32000/texas-logging 244843866845.dkr.ecr.ap-southeast-2.amazonaws.com/texas-logging
sudo docker push 244843866845.dkr.ecr.ap-southeast-2.amazonaws.com/texas-logging

sudo docker tag localhost:32000/texas-query 244843866845.dkr.ecr.ap-southeast-2.amazonaws.com/texas-query
sudo docker push 244843866845.dkr.ecr.ap-southeast-2.amazonaws.com/texas-query


244843866845.dkr.ecr.ap-southeast-2.amazonaws.com/texas-replicator
244843866845.dkr.ecr.ap-southeast-2.amazonaws.com/texas-service-bin

helm dependency update
helm install ./helm-charts-stable/traefik-helm-chart/ --namespace texas --name texas-traefik  -f ./values/traefik-eks-values.yaml --debug
helm install . --namespace texas -f ./values/eks-values.yaml --debug
