#!/usr/bin/env bash

# Adapted from
# https://medium.com/@pentacent/nginx-and-lets-encrypt-with-docker-in-less-than-5-minutes-b4b8a60d3a71


# if TEXAS_SERVER isn't defined assign it to default
echo Domain: ${TEXAS_SERVER:=texas.ct-a.ws}
# substitute env vars in config
envsubst < nginx/sections/ssl_proxy.section > tmp && mv tmp nginx/sections/ssl_proxy.section

rsa_key_size=4096
data_path="./nginx/certbot"
email="texas@consilium.technology"
staging=0 # Set to 1 if you're testing your setup to avoid hitting request limits

# Let's just comment this out for now so we can have a think about it..
#if [ -d "$data_path" ]; then
#  read -p "Existing data found for $TEXAS_SERVER. Continue and replace existing certificate? (y/N) " decision
#  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
#    exit
#  fi
#fi

#if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ]; then
  echo "### Downloading recommended TLS parameters ..."
  mkdir -p "$data_path/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  # This is fine, it can be public: https://security.stackexchange.com/a/94397
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
  echo
fi

echo "### Creating dummy certificate for $TEXAS_SERVER ..."
path="/etc/letsencrypt/live/$TEXAS_SERVER"
mkdir -p "$data_path/conf/live/$TEXAS_SERVER"
docker-compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:1024 -days 1 \
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot
echo

echo "### Starting nginx ..."
docker-compose up --force-recreate -d nginx
echo

echo "### NOT Deleting dummy certificate for $TEXAS_SERVER ..."
#docker-compose run --rm --entrypoint "\
#  rm -Rf /etc/letsencrypt/live/$TEXAS_SERVER && \
#  rm -Rf /etc/letsencrypt/archive/$TEXAS_SERVER && \
#  rm -Rf /etc/letsencrypt/renewal/$TEXAS_SERVER.conf" certbot
#echo

echo "### Requesting Let's Encrypt certificate for $TEXAS_SERVER ..."
# Select appropriate email arg
case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $email" ;;
esac

# Enable staging mode if needed
if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker-compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    -d $TEXAS_SERVER \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot
echo

echo "### Reloading nginx ..."
docker-compose exec -T nginx nginx -s reload
