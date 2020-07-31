FROM golang:1.9.2 AS base

FROM base as builder

RUN apt-get -y update && \
	apt-get clean all && \
    apt-get -y install tar && \
    apt-get -y install lbzip2 && \
		apt-get --yes --allow-downgrades --allow-remove-essential --allow-change-held-packages install apt-utils ca-certificates git

RUN wget -qO/go/bin/dep https://github.com/golang/dep/releases/download/v0.5.0/dep-linux-amd64 && \
      chmod +x /go/bin/dep

ENV PROJECT github.com/GoogleCloudPlatform/microservices-demo/src/frontend
WORKDIR /go/src/$PROJECT

# restore dependencies
COPY Gopkg.* ./
RUN dep ensure --vendor-only -v

COPY . .
RUN tar -xvf ./appd/golang-sdk-x64-linux.tar  -C $GOPATH/src
RUN go install .

FROM base as final
RUN apt-get -y update && apt-get --yes --allow-downgrades --allow-remove-essential --allow-change-held-packages install ca-certificates
# RUN apt-get -y update && apt-get --yes --allow-downgrades --allow-remove-essential --allow-change-held-packages install ca-certificates busybox-extras net-tools bind-tools
WORKDIR /frontend
COPY --from=builder /go/bin/frontend /frontend/server
COPY --from=builder /go/src/appdynamics/lib/ /go/src/appdynamics/lib/
COPY ./templates ./templates
COPY ./static ./static


EXPOSE 8080
ENTRYPOINT ["/frontend/server"]
