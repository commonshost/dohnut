# dohnut 🍩

A simple DNS proxy to send relay your queries to a DNS over HTTPS (DoH) server.

## Usage

```shell
$ npx dohnut --verbose --port 5300 | npx pino-colada
03:48:29 ✨ dohnut listening on 0.0.0.0:5300
03:48:41 ✨ query received
03:48:41 ✨ reply sent

$ dig @localhost www.google.com
;; ->>HEADER<<- opcode: QUERY, rcode: NOERROR, id: 4719
;; flags: qr rd ra ; QUERY: 1, ANSWER: 6, AUTHORITY: 0, ADDITIONAL: 0
;; QUESTION SECTION:
;; www.google.com.      IN      A

;; ANSWER SECTION:
www.google.com. 300     IN      A       74.125.24.99
www.google.com. 300     IN      A       74.125.24.103
www.google.com. 300     IN      A       74.125.24.104
www.google.com. 300     IN      A       74.125.24.105
www.google.com. 300     IN      A       74.125.24.106
www.google.com. 300     IN      A       74.125.24.147

...
```

By default, queries are relayed to Commons' DOH server. You can specify your own DOH server via the `--doh` flag, for example:

```shell
$ npx dohnut --verbose --port 5300 --doh https://cloudflare-dns.com/dns-query | npx pino-colada
```

You can specify a blocklist with `-s /path/to/blocklist`. For instance,

```shell

$ cat /tmp/foo
yola.com

$ npx dohnut -p 5300 -s /tmp/foo

$ dig @localhost -p 5300 yola.com
;; ->>HEADER<<- opcode: QUERY, rcode: NXDOMAIN, id: 17315
;; flags: qr ; QUERY: 0, ANSWER: 0, AUTHORITY: 0, ADDITIONAL: 0
;; QUESTION SECTION:
;;
;; ANSWER SECTION:

;; AUTHORITY SECTION:

;; ADDITIONAL SECTION:

;; Query time: 0 msec
;; SERVER: 0.0.0.0
;; WHEN: Sun Nov  4 02:35:33 2018
;; MSG SIZE  rcvd: 12
```

Availabe options for `dohnut` can be shown via `-h`:

```shell
$ npx dohnut -h
Usage: dohnut [options]

Options:
  -V, --version      output the version number
  -d, --doh [value]  Specify DOH server URL
  -p, --port <n>     Specify UDP port
  -v, --verbose      Verbose
  -h, --help         output usage information
```

## Deploying on a Raspberry Pi

```
sudo apt-get install git
sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``
curl -L https://git.io/n-install | bash
n latest
n prune
npx dohnut --verbose --port 53 | npx pino-colada
```

## Credits

Made by [Kenny Shen](https://www.machinesung.com) and [Sebastiaan Deckers](https://twitter.com/sebdeckers) for 🐑 [Commons Host](https://commons.host).
