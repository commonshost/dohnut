# dohnut

## Run

Use Commons as the default DOH server

```shell
$ ./dohnut.js -p 53

$ dig @0.0.0.0 www.google.com
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

Specify your own DOH server

```shell
$ ./dohnut.js -d https://cloudflare-dns.com/dns-query
```

More options

```shell
$ ./dohnut.js -h
Usage: dohnut [options]

Options:
  -V, --version      output the version number
  -d, --doh [value]  Specify DOH server URL
  -p, --port <n>     Specify UDP port
  -v, --verbose      Verbose
  -h, --help         output usage information
```
