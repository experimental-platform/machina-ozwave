#influx: docker run -p 8083:8083 -p 8086:8086 tutum/influxdb
influx: docker run --rm --volume=/data/influxdb:/data -p 8083:8083 -p 8086:8086 tutum/influxdb
# grafana_storage: docker run -v /var/lib/grafana --name grafana-storage busybox:latest
grafana: docker run --rm -p 3000:3000 --volume=/data/grafana:/var/lib/grafana grafana/grafana
