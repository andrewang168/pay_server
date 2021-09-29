var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');

var CERT_PATH = './merchant_id.pem';
var cert = fs.readFileSync(CERT_PATH, 'utf8');

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.get('/.well-known/apple-developer-merchantid-domain-association.txt', (req, res) => {
  res.send(fs.readFileSync('apple-developer-merchantid-domain-association.txt'));
});


app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});


app.get('/merchant-session/new', function(req, res) {
  // var url = 'https://apple-pay-gateway.apple.com/paymentservices/paymentSession'
  // var url = 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession'
  var url = req.query.validationURL || 'https://apple-pay-gateway.apple.com/paymentservices/paymentSession';
  var options = {
    method: 'POST',
    url: url,
    cert: cert,
    key: cert,
    body: {
      merchantIdentifier: 'merchant.insto.pay',
      displayName: 'INSTO',
      // domainName: 'andrewang168.github.io'

      initiative: 'web',
      // initiativeContext: 'insto-applepay-demo.herokuapp.com'
      initiativeContext: '770a-111-249-154-123.ngrok.io',
    },
    json: true
  };

  request.post(options, function(error, response, body) {
    if (error) throw new Error(error)
    // body["status"] = 0;
    // body["msg"] = 'Success';
    console.log(body);
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


app.get('/hello', (req, res) => {
    res.send('Hi!');
});


// function extractMerchantID(cert) {
//   try {
//     var info = x509.parseCert(cert);
//     console.log(info);
//     return info.extensions['1.2.840.113635.100.6.32'].substr(2);
//   } catch (e) {
//     console.error("Unable to extract merchant ID from certificate " + CERT_PATH);
//   }
// }


var server = app.listen(process.env.PORT || 3000, function() {
  console.log('Apple Pay server running on ' + server.address().port);
  console.log('GET /merchant-session/new to retrieve a merchant session');
});
