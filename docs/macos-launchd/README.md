# Dohnut on macOS with `launchd`

Run Dohnut as a background process using the macOS `launchd` service manager.

The `launchd` service manager will handle the network port to accept incoming DNS queries. This lets Dohnut run with restricted permissions of a regular user instead of the `root` account.

The network connection starts listening automatically at login. Dohnut will be started automatically by `launchd` as soon as a DNS query is received. Dohnut is restarted automatically on crashes.

## Install Node.js

Go to the Node.js website to download and install the **Latest** version of Node.js.

https://nodejs.org

Dohnut requires Node.js version 11.4.0 or later.

## Install Xcode

These Apple developer tools are required to install Dohnut on macOS. Installing Xcode can take a while.

Go to **🍎** > **App Store** > **Search**: Xcode > **Get** or **Install App**

## Install Dohnut

From the Terminal, run:

    $ npm install --global dohnut

Tip: With some system-wide versions of Node.js, as opposed to per-user version managers like [nvm](https://github.com/creationix/nvm) or [n](https://github.com/tj/n), you may see a permissions error. If that happens, try running the command:

    $ sudo npm install --global --allow-root dohnut

## Create a Service File

Create the `dohnut.plist` service file for `launchd`:

    $ nano ~/Library/LaunchAgents/host.commons.dohnut.plist

See the [command line interface](../cli) reference to customise the options.

Be sure to change `USERNAME` to your macOS username.

Copy, paste, edit, save, exit.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>host.commons.dohnut</string>
    <key>ProgramArguments</key>
    <array>
      <!--
        Absolute path to Node.js runtime
        $ which node
      -->
      <string>/usr/local/bin/node</string>
      <!--
        Absolute path to Dohnut
        $ npm install -g dohnut
        $ which dohnut
      -->
      <string>/Users/USERNAME/n/bin/dohnut</string>

      <!-- One or more DoH providers (shortname or URI) -->
      <string>--doh</string>
      <string>commonshost</string>
      <string>cleanbrowsing</string>
      <string>cloudflare</string>
      <string>quad9</string>

      <!-- Used to resolve the DoH provider -->
      <string>--bootstrap</string>
      <string>1.1.1.1</string>
      <string>8.8.8.8</string>
      <string>9.9.9.9</string>

      <!-- Sets the launchd socket to UDP over IPv4 -->
      <string>--datagram-protocol</string>
      <string>udp4</string>
    </array>
    <key>Sockets</key>
    <dict>
      <key>dohnut</key>
      <array>
        <dict>
          <key>SockFamily</key>
          <string>IPv4</string>
          <key>SockProtocol</key>
          <string>UDP</string>
          <key>SockServiceName</key>
          <string>53</string>
          <key>SockType</key>
          <string>dgram</string>
        </dict>
      </array>
    </dict>
    <!--
      Create a log directory for Dohnut:
      $ mkdir /usr/local/var/log/dohnut
    -->
    <key>StandardErrorPath</key>
    <string>/usr/local/var/log/dohnut/std_error.log</string>
    <key>StandardOutPath</key>
    <string>/usr/local/var/log/dohnut/std_out.log</string>
  </dict>
</plist>
```

## Activate the Dohnut service

First create the logging directory as configured in the `.plist` file above.

    $ mkdir /usr/local/var/log/dohnut

Then load the Dohnut service to begin listening for DNS queries.

    $ launchctl load ~/Library/LaunchAgents/host.commons.dohnut.plist

Verify that that the service has been loaded.

    $ launchctl list | grep dohnut

The first number shows the process ID or `0` if it is not yet running. The second number shows an exit code, which is `0` on success or non-zero on error.

Check the output and error logs to verify correct operation.

    $ tail -f /usr/local/var/log/dohnut/std_out.log
    $ tail -f /usr/local/var/log/dohnut/std_error.log

To make changes and apply, unload the service and re-load it.

    $ launchctl unload ~/Library/LaunchAgents/host.commons.dohnut.plist
    $ launchctl load ~/Library/LaunchAgents/host.commons.dohnut.plist

## Configure Network Preferences

Go to **🍎** > **System Preferences** > **Network** > **Advanced** > **DNS** and set `127.0.0.1` as your DNS server (remove any others).

## Done!

Your first DNS query should activate Dohnut.

You can trigger a manual query using `dig`.

```shell
$ dig @127.0.0.1 iana.org

; <<>> DiG 9.10.6 <<>> @127.0.0.1 iana.org
; (2 servers found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 24758
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;iana.org.			IN	A

;; ANSWER SECTION:
iana.org.		3591	IN	A	192.0.43.8

;; Query time: 4 msec
;; SERVER: 127.0.0.1#53(127.0.0.1)
;; MSG SIZE  rcvd: 53
```
