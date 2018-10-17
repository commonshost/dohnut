# dohnut

## Run

```shell
$ node index.js
{"level":30,"time":1539781314399,"msg":"dohnut listening on 0.0.0.0:4444","pid":18832,"hostname":"tau","v":1}

$ dig @0.0.0.0 -p 4444 www.google.com
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

;; AUTHORITY SECTION:

;; ADDITIONAL SECTION:

;; Query time: 51 msec
;; SERVER: 127.0.0.1
;; WHEN: Wed Oct 17 21:02:30 2018
;; MSG SIZE  rcvd: 128
```
