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

*Note: Support for running as services under systemd (Linux) and launchd (Mac OS) is coming soon. It technically already works but needs more testing & documentation. Guides on integrating with Pi-hole are coming soon. An easy to use desktop app is also planned.*

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
;; SERVER: 127.0.0.1#53(127.0.0.1)
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

### `--load-balance`, `--lb`

The strategy to use with multiple DoH resolvers.

Default: `performance`

#### `--load-balance performance`

Best performance. Always send DNS queries to the fastest DoH resolver. Continuously monitors the round-trip-time latency to each DoH resolver using HTTP/2 PING frames.

#### `--load-balance privacy`

Best privacy. Uniformly distributes DNS queries across all enabled DoH resolvers.

### `--countermeasures`

One or more special tactics to protect your privacy.

Default: `[]`

#### `--countermeasures spoof-queries`

Adds plausible deniability to any legitimate DNS query. Makes it hard for a DoH resolver to profile your DNS queries.

Whenever a DNS query is proxied, a fake query is also generated. The fake query is for a domain from a public top 1 million DNS domains list, sampled by an exponential distribution. To resist detection, the fake query is sent randomly before, after, with a delay, or not at all.

#### `--countermeasures spoof-useragent`

Sends a fake `User-Agent` HTTP header to prevent tracking. Makes it look like every DoH request is by a different browser. Randomly samples actual user agent strings from a public data source of real-world web traffic.

## `--bootstrap`

Default: `[]`

One or more IPv4 or IPv6 addresses of DNS resolvers. These are used to perform the initial DNS lookup for the DoH URI hostname.

If this option is not specified, the operating system resolves the DoH URI hostname based on your network settings, typically provided automatically via DHCP or manually configured. This option is used to avoid a loop when Dohnut itself is the DNS resolver of the operating system.

A possible loop scenario is when Dohnut provides transparent DoH proxying as the upstream DNS server for a [Pi-hole](https://pi-hole.net) service. If the operating system running Dohnut uses the Pi-hole server as its DNS server, a lookup loop is created. To break out of the loop, set the bootstrap option to the IP address of the DNS server of your LAN router, your ISP, or a [public DNS service](https://en.wikipedia.org/wiki/Public_recursive_name_server).

Notes:
- Only the DoH URI hostname is resolved via the bootstrap DNS lookup. Actual user DNS queries are never exposed.
- DoH bootstrapping is considered failsafe. Tampering during bootstrap by a DNS resolver results in a failed DoH connection. DoH uses HTTP/2 which requires a valid TLS certificate for the DoH URI hostname. No queries are exposed without a secure HTTP/2 connection.

### `--config`

Path to JSON config file

The JSON config file options are identical to the CLI options.

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

    --load-balance privacy --doh quad9 cloudflare commonshost

### Send queries to the fastest DoH service by measuring ping round-trip-times.

    --load-balance performance --doh quad9 cloudflare commonshost

### Randomly send fake DNS queries as disinformation to deter tracking by resolvers.

    --countermeasures spoof-queries

### Mimic popular web browsers by including a random User-Agent header with each request. Default is no User-Agent header.

    --countermeasures spoof-useragent

### Bypass the operating system DNS settings to resolve the DoH service hostnames.

    --bootstrap 192.168.1.1 1.1.1.1 8.8.8.8 9.9.9.9

### Load options from a JSON file

    --config ~/dohnut-options.json

## Credits

Made by [Kenny Shen](https://www.machinesung.com) and [Sebastiaan Deckers](https://twitter.com/sebdeckers) for 🐑 [Commons Host](https://commons.host).
