# Dohnut for macOS

Run Dohnut using the macOS launchd service manager.

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
        Node.js binary path. Must be an absolute file path.
        Find the Node.js path by running this command in Terminal:
        $ which node
        $ which dohnut // Does this work?
      -->
      <!-- <string>/Users/sebdeckers/n/bin/node</string> -->
      <!-- /Users/sebdeckers/n/bin/dohnut // Does this work? -->

      <!--
        Dohnut entry point path.
      -->
      <!-- <string>/Users/sebdeckers/code/commonshost/dohnut/src/bin.js</string> -->

      <string>--load-balance</string>
      <string>performance</string>

      <string>--doh</string>
      <string>https://example.com</string>
      <string>commonshost</string>
      <!--
      <string>cleanbrowsing</string>
      <string>cloudflare</string>
      <string>quad9</string>
      -->
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
    <key>StandardErrorPath</key>
    <string>/tmp/host.commons.dohnut.err</string>
    <key>StandardOutPath</key>
    <string>/tmp/host.commons.dohnut.out</string>
  </dict>
</plist>
```
