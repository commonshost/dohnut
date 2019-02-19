# CLI

## Options

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

### `--bootstrap`

Default: `[]`

One or more IPv4 or IPv6 addresses of DNS resolvers. These are used to perform the initial DNS lookup for the DoH URI hostname.

If this option is not specified, the operating system resolves the DoH URI hostname based on your network settings, typically provided automatically via DHCP or manually configured. This option is used to avoid a loop when Dohnut itself is the DNS resolver of the operating system.

A possible loop scenario is when Dohnut provides transparent DoH proxying as the upstream DNS server for a [Pi-hole](https://pi-hole.net) service. If the operating system running Dohnut uses the Pi-hole server as its DNS server, a lookup loop is created. To break out of the loop, set the bootstrap option to the IP address of the DNS server of your LAN router, your ISP, or a [public DNS service](https://en.wikipedia.org/wiki/Public_recursive_name_server).

Notes:
- Only the DoH URI hostname is resolved via the bootstrap DNS lookup. Actual user DNS queries are never exposed.
- DoH bootstrapping is considered failsafe. Tampering during bootstrap by a DNS resolver results in a failed DoH connection. DoH uses HTTP/2 which requires a valid TLS certificate for the DoH URI hostname. No queries are exposed without a secure HTTP/2 connection.

### `--datagram-protocol`

Default: `udp6`

Sets the protocol to use for local listening UDP sockets when the IP address is not specified. For example if `--listen` is used with only a port number. Or when a socket file descriptor is provided by a service manager like systemd (Linux) or launchd (macOS).

Set to `udp4` to use IPv4. Set to `udp6` to use IPv6.

### `--config`

Path to JSON config file

The JSON config file options are identical to the CLI options.

### `--version`

Show version number

### `--help`

Show help

## Shortnames

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

Only allow localhost connections. Proxy to the Commons Host DoH service.

    --listen 127.0.0.1 ::1 --doh commonshost

Use a custom resolver

    --doh https://localhost/my-own-resolver

Multiple DoH service can be used. Shortnames for popular services are supported.

    --doh commonshost cloudflare quad9 cleanbrowsing https://example.com

Listen on all network interfaces using both IPv6 and IPv4.

    --listen :: 0.0.0.0

Listen on a non-privileged port (>=1024).

    --listen 8053

Listen on `127.0.0.1:53` using UDP over IPv4.

    --port 53 --datagram-protocol udp4

Listen on `[::1]:53` using UDP over IPv6.

    --port 53 --datagram-protocol udp6

Check the syntax of the URL and IP address arguments. No connections are attempted.

    --test --doh https://example.com --listen 192.168.12.34

Send queries to one of multiple DoH services at random for increased privacy.

    --load-balance privacy --doh quad9 cloudflare commonshost

Send queries to the fastest DoH service by measuring ping round-trip-times.

    --load-balance performance --doh quad9 cloudflare commonshost

Randomly send fake DNS queries as disinformation to deter tracking by resolvers.

    --countermeasures spoof-queries

Mimic popular web browsers by including a random User-Agent header with each request. Default is no User-Agent header.

    --countermeasures spoof-useragent

Bypass the operating system DNS settings to resolve the DoH service hostnames.

    --bootstrap 192.168.1.1 1.1.1.1 8.8.8.8 9.9.9.9

Load options from a JSON file

    --config ~/dohnut-options.json
