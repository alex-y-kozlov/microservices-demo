/*
 * Copyright 2018 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var appd = require('appdynamics');
appd.profile({
  controllerHostName: "192.168.2.100",
  controllerPort: 8090,
  accountName: "customer1" , //Required for a controller running in multi-tenant mode.
  accountAccessKey: "cdcbda3-ac89-4115-bf4d-25f4f3ecf4b2", //Required for a controller running in multi-tenant mode.
  applicationName: "gcp-demo",
  tierName: "currencyservice",
  nodeName:"currencyservice", //Prefix to the full node name.
  debug: true //Debug is optional; defaults to false.
 });

if(process.env.DISABLE_PROFILER) {
  console.log("Profiler disabled.")
}
else {
  console.log("Profiler enabled.")
//  require('@google-cloud/profiler').start({
//    serviceContext: {
//      service: 'currencyservice',
//      version: '1.0.0'
//    }
//  });
}


if(process.env.DISABLE_TRACING) {
  console.log("Tracing disabled.")
}
else {
  console.log("Tracing enabled.")
//  require('@google-cloud/trace-agent').start();
}

if(process.env.DISABLE_DEBUGGER) {
  console.log("Debugger disabled.")
}
else {
  console.log("Debugger enabled.")
//  require('@google-cloud/debug-agent').start({
//    serviceContext: {
//      service: 'currencyservice',
//      version: 'VERSION'
//    }
//  });
}

const path = require('path');
const grpc = require('grpc');
const pino = require('pino');
const protoLoader = require('@grpc/proto-loader');

const MAIN_PROTO_PATH = path.join(__dirname, './proto/demo.proto');
const HEALTH_PROTO_PATH = path.join(__dirname, './proto/grpc/health/v1/health.proto');

const PORT = process.env.PORT;

const shopProto = _loadProto(MAIN_PROTO_PATH).hipstershop;
const healthProto = _loadProto(HEALTH_PROTO_PATH).grpc.health.v1;

const logger = pino({
  name: 'currencyservice-server',
  messageKey: 'message',
  changeLevelName: 'severity',
  useLevelLabels: true
});

/**
 * Helper function that loads a protobuf file.
 */
function _loadProto (path) {
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

/**
 * Helper function that gets currency data from a stored JSON file
 * Uses public data from European Central Bank
 */
function _getCurrencyData (callback) {
  const data = require('./data/currency_conversion.json');
  callback(data);
}

/**
 * Helper function that handles decimal/fractional carrying
 */
function _carry (amount) {
  const fractionSize = Math.pow(10, 9);
  amount.nanos += (amount.units % 1) * fractionSize;
  amount.units = Math.floor(amount.units) + Math.floor(amount.nanos / fractionSize);
  amount.nanos = amount.nanos % fractionSize;
  return amount;
}

/**
 * Lists the supported currencies
 */
function getSupportedCurrencies (call, callback) {
  var tx = appd.startTransaction("CurrencyService.convert");
  logger.info('Getting supported currencies: tx=CurrencyService.getSupportedCurrencies');
  _getCurrencyData((data) => {
    callback(null, {currency_codes: Object.keys(data)});
    tx.end()
    logger.info(`Getting supported currencies completed: tx=CurrencyService.getSupportedCurrencies`);
  });
}

/**
 * Converts between currencies
 */
function convert (call, callback) {
  var tx = appd.startTransaction("CurrencyService.convert");
  logger.info('received conversion request: tx=CurrencyService.convert');
  try {
    _getCurrencyData((data) => {
      const request = call.request;

      // Convert: from_currency --> EUR
      const from = request.from;
      const euros = _carry({
        units: from.units / data[from.currency_code],
        nanos: from.nanos / data[from.currency_code]
      });

      euros.nanos = Math.round(euros.nanos);

      // Convert: EUR --> to_currency
      const result = _carry({
        units: euros.units * data[request.to_code],
        nanos: euros.nanos * data[request.to_code]
      });

      result.units = Math.floor(result.units);
      result.nanos = Math.floor(result.nanos);
      result.currency_code = request.to_code;

      tx.end()
      logger.info(`conversion request successful: tx=CurrencyService.convert`);

      callback(null, result);
    });
  } catch (err) {
    tx.markError(err.message, 500)
    tx.end();

    logger.error(`conversion request failed: ${err}: tx=CurrencyService.convert`);
    callback(err.message);
  }
}

/**
 * Endpoint for health checks
 */
function check (call, callback) {
  callback(null, { status: 'SERVING' });
}

/**
 * Starts an RPC server that receives requests for the
 * CurrencyConverter service at the sample server port
 */
function main () {
  logger.info(`Starting gRPC server on port ${PORT}...`);
  const server = new grpc.Server();
  server.addService(shopProto.CurrencyService.service, {getSupportedCurrencies, convert});
  server.addService(healthProto.Health.service, {check});
  server.bind(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure());
  server.start();
}

main();
