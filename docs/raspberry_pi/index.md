# Dohnut + Pi-hole

## Operating System

Download the latest **Raspbian Lite** image from the Raspberry Pi website.

https://www.raspberrypi.org/downloads/raspbian/

Install **balenaEtcher** and use it to flash the Raspbian Lite image to an SD memory card.

https://www.balena.io/etcher/

Re-insert the SD card into your computer. Create an empty file or directory called `ssh` at the top level of the SD card. This enables network access via SSH, a command line interface, for "headless" installation. Skip this step if you prefer attaching a keyboard and monitor for graphical desktop access.

## Hardware

Insert the flashed SD memory card into the Raspberry Pi.

Connect to your network router by plugging an ethernet cable into the network port of your Raspberry Pi. Or use wi-fi if your Raspberry Pi supports it.

Connect power cable to USB port to boot the Raspberry Pi. Wait a minute or two for it to fully boot.

## Connecting

Log in to your network router to find the IP address of your Raspberry Pi. Or use a port scanner to look for the device on the network.

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

## Raspbian SSH Security

Immediately secure the SSH account by changing its password.

    $ passwd

When asked, enter the current password (default: `raspberry`). Next, enter a new password. Repeat the new password to confirm. Write the new password down somewhere or store it in a password manager.

## Creating a Dohnut User

Services should run under their own restricted user account. This prevents them from affecting unrelated files and processes in the case of a bug or compromise.

    $ sudo useradd --system --create-home --shell /bin/false dohnut

## Installing Node.js

Dohnut requires a more recent version of [Node.js](https://nodejs.org) than offered by the official Raspbian package repository. To avoid potential compatibility issues with other software, we can install the latest version of Node.js just for Dohnut. Using a version manager for Node.js, like `n`, offers easy installation and future upgrades.

Ensure these system dependencies are installed to allow building native NPM packages from source if necessary.

    $ sudo apt-get update
    $ sudo apt-get install git curl libsystemd-dev build-essential libssl-dev -y -qq

Install `n` and the latest version of Node.js.

    $ sudo -u dohnut curl -L https://git.io/n-install | bash -s -- -y latest

## Installing Dohnut

Download the latest version of Dohnut from [NPM](https://www.npmjs.com/package/dohnut) and install it inside the restricted `dohnut` user's home directory. Nothing else on the system is affected.

    $ sudo -u dohnut -- env PATH="/home/dohnut/n/bin:$PATH" npm install --global dohnut@latest

## Dohnut Configuration

Create `options.json`:

    $ sudo mkdir -p /etc/dohnut
    $ sudo chown -R dohnut:dohnut /etc/dohnut
    $ sudo -u dohnut touch /etc/dohnut/options.json
    $ sudo -u dohnut nano /etc/dohnut/options.json

Copy, paste, save, exit:

```json
{
  "doh": ["commonshost"],
  "bootstrap": ["1.1.1.1", "8.8.8.8", "9.9.9.9"],
  "countermeasures": ["spoof-queries", "spoof-useragent"]
}
```

## Setting up systemd

The [systemd](https://freedesktop.org/wiki/Software/systemd/) service manager provides access to the privileged DNS port (`53`) while securely running Dohnut with restricted permissions.

Create `dohnut.service`:

    $ sudo nano /etc/systemd/system/dohnut.service

Copy, paste, save, exit:

```ini
[Unit]
Description=Dohnut DNS over HTTPS proxy
RefuseManualStart=true

[Service]
Type=notify
User=dohnut
Environment="NODE_ENV=production"
Environment="PATH=/home/dohnut/n/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/home/dohnut/n/bin/npx dohnut --config /etc/dohnut/options.json
Restart=always
KillMode=process
WatchdogSec=10
SyslogIdentifier=dohnut
TimeoutStartSec=infinity
WorkingDirectory=~
CacheDirectory=dohnut
```

Create `dohnut.socket`:

    $ sudo nano /etc/systemd/system/dohnut.socket

Copy, paste, save, exit:

```ini
[Socket]
ListenDatagram=53000
ReusePort=true

[Install]
WantedBy=sockets.target
```

Enable Dohnut to start listening immediately and also on boot.

    $ sudo systemctl --now enable dohnut.socket

## Status Check

Check whether systemd is listening.

    $ systemctl status dohnut.socket

Try a DNS lookup. This causes systemd to start Dohnut. It may take a few seconds for the first reply.

    $ dig @127.0.0.1 -p 53000 example.com

Verify that Dohnut is running.

    $ systemctl status dohnut.service

Check the system logs if anything went wrong.

    $ journalctl -xe

Follow the Dohnut logs to keep an eye on things.

    $ journalctl -f -n 100 -u dohnut

## Configure the Pi-hole

Visit the Pi-hole dashboard in your browser. Log in as administrator.

https://pi.hole/admin (or its IP address)

Go to **Settings** > **DNS** > **Upstream DNS Servers** and enter the Dohnut IP address and port using the hash (`#`) syntax. Enable the checkbox.

    127.0.0.1#53000

Disable any other Upstream DNS servers to ensure all DNS queries make use of Dohnut.

## Done!

All your DNS queries now encrypted and load balanced for enhanced performance and privacy.

But wait, there's more...

## Updates

Regularly update Node.js and Dohnut to the latest version for better performance, features, and security.

```
$ sudo -u dohnut -- env N_PREFIX="/home/dohnut/n" /home/dohnut/n/bin/n latest
$ sudo -u dohnut -- env PATH="/home/dohnut/n/bin:$PATH" npm install --global dohnut@latest
```

## Uninstall

Removing Dohnut is clean and easy.

    $ sudo systemctl --now disable dohnut.socket
    $ sudo systemctl stop dohnut
    $ sudo rm -rf /etc/systemd/system/dohnut.* /etc/dohnut
    $ sudo systemctl daemon-reload
    $ sudo deluser --remove-home dohnut
