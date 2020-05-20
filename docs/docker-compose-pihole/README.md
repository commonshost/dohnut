# Docker Compose: Dohnut with Pi-hole

Use [Docker Compose](https://docs.docker.com/compose/) to run Dohnut and [Pi-hole](https://pi-hole.net) side-by-side on the same host. Dohnut encrypts Pi-hole's upstream DNS queries, adds DNS countermeasures, and supports load balancing across multiple DoH providers for better privacy and/or performance.

This example runs Dohnut on port `53000/udp` and Pi-hole on port `53/udp`. It also exposes the Pi-hole web dashboard for monitoring and management at:

- http://pi.hole/admin/

Important: Replace `XXX.XXX.XXX.XXX` with the IP address of the Docker host. For example: `192.168.1.2`

To find the IP address, run:

- Linux: `hostname --all-ip-addresses`
- macOS: `ipconfig getifaddr en0 || ipconfig getifaddr en1`
- Windows: `ipconfig`

Save the edited YAML file and run both Dohnut and Pi-hole as background services:

    $ docker-compose up --detach

`./docker-compose.yml`

```yaml
version: "3"

services:
  # See: Dohnut (options passed as environment variables)
  # https://help.commons.host/dohnut/cli/#options
  dohnut:
    container_name: dohnut
    image: commonshost/dohnut:latest
    restart: unless-stopped
    environment:
      DOHNUT_LISTEN: 0.0.0.0:53000
      DOHNUT_BOOTSTRAP: 9.9.9.9 8.8.8.8 1.1.1.1
      DOHNUT_DOH: commonshost
      DOHNUT_COUNTERMEASURES: spoof-queries spoof-useragent
      DOHNUT_CACHE_DIRECTORY: /etc/dohnut
    volumes:
    - "./etc-dohnut/:/etc/dohnut/"
    ports:
    - "53000:53000/udp"

  # See: Docker Pi-hole
  # https://github.com/pi-hole/docker-pi-hole
  pihole:
    depends_on:
    - dohnut
    container_name: pihole
    image: pihole/pihole:latest
    restart: unless-stopped
    environment:
      DNS1: XXX.XXX.XXX.XXX#53000 # Set to host's IP address
      # WEBPASSWORD: "set a secure password here or it will be random"
    volumes:
    - "./etc-pihole/:/etc/pihole/"
    - "./etc-dnsmasq.d/:/etc/dnsmasq.d/"
    ports:
    - "53:53/tcp"
    - "53:53/udp"
    - "67:67/udp"
    - "80:80/tcp"
    - "443:443/tcp"
```

See also:

- [Docker Compose `up` command reference](https://docs.docker.com/compose/reference/up/)
- [Docker Pi-hole documentation](https://github.com/pi-hole/docker-pi-hole)
