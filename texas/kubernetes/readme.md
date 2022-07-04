Create texas namespace, just makes it easier to filter thing out
`kubectl apply -f ns.yaml`

Install RocketChat into texas namespace
This includes mongo, and needs the credentials specified as values, not a secret.
`helm --namespace texas install --name texas -f rocketchat-values.yml -f mongo-values.yaml stable/rocketchat`

Install RabbitMQ (HA) into texas namespace
TODO: Certificates and credentials as secret(s)
`helm --namespace texas install --name texas -f rabbitmq-ha-values.yml -f rabbitmq-ha-secrets.yaml stable/rabbitmq-ha`

Install CouchDB into texas namespace
Except this isn't working as of kubernetes v1.16, so instead of
`helm --namespace texas install --name texas --set persistentVolume.enabled=true stable/couchdb`
do
`helm fetch -d helm-charts-stable --untar stable/couchdb`
and make templates/statefulset.yaml:line 1 'apiVersion: apps/v1', then
`helm --namespace texas install --name texas --set persistentVolume.enabled=true ./helm-charts-stable/couchdb`


bitnami kubernetes image
dashboard doens't want to work apparently
https://docs.bitnami.com/kubernetes/how-to/secure-kubernetes-services-with-ingress-tls-letsencrypt/

helm install --name texas-ingress stable/nginx-ingress
probably the external IP will never come unless it's integrated into the EKS or AKS or whatever, but you should know if it's an EC2 instance anyway, just use that
kubectl get svc ingress-nginx-ingress-controller -o jsonpath="{.status.loadBalancer.ingress[0].ip}"

https://docs.cert-manager.io/en/latest/getting-started/install/kubernetes.html
kubectl apply --validate=false -f https://raw.githubusercontent.com/jetstack/cert-manager/release-0.11/deploy/manifests/00-crds.yaml
kubectl create namespace cert-manager
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install --name cert-manager --namespace cert-manager --version v0.11.0 jetstack/cert-manager

https://docs.cert-manager.io/en/latest/tasks/issuers/setup-acme/index.html
Add staging and prod issuers (ClusterIssuer means not bound to a specific kubernetes namespace)
cat <<EOF > letsencrypt-issuers.yaml
apiVersion: cert-manager.io/v1alpha2
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # You must replace this email address with your own.
    # Let's Encrypt will use this to contact you about expiring
    # certificates, and issues related to your account.
    email: texas@consilium.technology
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      # Secret resource used to store the account's private key.
      name: letsencrypt-staging
    # Add a single challenge solver, HTTP01 using nginx
    solvers:
    - http01:
        ingress:
          class: nginx
---
apiVersion: cert-manager.io/v1alpha2
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    # You must replace this email address with your own.
    # Let's Encrypt will use this to contact you about expiring
    # certificates, and issues related to your account.
    email: texas@consilium.technology
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      # Secret resource used to store the account's private key.
      name: letsencrypt-prod
    # Add a single challenge solver, HTTP01 using nginx
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

