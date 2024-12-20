#!/bin/bash
set -e

# Update package index
echo "Updating package index..."
sudo apt-get update -y

# Add repository for PHP 8.2
echo "Adding repository for PHP 8.2..."
sudo apt-get install -y software-properties-common


sudo add-apt-repository ppa:ondrej/php -y

# Update package index again to include the new repository
echo "Updating package index after adding PHP repository..."
sudo apt-get update -y

# Install PHP 8.2 and required extensions
echo "Installing PHP 8.2 and extensions...."
sudo apt-get install -y php8.2-cli php8.2-fpm php8.2-mbstring php8.2-xml php8.2-bcmath php8.2-curl php8.2-zip php8.2-common php8.2-opcache php8.2-readline php8.2-mysql

curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js and npm installation
node -v
npm -v

# install pm2.... 
sudo npm install -g pm2

# Confirm PHP installation
echo "PHP version installed:"
php -v


# Install Composer....
echo "Installing Composer..."
curl -sS https://getcomposer.org/installer -o composer-setup.php
HASH=$(curl -sS https://composer.github.io/installer.sig)
php -r "if (hash_file('SHA384', 'composer-setup.php') === '$HASH') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"

sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
rm composer-setup.php

# Verify Composer installation
echo "Composer version installed:"
composer --version

echo "Installation complete."

##################################################################3
# set -e

# # Update package index and install required dependencies
# sudo apt-get update -y
# sudo apt-get install -y php8.2-cli php8.2-fpm php8.2-mbstring php8.2-xml php8.2-bcmath php8.2-curl php8.2-zip
# pip install boto3 

# # Install Composer
# curl -sS https://getcomposer.org/installer -o composer-setup.php
# HASH=$(curl -sS https://composer.github.io/installer.sig)
# php -r "if (hash_file('SHA384', 'composer-setup.php') === '$HASH') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"
# sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
# composer --version
