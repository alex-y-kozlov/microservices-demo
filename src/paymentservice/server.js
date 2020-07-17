// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const path = require('path');
const grpc = require('grpc');
const pino = require('pino');
const protoLoader = require('@grpc/proto-loader');

const charge = require('./charge');

var appd = require('appdynamics');
appd.profile({
  controllerHostName: "192.168.2.100",
  controllerPort: "8090",
  controllerSslEnabled: false,
  accountName: "customer1" , //Required for a controller running in multi-tenant mode.
  accountAccessKey: "dcdcbda3-ac89-4115-bf4d-25f4f3ecf4b2", //Required for a controller running in multi-tenant mode.
  applicationName: "gcp-demo",
  tierName: "paymentservice",
  nodeName:"paymentservice-1", //Prefix to the full node name.
  libagent: true,
  debug: true //Debug is optional; defaults to false.
 });

const logger = pino({
  name: 'paymentservice-server',
  messageKey: 'message',
  changeLevelName: 'severity',
  useLevelLabels: true
});

class HipsterShopServer {
  constructor (protoRoot, port = HipsterShopServer.PORT) {
    this.port = port;

    this.packages = {
      hipsterShop: this.loadProto(path.join(protoRoot, 'demo.proto')),
      health: this.loadProto(path.join(protoRoot, 'grpc/health/v1/health.proto'))
    };

    this.server = new grpc.Server();
    this.loadAllProtos(protoRoot);
  }

  /**
   * Handler for PaymentService.Charge.
   * @param {*} call  { ChargeRequest }
   * @param {*} callback  fn(err, ChargeResponse)
   */
  static ChargeServiceHandler (call, callback) {
    var tx = appd.startTransaction("PaymentService.Charge");
    try {
      logger.info(`PaymentService#Charge invoked with request ${JSON.stringify(call.request)}`);
      const response = charge(call.request);

      tx.end();
      callback(null, response);
    } catch (err) {
      tx.markError(err.message, 500)
      tx.end();

      console.warn(err);
      callback(err);
    }
  }

  static CheckHandler (call, callback) {
    callback(null, { status: 'SERVING' });
  }

  listen () {
    this.server.bind(`0.0.0.0:${this.port}`, grpc.ServerCredentials.createInsecure());
    logger.info(`PaymentService grpc server listening on ${this.port}`);
    this.server.start();
  }

  loadProto (path) {
    const packageDefinition = protoLoader.loadSync(
      path,
      {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      }
    );
    return grpc.loadPackageDefinition(packageDefinition);
  }

  loadAllProtos (protoRoot) {
    const hipsterShopPackage = this.packages.hipsterShop.hipstershop;
    const healthPackage = this.packages.health.grpc.health.v1;

    this.server.addService(
      hipsterShopPackage.PaymentService.service,
      {
        charge: HipsterShopServer.ChargeServiceHandler.bind(this)
      }
    );

    this.server.addService(
      healthPackage.Health.service,
      {
        check: HipsterShopServer.CheckHandler.bind(this)
      }
    );
  }
}

HipsterShopServer.PORT = process.env.PORT;

module.exports = HipsterShopServer;
