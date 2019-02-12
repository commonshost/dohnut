# Dohnut 🍩

DNS to DNS over HTTPS (DoH) proxy server for better performance and active countermeasures to fight for your privacy.

## Features

**High Performance** Auto-select the fastest DoH resolver. Continuously adapts to network and service conditions by monitoring the round-trip-tip of the DoH connection using HTTP/2 PING frames.

**High Availability** Allows using multiple DoH resolvers at once to provide automatic failover in case a service is unavailable.

**Zero Overhead** - Network traffic does not go through Dohnut so there is no performance penalty. Only the DNS queries (very little bandwidth) are proxied.

**Lightweight** - Multi-threaded architecture for fast performance on low-power devices like single board computers. Designed for Raspberry Pi and Odroid but compatible with anything that can run Node.js.

**Full Encryption** - DoH encrypts all DNS queries inside a secure HTTP/2 connection. This protects DNS lookups against snooping at your local network router or ISP.

**Connection Sharding** - Spread queries across multiple DoH resolvers for improved privacy. This reduces the amount of information a single DoH service can collect.

**Query Spoofing** - Mask your DNS queries using fake DNS queries. Uses several randomisation techniques and samples from a public list of the top 1 million domains.

**User Agent Spoofing** - Avoid tracking at the HTTP level using fake browser identifiers. Randomly chosen from a public list of real-world browser data.

## Usage

*Note: Support for running as secure services under systemd (Linux) and launchd (Mac OS) is coming soon. It technically already works but needs more documentation. Guides on integrating with Pi-hole coming soon. Also expect an easy to use desktop app.*

Launch Dohnut on your local machine to accept DNS connections and proxy them to the Commons Host DNS over HTTPS (DoH) service.

```shell
$ sudo npx dohnut --listen 127.0.0.1:53 --doh https://commons.host

Started listening on 127.0.0.1:53 (udp4)
```

Verify by running a DNS lookup against Dohnut. The lookup is proxied to the DoH service.

```shell
$ dig @localhost iana.org

; <<>> DiG 9.10.6 <<>> @localhost iana.org
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
;; SERVER: 127.0.0.1#8053(127.0.0.1)
;; MSG SIZE  rcvd: 53
```

## Help

### `--doh`, `--upstream`, `--proxy`

Array of URLs or shortnames of upstream DNS over HTTPS resolvers.

Queries are distributed randomly over all resolvers.

Default: `[ "https://commons.host" ]`

### `--listen`, `--local`, `-l`

Array of IPs and ports for the local DNS server.

Default: `[ "127.0.0.1:53", "[::1]:53" ]`

### `--test`, `--validate`, `--configtest`

Validate the arguments without starting the server. Process exit code `1` indicates failure, or `0` for success.

Default: `false`

### `--version`

Show version number

### `--help`

Show help

### Shortnames

Public resolver names mapped to a DoH URL. Based on the [@commonshost/resolvers](https://gitlab.com/commonshost/resolvers) list.

- `cleanbrowsing`
- `cloudflare`
- `commonshost`
- `google`
- `keoweon`
- `mozilla`
- `nekomimi`
- `powerdns`
- `quad9`
- `rubyfish`
- `securedns`

## Examples

### Only allow localhost connections. Proxy to the Commons Host DoH service.

    --listen 127.0.0.1 ::1 --doh commonshost

### Use a custom resolver

    --doh https://localhost/my-own-resolver

### Multiple DoH service can be used. Shortnames for popular services are supported.

    --doh commonshost cloudflare quad9 cleanbrowsing https://example.com

### Listen on all network interfaces using both IPv6 and IPv4.

    --listen :: 0.0.0.0

### Listen on a non-privileged port (>=1024).

    --listen 8053

### Check the syntax of the URL and IP address arguments. No connections are attempted.

    --test --doh https://example.com --listen 192.168.12.34

### Send queries to one of multiple DoH services at random for increased privacy.

    --load-balance random --doh quad9 cloudflare commonshost

### Send queries to the fastest DoH service by measuring ping round-trip-times.

    --load-balance fastest-http-ping --doh quad9 cloudflare commonshost

### Randomly send fake DNS queries as disinformation to deter tracking by resolvers.

    --countermeasures spoof-queries

### Mimic popular web browsers by including a random User-Agent header with each request. Default is no User-Agent header.

    --countermeasures spoof-useragent

## Deploying on Raspbian

```shell
$ sudo apt-get install git
$ curl -L https://git.io/n-install | bash -s -- -y latest
$ sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``
$ npx dohnut
```

## Credits

Made by [Kenny Shen](https://www.machinesung.com) and [Sebastiaan Deckers](https://twitter.com/sebdeckers) for 🐑 [Commons Host](https://commons.host).
