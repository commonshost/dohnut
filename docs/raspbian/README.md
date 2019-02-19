# Dohnut with Raspbian

This guide explains how to set up [Raspbian Linux](http://www.raspbian.org) on a [Raspberry Pi](https://www.raspberrypi.org) computer. You can then run [Dohnut with systemd](../systemd). Raspbian is also a great platform to run [Dohnut with Pi-hole](../pihole).

## Requirements

- Raspberry Pi
- SD card (2+ GB)
- LAN cable or keyboard & monitor

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

## Network

The Raspberry Pi should have a static IP address. This can be achieved in several ways. Many routers offer a feature called DHCP address reservation which associates a hardware MAC address to an IP address. If available, use this technique to always assign the same IP address to your Raspberry Pi.

Find the hostname or IP address of the router your Raspberry Pi is connected to. If your machine is on the same network, check your own settings.

    $ route get default | grep gateway

Open the address in a web browser to access the administration dashboard of your router.

Follow the router manual to assign a DHCP reservation to the Raspberry Pi.

In this tutorial I have a assigned the IP address `192.168.1.225` to my Raspberry Pi via DHCP reservation on my router.

## Connecting

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

A password offers basic security and somewhat inconvenient as it must be remembered. A more secure option is to use an SSH key. That goes beyond the scope of this guide.

## Installing Dohnut

The recommended way to run Dohnut on Raspbian is using the systemd service manager.

See the [Dohnut with systemd](../systemd) guide for instructions.
