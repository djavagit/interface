const soap = require('soap');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const path = require('path');
const axios = require('axios');
const { response } = require('express');
const io = new Server(server);
var url = 'https://vehicules-soap.herokuapp.com/?wsdl';
var args = {};
let vehicules = [];

soap.createClient(url, function (err, client) {
    client.all_vehicule(args, function (err, result) {
        vehicules = result["all_vehiculeResult"]["data"];
    })
})

app.use(express.static('public'));
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'))
})

io.on('connection', (socket) => {
    console.log('a user connected');

    io.emit('vehicules', vehicules);

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('callApiDistance', (dist, autonomy, chargingTime) => {
        axios.get('https://parcours-api.herokuapp.com/parcours?dist=' + dist + '&tps_recharge=' + chargingTime + '&autonomy=' + autonomy)
            .then(response => {
                time = response.data.res;
                io.emit('displayTime', Math.floor(time / 60), time % 60)
            })
            .catch(error => {
                console.log(error);
            });
    })

    socket.on('callTraceRoute', () => {
        axios.get('https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf624835290f82bf4643548cfbf31e939c3b43&start=8.681495,49.41461&end=8.687872,49.420318')
            .then(response => {
                console.log(response.data.features[0].geometry.coordinates);
                io.emit('traceRoute', response.data.features[0].geometry.coordinates);
            })
            .catch(error => {
                console.log(error);
            });
    })
})


server.listen(process.env.PORT || 3000);

console.log('Running at Port 3000');