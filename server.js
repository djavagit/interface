var soap = require('soap');
var express = require('express');
var app = express();
var router = express.Router();
var url = 'https://vehicules-soap.herokuapp.com/?wsdl';
var args = {};

// set the view engine to ejs
app.set('view engine', 'ejs');

const promise = new Promise((resolve, reject) => {
    soap.createClient(url, function (err, client) {
        client.all_vehicule(args, function (err, result) {
            resolve(result["all_vehiculeResult"]["data"]);
        })
    })
})
promise.then((value) => {
    console.log(value)
    router.get('/', function (req, res) {
        res.render('index', {
            vehicules: value
        })
    })
})


//add the router
app.use('/', router);
app.listen(process.env.port || 3000);

console.log('Running at Port 3000');