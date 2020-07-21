FROM microsoft/dotnet:2.1-sdk-alpine as builder
WORKDIR /app
COPY . .
RUN dotnet restore && \
    dotnet build && \
    dotnet publish -c release -r linux-musl-x64 -o /cartservice

# cartservice
FROM alpine:3.8

RUN GRPC_HEALTH_PROBE_VERSION=v0.2.0 && \
    wget -qO/bin/grpc_health_probe https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/${GRPC_HEALTH_PROBE_VERSION}/grpc_health_probe-linux-amd64 && \
    chmod +x /bin/grpc_health_probe

RUN mkdir -p /opt/appdynamics/dotnet

ADD appd/libappdprofiler.so /opt/appdynamics/dotnet/
ADD appd/AppDynamics.Agent.netstandard.dll /opt/appdynamics/dotnet/
ADD appd/AppDynamicsConfig.json /opt/appdynamics/dotnet/

# Mandatory settings required to attach the agent to the .NET application
ENV CORECLR_PROFILER={57e1aa68-2229-41aa-9931-a6e93bbc64d8} \
    CORECLR_ENABLE_PROFILING=1 \
    LD_LIBRARY_PATH=/opt/appdynamics/dotnet \
    CORECLR_PROFILER_PATH=/opt/appdynamics/dotnet/libappdprofiler.so

# Configure connection to the controller
# ENV APPDYNAMICS_CONTROLLER_HOST_NAME=192.168.2.100
# ENV APPDYNAMICS_CONTROLLER_PORT=8090
# ENV APPDYNAMICS_CONTROLLER_SSL_ENABLED=false
# ENV APPDYNAMICS_AGENT_ACCOUNT_NAME=customer1
# ENV APPDYNAMICS_AGENT_ACCOUNT_ACCESS_KEY=dcdcbda3-ac89-4115-bf4d-25f4f3ecf4b2

# Configure application identity in AppDynamics
ENV APPDYNAMICS_AGENT_APPLICATION_NAME=gcp-demo
ENV APPDYNAMICS_AGENT_TIER_NAME=cartservice
ENV APPDYNAMICS_AGENT_REUSE_NODE_NAME=true
ENV APPDYNAMICS_AGENT_REUSE_NODE_NAME_PREFIX=instance

# Dependencies for runtime
# busybox-extras => telnet
RUN apk add --no-cache \
    busybox-extras \
    libc6-compat \
    libunwind \
    libuuid \
    libgcc \
    libstdc++ \
    libintl \
    icu
WORKDIR /app
COPY --from=builder /cartservice .
ENTRYPOINT ["./cartservice", "start"]
