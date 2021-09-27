const express = require('express')
const axios = require('axios')
const https = require('https')
const request = require('request')
const bodyParser = require('body-parser')
const fs = require('fs')
// const certFile = fs.readFileSync('./certificates/applePayCert.pem')
const path = require('path')
const certFile = path.resolve('./certificates/Certificates.p12')
const cors = require('cors')
const app = express()
const PORT = process.env.PORT || 5000;

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type,X-XSRF-Token,X-FC-XSRF-TOKEN,X-FC-KUBE-CANARY');
    next();
}
app.use(allowCrossDomain);
app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true
  })
)
app.use(cors())
app.listen(PORT, () => {
  console.log('Server running on port 3000')
})



app.get('/.well-known/apple-developer-merchantid-domain-association.txt', (req, res) => {
  var fs = require('fs');
  var data = fs.readFileSync('apple-developer-merchantid-domain-association.txt');
  res.send(data);
});


// app.post("/validateSession", (req, res, next) => {
//   console.log('start validate session')
//
//   const { appleUrl } = req.body
//   console.log(appleUrl)
//
// 	const request = require('request');
// 	const options = {
// 	    // url: 'https://apple-pay-gateway.apple.com/paymentservices/paymentSession',
//       url: appleUrl,
//       pfx: fs.readFileSync(certFile),
// 	    passphrase: 'a12345678',
// 	    json : {
// 			      "merchantIdentifier": "merchant.insto.tap.sandbox",
//             "displayName": "INSTO Store",
//             "initiative": "web",
//             "initiativeContext": "d68d-114-34-53-47.ngrok.io"
//         }
// 	};

  app.get('/validateSession', function(req, res) {
  var url = req.query.validationURL || 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession';
  var options = {
    method: 'POST',
    url: url,
    pfx: fs.readFileSync(certFile),
    passphrase: 'a12345678',
    body: {
      merchantIdentifier: 'merchant.insto.tap.sandbox',
      displayName: 'Apple Pay demo',
      initiative: 'web',
      initiativeContext: 'd68d-114-34-53-47.ngrok.io'
    },
    json: true
  };

  // request.post(options, function(error, response, body) {
  //   if (error) throw new Error(error)
  //
  //   console.log(body)
  //   res.send(body);
  // });


	request.post(options,
		(http_err, http_res, http_body) => {
			  if (http_err) {
          console.log('response get error !!')
          console.log(http_err)
          console.log(http_res)
			  	res.send(http_err)
			  }
        console.log('http body:')
        console.log(http_body)

        // http_body["status"] = 0;
        // http_body["msg"] = 'Success';
        // console.log('final body:')
        // console.log(http_body)


			  // res.json(http_body)
        res.send(http_body)
	});

});


// Validate the Apple Pay session
// app.post('/validateSession', (req, res) => {
//   console.log('start validate session')
//
//   // used to send the apple certificate
//   const httpsAgent = new https.Agent({
//     rejectUnauthorized: false,
//     cert: fs.readFileSync('./certificates/applePayCert.pem')
//   })
//   // extract the appleUrl from the POST request body
//   console.log(httpsAgent)
//   console.log('Agent')
//
//   const { appleUrl } = req.body
//   console.log(appleUrl)
//
//   // using AXIOS to do the POST request but any HTTP client can be used
//   axios
//     .post(
//       appleUrl,
//       {
//         merchantIdentifier: 'merchant.insto.tap.sandbox',
//         domainName: '72be-114-34-53-47.ngrok.io',
//         displayName: 'INSTO'
//       },
//       { httpsAgent }
//     )
//     .then(function (response) {
//       res.send(response.data)
//     })
// })

// Tokenise the Apple Pay payload and perform a payment
app.post('/pay', (req, res) => {
  const {
    version,
    data,
    signature,
    header
  } = req.body.details.token.paymentData

  // here we first generate a checkout.com token using the ApplePay
  axios
    .post(
      'https://api.sandbox.checkout.com/tokens',
      {
        type: 'applepay',
        token_data: {
          version: version,
          data: data,
          signature: signature,
          header: {
            ephemeralPublicKey: header.ephemeralPublicKey,
            publicKeyHash: header.publicKeyHash,
            transactionId: header.transactionId
          }
        }
      },
      {
        // notice in this first API call we use the public key
        headers: {
          Authorization: process.env.PUBLIC_KEY
        }
      }
    )
    .then(function (response) {
      // Checkout.com token
      const ckoToken = response.data.token
      const { billingContact, shippingContact } = req.body.details
      // Now we simply do a payment request with the checkout token
      axios
        .post(
          'https://api.sandbox.checkout.com/payments',
          {
            source: {
              type: 'token',
              token: ckoToken,
              billing_address: {
                address_line1: billingContact.addressLines[0],
                address_line2: billingContact.addressLines[1],
                city: billingContact.locality,
                state: billingContact.country,
                zip: billingContact.postalCode,
                country: billingContact.countryCode
              }
            },
            customer: {
              email: shippingContact.emailAddress
            },
            shipping: {
              address_line1: shippingContact.addressLines[0],
              address_line2: shippingContact.addressLines[1],
              city: shippingContact.locality,
              state: shippingContact.country,
              zip: shippingContact.postalCode,
              country: shippingContact.countryCode
            },
            amount: 1000,
            currency: 'USD',
            reference: 'ORD-5023-4E89'
          },
          {
            // notice in this API call we use the secret key
            headers: {
              Authorization: process.env.SECRET_KEY
            }
          }
        )
        .then(function (response) {
          res.send(response.data) // sent back the payment response
        })
    })
    .catch(function (er) {
      console.log(er)
    })
})

app.get('/hello', (req, res) => {
    res.send('Hi!');
});

app.post('/paymentGateway', function(req, res){
	var rBody = req.body
	console.log("<==========================>")
	console.log("<=== Payment Gateway Request Body :: Request Identifier ===>")
	console.log("<==========================>")
	console.log(rBody.requestIdentifier)
    res.contentType('application/json');
    var repsonse  = { "status": "STATUS_SUCCESS" }
	res.contentType('application/json');
    res.send(repsonse, 200);
});
