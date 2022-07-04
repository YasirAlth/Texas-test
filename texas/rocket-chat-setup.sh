#!/usr/bin/env bash

curl -H "Content-type:application/json" http://localhost:13000/api/v1/login -d '{ "username": "texas", "password": "texas" }' > result.json

authToken=$(grep -Po '"authToken":.*?[^\\]",' result.json)
authToken=${authToken::-2}
authToken=${authToken:13}

userId=$(grep -Po '"userId":.*?[^\\]",' result.json)
userId=${userId::-2}
userId=${userId:10}

# Enable settings.
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json"  http://localhost:13000/api/v1/settings/Iframe_Integration_send_enable  -d '{ "value": true }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json"  http://localhost:13000/api/v1/settings/Show_Setup_Wizard  -d '{ "value": "completed" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json"  http://localhost:13000/api/v1/settings/API_Enable_CORS  -d '{ "value": true }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json"  http://localhost:13000/api/v1/settings/Accounts_iframe_enabled  -d '{ "value": true }'

# Add users.
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "SLS-SURFCOM", "email": "user_SLS-SURFCOM@user.com", "password": "SLS-SURFCOM", "username": "SLS-SURFCOM" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "SLS-LS3", "email": "user_SLS-LS3@user.com", "password": "SLS-LS3", "username": "SLS-LS3" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "SLS-LS2", "email": "user_SLS-LS2@user.com", "password": "SLS-LS2", "username": "SLS-LS2" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "SLS-RWC1", "email": "user_SLS-RWC1@user.com", "password": "SLS-RWC1", "username": "SLS-RWC1" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "SLS-RWC2", "email": "user_SLS-RWC2@user.com", "password": "SLS-RWC2", "username": "SLS-RWC2" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "SLS-IRB_PN1", "email": "user_SLS-IRB_PN1@user.com", "password": "SLS-IRB_PN1", "username": "SLS-IRB_PN1" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "SLS-IRB_PN2", "email": "user_SLS-IRB_PN2@user.com", "password": "SLS-IRB_PN2", "username": "SLS-IRB_PN2" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "SLS-IRB_PN3", "email": "user_SLS-IRB_PN3@user.com", "password": "SLS-IRB_PN3", "username": "SLS-IRB_PN3" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "EXP-BID1", "email": "user_EXP-BID1@user.com", "password": "EXP-BID1", "username": "EXP-BID1" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "SLS-PAT_PN1", "email": "user_SLS-PAT_PN1@user.com", "password": "SLS-PAT_PN1", "username": "SLS-PAT_PN1" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "SLS-DUTY10", "email": "user_SLS-DUTY10@user.com", "password": "SLS-DUTY10", "username": "SLS-DUTY10" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "EXP-RUTH", "email": "user_EXP-RUTH@user.com", "password": "EXP-RUTH", "username": "EXP-RUTH" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "OBS-UAV", "email": "user_OBS-UAV@user.com", "password": "OBS-UAV", "username": "OBS-UAV" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "EXP-RWC3", "email": "user_EXP-RWC3@user.com", "password": "EXP-RWC3", "username": "EXP-RWC3" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "EXP-DST2", "email": "user_EXP-DST2@user.com", "password": "EXP-DST2", "username": "EXP-DST2" }'
curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "EXP-SwimPad", "email": "user_EXP-SwimPad@user.com", "password": "EXP-SwimPad", "username": "EXP-SwimPad" }'

#curl -H "X-Auth-Token: $authToken" -H "X-User-Id: $userId" -H "Content-type:application/json" http://localhost:13000/api/v1/users.create   -d '{"name": "TODO", "email": "user_TODO@user.com", "password": "TODO", "username": "TODO" }'
