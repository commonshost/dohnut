# dohnut 🍩

A simple DNS over HTTPS (DoH) proxy to send relay your DNS queries to a DoH server.

Multi-threaded for fast performance on low-power devices like Raspberry Pi and other single board computers. Based on the low-level HTTP/2 core API in Node.js. Requires Node.js v11.4.0 or later.

## Usage

Launch the Dohnut service. Port `53` requires root (`sudo`) access so for the example run it on non-privileged port `8053`. In a production environment port `53` is required since most DNS clients assume this standard port number.

```shell
$ npx dohnut --local :8053 --upstream commons.host

Dohnut started
```

Run a DNS lookup against your local machine on port `8053` where Dohnut is listening. The request is proxied to the Commons Host DNS over HTTPS service.

```shell
$ dig @localhost -p 8053 iana.org

; <<>> DiG 9.10.6 <<>> @localhost -p 8053 iana.org
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

- cleanbrowsing
- cloudflare
- commonshost
- google
- keoweon
- mozilla
- nekomimi
- powerdns
- quad9
- rubyfish
- securedns

## Examples

### Use a custom resolver

    --doh https://localhost/my-own-resolver

### Multiple DoH resolvers

Shortnames for popular services are supported.

    --doh commonshost cloudflare quad9 cleanbrowsing

### Multiple DNS listeners

Listen on all network interfaces using both IPv6 and IPv4.

    --listen :: 0.0.0.0

### Listen on a non-privileged port (>=1024).

    --listen 8053

### Deploying on Raspbian

```shell
$ sudo apt-get install git
$ curl -L https://git.io/n-install | bash -s -- -y latest
$ sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``
$ npx dohnut
```

## Credits

Made by [Kenny Shen](https://www.machinesung.com) and [Sebastiaan Deckers](https://twitter.com/sebdeckers) for 🐑 [Commons Host](https://commons.host).
