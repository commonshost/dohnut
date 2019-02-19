# Dohnut and systemd

This guide uses some commands specific to Debian-based Linux distros. This should work with popular platforms like Raspbian and Ubuntu.

See the [Raspbian guide](../raspbian) to get started from scratch with Dohnut on a Raspberry Pi.

See the [Pi-hole guide](../pihole) to combine Dohnut privacy and performance with [Pi-hole](https://pi-hole.net) DNS-based ad blocking and monitoring.

## Creating a Dohnut User

Services should run under their own restricted user account. This prevents them from affecting unrelated files and processes in the case of a bug or compromise.

    $ sudo useradd --system --create-home --shell /bin/false dohnut

## Installing Node.js

Dohnut requires a more recent version of [Node.js](https://nodejs.org) than offered by the official Raspbian package repository. To avoid potential compatibility issues with other software, we can install the latest version of Node.js just for Dohnut. Using a version manager for Node.js, like `n`, offers easy installation and future upgrades.

Ensure these system dependencies are installed to allow building native NPM packages from source if necessary.

    $ sudo apt-get update
    $ sudo apt-get -y -qq install git curl libsystemd-dev build-essential libssl-dev net-tools

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
  "countermeasures": ["spoof-queries", "spoof-useragent"],
  "datagram-protocol": "udp4"
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
ListenDatagram=127.0.0.1:53000
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

## Done!

But wait, there's more...

## Updates

Regularly update Node.js and Dohnut to the latest version for better performance, features, and security.

    $ sudo -u dohnut -- env N_PREFIX="/home/dohnut/n" /home/dohnut/n/bin/n latest
    $ sudo -u dohnut -- env PATH="/home/dohnut/n/bin:$PATH" npm install --global dohnut@latest

## Uninstall

Removing Dohnut is clean and easy.

    $ sudo systemctl --now disable dohnut.socket
    $ sudo systemctl stop dohnut
    $ sudo rm -rf /etc/systemd/system/dohnut.* /etc/dohnut
    $ sudo systemctl daemon-reload
    $ sudo deluser --remove-home dohnut
