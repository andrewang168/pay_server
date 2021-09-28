var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');

// var CERT_PATH = './merchant_id.pem';
// var cert = fs.readFileSync(CERT_PATH, 'utf8');


// var certFilePath = path.resolve(__dirname, './certificates/Certificate.pem');
// var cert = fs.readFileSync(certFilePath);

var CERT_PATH = './certificates/Certificate.pem';
var cert = fs.readFileSync(CERT_PATH);

// const PORT = process.env.PORT || 5000;

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/.well-known/apple-developer-merchantid-domain-association.txt', function(req, res) {
  res.sendFile(__dirname + '/.well-known/apple-developer-merchantid-domain-association.txt');
});

app.get('/merchant-session/new', function(req, res) {
  var url = req.query.validationURL || 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession';
  var options = {
    method: 'POST',
    url: url,
    cert: cert,
    key: cert,
    body: {
      merchantIdentifier: 'merchant.insto.pay',
      displayName: ' ',
      initiative: 'web',
      initiativeContext: 'insto-applepay-demo.herokuapp.com'
    },
    json: true
  };

  request.post(options, function(error, response, body) {
    if (error) throw new Error(error)
    body["status"] = 0;
    body["msg"] = 'Success';
    res.send(body);
  });
});

app.post('/call-payment-provider', function(req, res) {
  console.log('request:', req.body)

  let paymentData = req.body.paymentData;

  /* Make an order with the Cielo's API.
     Here you'll use your Payment provider API to charge an order.
  */
  var options = {
    method: 'POST',
    url: 'https://api.cieloecommerce.cielo.com.br/1/sales',
    headers: {
      merchantkey: 'cielo_merchant_key_hash',
      merchantid: 'cielo_merchant_id_hash',
      'content-type': 'application/json'
    },
    body: {
      MerchantOrderId: paymentData.header.transactionId,
      Payment: {
        CreditCard: {
          SaveCard: true
        },
        Type: 'CreditCard',
        Amount: 100,
        Provider: 'Cielo',
        Installments: 1,
        Currency: 'BRL',
        Wallet: {
          Type: 'ApplePay',
          WalletKey: paymentData.data,
          AdditionalData: {
            EphemeralPublicKey: paymentData.header.ephemeralPublicKey
          }
        }
      }
    },
    json: true
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    res.send(body);
  });
});


var server = app.listen(process.env.PORT || 3000, function() {
  console.log('Apple Pay server running on ' + server.address().port);
  console.log('GET /merchant-session/new to retrieve a merchant session');
});
