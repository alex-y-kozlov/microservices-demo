FROM golang:1.9.2 AS base

FROM base as builder

RUN apt-get -y update && \
	apt-get clean all && \
    apt-get -y install tar && \
    apt-get -y install lbzip2 && \
		apt-get --yes --allow-downgrades --allow-remove-essential --allow-change-held-packages install apt-utils ca-certificates git

RUN wget -qO/go/bin/dep https://github.com/golang/dep/releases/download/v0.5.0/dep-linux-amd64 && \
      chmod +x /go/bin/dep

ENV PROJECT github.com/GoogleCloudPlatform/microservices-demo/src/checkoutservice
WORKDIR /go/src/$PROJECT

# restore dependencies
COPY Gopkg.* ./
RUN dep ensure --vendor-only -v

COPY . .
RUN tar -xvf ./appd/golang-sdk-x64-linux.tar  -C $GOPATH/src
RUN go build -gcflags='-N -l' -o /checkoutservice .

FROM base as final
RUN apt-get -y update && apt-get --yes --allow-downgrades --allow-remove-essential --allow-change-held-packages install ca-certificates
RUN GRPC_HEALTH_PROBE_VERSION=v0.2.0 && \
    wget -qO/bin/grpc_health_probe https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/${GRPC_HEALTH_PROBE_VERSION}/grpc_health_probe-linux-amd64 && \
    chmod +x /bin/grpc_health_probe

COPY --from=builder /checkoutservice /checkoutservice
COPY --from=builder /go/src/appdynamics/lib/ /go/src/appdynamics/lib/

EXPOSE 5050
ENTRYPOINT ["/checkoutservice"]
