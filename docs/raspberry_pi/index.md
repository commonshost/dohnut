# Setting up Dohnut on a Raspberry Pi

## Operating System

Download the latest Raspbian Lite image from the Raspberry Pi website.

Install Etcher and use it to flash the Raspbian Lite image to an SD memory card.

Re-insert the SD card into your computer. Create an empty file called `ssh` at the top level of the SD card. This enables network access via SSH, a command line interface, for "headless" installation. Skip this if you prefer attaching a keyboard and monitor for graphical desktop access.

## Hardware

Insert the flashed SD memory card into the Raspberry Pi.

Connect to your network router by plugging an ethernet cable into the network port of your Raspberry Pi. Or use wi-fi if your Raspberry Pi supports it.

Connect power cable to USB port to boot the Raspberry Pi. Wait a minute for it to fully boot.

## Connecting

Log in to your network router to see the IP address of your Raspberry Pi.

Open a terminal (MacOS/Linux) or PuTTY (Windows) and connect to the IP address of your Raspberry Pi with the `pi` username.

    $ ssh pi@192.168.1.225

The first connection attempt will ask to accept the key fingerprint. Enter `yes` and press Return.

    The authenticity of host '192.168.1.225 (192.168.1.225)' can't be established.
    ECDSA key fingerprint is SHA256:c8P+ILFKcXeyUtp5EFmzc7taNkVpu/w7ksktz1GH5gQ.
    Are you sure you want to continue connecting (yes/no)? yes
    Warning: Permanently added '192.168.1.225' (ECDSA) to the list of known hosts.

When prompted to log in, enter the default password: `raspberry`

    pi@192.168.1.225's password: 

You are now logged in.

    Linux raspberrypi 4.14.79+ #1159 Sun Nov 4 17:28:08 GMT 2018 armv6l

    The programs included with the Debian GNU/Linux system are free software;
    the exact distribution terms for each program are described in the
    individual files in /usr/share/doc/*/copyright.

    Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
    permitted by applicable law.

    SSH is enabled and the default password for the 'pi' user has not been changed.
    This is a security risk - please login as the 'pi' user and type 'passwd' to set a new password.

    pi@raspberrypi:~ $

## Basic Raspbian configuration

Immediately secure the SSH account by changing its password. Run the `passwd` command. Confirm the current password and enter a new password. Repeat the new password to confirm.

    pi@raspberrypi:~ $ passwd
    Changing password for pi.
    (current) UNIX password: 
    Enter new UNIX password: 
    Retype new UNIX password: 
    passwd: password updated successfully

## Installing Node.js

Dohnut requires a more recent version of Node.js than offered by the official Raspbian package repository. To avoid potential compatibility issues with other software, we can install the latest version of Node.js just for Dohnut. Using a version manager for Node.js, like `n`, offers easy installation and future upgrades.

    pi@raspberrypi:~ $ sudo useradd --system --create-home --shell /bin/false dohnut

Ensure these system dependencies are installed to allow building native NPM packages from source if necessary.

    pi@raspberrypi:~ $ sudo apt-get update
    pi@raspberrypi:~ $ sudo apt-get install git curl libsystemd-dev build-essential libssl-dev -y -qq

Install `n` and the latest version of Node.js.

    pi@raspberrypi:~ $ sudo -u dohnut curl -L https://git.io/n-install | bash -s -- -y latest

<!--
Reload the updated shell configuration to enable Node.js.

    pi@raspberrypi:~ $ . /home/pi/.bashrc

Give Node.js access to privileged network ports while running under the 

    pi@raspberrypi:~ $ sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``
    pi@raspberrypi:~ $ npx dohnut
-->

## Setting up systemd

The systemd service manager provides access to the privileged DNS port (`53`) while securely running Dohnut with restricted permissions.

Copy and paste these systemd files. Use an editor like `nano`.

    pi@raspberrypi:~ $ sudo nano /etc/systemd/system/dohnut.service

Create `dohnut.service`:

    pi@raspberrypi:~ $ sudo nano /etc/systemd/system/dohnut.service

Copy, paste, save, exit:

    [Unit]
    Description=Dohnut DNS over HTTPS proxy
    RefuseManualStart=true

    [Service]
    Type=notify
    User=dohnut
    Environment="NODE_ENV=production"
    Environment="PATH=/home/dohnut/n/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
    ExecStart=/home/dohnut/n/bin/npx dohnut --doh commonshost
    Restart=always
    KillMode=process
    WatchdogSec=10
    SyslogIdentifier=dohnut
    TimeoutStartSec=infinity

Create `dohnut.socket`:

    pi@raspberrypi:~ $ sudo nano /etc/systemd/system/dohnut.socket

Copy, paste, save, exit:

    [Socket]
    ListenDatagram=53000
    ReusePort=true

    [Install]
    WantedBy=sockets.target

Enable the service.

    sudo systemctl --now enable dohnut

## Extras

sudo systemctl status dohnut

    pi@raspberrypi:~ $ sudo -u dohnut N_PREFIX=/home/dohnut/n /home/dohnut/n/bin/n latest
    pi@raspberrypi:~ $ sudo -u dohnut /home/dohnut/n/bin/node -v
