# Dohnut with Docker

Use Docker to run Dohnut in a container.

Docker image: [`commonshost/dohnut`](https://hub.docker.com/r/commonshost/dohnut)

    $ docker run [DOCKER_OPTIONS] commonshost/dohnut [DOHNUT_OPTIONS]

Note: Dohnut inside the container can not run on port `53` since that is already in use by the system. Run on another port and map it using the Docker `-p` option.

## Dohnut Options

See the [command line interface](./cli) reference.

## Docker Options

See the [Docker reference documentation](https://docs.docker.com/engine/reference/run/) for `docker run`.

## Example

Proxy to Commons Host DoH and expose the DNS service on port `53` (UDP) on all network interfaces.

    $ docker run -p 0.0.0.0:53:5300/udp commonshost/dohnut --listen 0.0.0.0:5300 --doh commonshost

Test the service by performing a DNS query on the Docker host system.

    $ dig @localhost example.com

    ; <<>> DiG 9.10.6 <<>> @127.0.0.1 example.com
    ; (1 server found)
    ;; global options: +cmd
    ;; Got answer:
    ;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 32488
    ;; flags: qr rd ra ad; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

    ;; OPT PSEUDOSECTION:
    ; EDNS: version: 0, flags:; udp: 4096
    ;; QUESTION SECTION:
    ;example.com.			IN	A

    ;; ANSWER SECTION:
    example.com.		86236	IN	A	93.184.216.34

    ;; Query time: 13 msec
    ;; SERVER: 127.0.0.1#53(127.0.0.1)
    ;; WHEN: Tue Feb 19 15:44:53 +08 2019
    ;; MSG SIZE  rcvd: 56
