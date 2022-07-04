# TEXAS Query service

## Run this to test

```
npm run build
node lib/
```

## Run this on server

Note: you'll need to run it in the same folder as the private key.
The repo may already be on the server, use git pull to get the latest changes from develop.

```
ssh -i "texas-rabbitmq.pem" ec2-user@ec2-13-210-230-219.ap-southeast-2.compute.amazonaws.com
git clone --depth 1 ben.mcaleer@labs.consilium.technology/bitbucket/scm/texas/texas.query.git
cd texas.query
sudo docker build -t texas.query .
sudo docker run -dp 3131:3131 --name texas.query texas.query
```
