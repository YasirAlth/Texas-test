#!/usr/bin/env bash

printf "configuring environment...\n"
envsub /opt/texas.hmi/www/assets/mission-data-defaults/track-config.json
envsub /opt/texas.hmi/www/assets/TEXAS_TAFServer.conf

printf "running web server...\n"
angular-http-server --path /opt/texas.hmi/www -p 80
