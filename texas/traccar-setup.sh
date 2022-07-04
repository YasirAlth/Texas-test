#!/usr/bin/env bash

curl  --user admin:admin -i -H "Accept: application/json" -H "Content-Type: application/json" -X PUT  http://localhost:18082/api/users/1/ -d '{"id":1,"attributes":{},"name":"texas","login":null,"email":"texas","phone":null,"readonly":false,"administrator":true,"map":null,"latitude":0.0,"longitude":0.0,"zoom":0,"twelveHourFormat":false,"coordinateFormat":null,"disabled":false,"expirationTime":null,"deviceLimit":-1,"userLimit":0,"deviceReadonly":false,"token":null,"limitCommands":false,"poiLayer":null,"password":"texas"}'

# Add in devices

# GPS Units
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "RT1","uniqueId": "864768011119838","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_LS2","uniqueId": "864768011119853","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_LS3","uniqueId": "864768011088546","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_IRB1","uniqueId": "864768011088579","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_IRB2","uniqueId": "864768011119952","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_IRB3","uniqueId": "864768011171664","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_IRB4","uniqueId": "864768011474910","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_RWC1","uniqueId": "864768011475271","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_RWC2","uniqueId": "864768011475180","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_RWC3","uniqueId": "864768011475131","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_RWC4","uniqueId": "864768011475214","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_RWC5","uniqueId": "864768011475222","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "ES_Gallantry","uniqueId": "15136000624259","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "ES_SeaRescue","uniqueId": "868020030575376","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "ES_CoastGuard","uniqueId": "868020030492069","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_ATV1","uniqueId": "868020030491269","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "HEIM_LifeRaft1","uniqueId": "868020030579980","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "HEIM_LifeRaft2","uniqueId": "868020030575459","disabled": false}'


# Phones
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "SLS_WP1","uniqueId": "SLS_WP1","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "PT1","uniqueId": "PT1","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "PT2","uniqueId": "PT2","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "PT3","uniqueId": "PT3","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "PT4","uniqueId": "PT4","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "PT5","uniqueId": "PT5","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "PT6","uniqueId": "PT6","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "PT7","uniqueId": "PT7","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "PT8","uniqueId": "PT8","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "PT9","uniqueId": "PT9","disabled": false}'
curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "PT10","uniqueId": "PT10","disabled": false}'


# COMMAND TO ADD NEW TRACKERS.
# curl  --user texas:texas -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST http://localhost:18082/api/devices -d '{"id": 0, "name": "TODO","uniqueId": "TODO","disabled": false}'
