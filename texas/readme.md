# TEXAS Deploy
The purpose of this project is to create a TEXAS runtime server using Docker and Kubernetes. 

If hosting the services on a non-default domain (texas.ct-a.ws) all hostname parameters will need updating to the correct host.
The kubernetes/texas-chart/values/vagrant-values.yaml shows an example of how this is done for the Vagrant deployment.

This deployment has been tested on Microk8s under Ubuntu 18.04 (Vagrant - see below)
 and Amazon EKS, Kubernetes/Kubectl v1.14

### Vagrant Usage (Recommended)
To deploy the services using a Vagrant VM:
1. Ensure the texas.deploy repso is cloned on your machine with all submodules. 
2. Ensure Vagrant is installed (v2.2.4)
3. Install the Vagrant disk size plugin:
   `vagrant plugin install vagrant-disksize`
4. From the texas.deploy directory create the VM `vagrant up`
5. Once this is done, you should be able to hit https://192.168.33.11:31443 and see Texas running.
6. You should also be able to see the Traefik proxy running at http://192.168.33.11:31000/ which will show all the available endpoints.
