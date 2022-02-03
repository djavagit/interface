const soap = require('soap');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const path = require('path');
const io = new Server(server);
var url = 'https://vehicules-soap.herokuapp.com/?wsdl';
var args = {};
let vehicules = [];

soap.createClient(url, function (err, client) {
    client.all_vehicule(args, function (err, result) {
        vehicules = result["all_vehiculeResult"]["data"];
    })
})

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'))
})

io.on('connection', (socket) => {
    console.log('a user connected');

    io.emit('vehicules', vehicules);

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });


})

// const promise = new Promise((resolve, reject) => {
//     soap.createClient(url, function (err, client) {
//         client.all_vehicule(args, function (err, result) {
//             resolve(result["all_vehiculeResult"]["data"]);
//         })
//     })
// })
// promise.then((value) => {
//     router.get('/', function (req, res) {
//         res.render('index', {
//             vehicules: value
//         })
//     })
// })



server.listen(process.env.PORT || 3000);

console.log('Running at Port 3000');