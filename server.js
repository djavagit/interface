const soap = require('soap');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const path = require('path');
const axios = require('axios');
const io = new Server(server);
const cl = require('country-list');
var url = 'https://vehicules-soap.herokuapp.com/?wsdl';
var args = {};
let vehicules = [];
let start_lon, start_lat, end_lon, end_lat;

function switchLonLat(tab){
    for (let i = 0; i < tab.length; i++) {
        let tmp = tab[i][0];
        tab[i][0] = tab[i][1];
        tab[i][1] = tmp;
    }
    return tab;
}

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

    socket.on('callTraceRoute', (start, end) => {
        axios.all([
            axios.get('https://api.geoapify.com/v1/geocode/search?text=' + start.split(' ').join('%20') + '&apiKey=decf2dfaae66445faf7b1b318e8b1180'),
            axios.get('https://api.geoapify.com/v1/geocode/search?text=' + end.split(' ').join('%20') + '&apiKey=decf2dfaae66445faf7b1b318e8b1180')
        ]).then(axios.spread((...responses) => {
            start_lon = responses[0].data.features[0].properties.lon;
            start_lat = responses[0].data.features[0].properties.lat;
            end_lon = responses[1].data.features[0].properties.lon;
            end_lat = responses[1].data.features[0].properties.lat;
            console.log('recup')
        })).catch(errors => {
            console.log(errors);
        })
        .finally(() => {
            console.log(end_lon);
            axios.get('https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf624835290f82bf4643548cfbf31e939c3b43&start=' + start_lon + ',' + start_lat + '&end=' + end_lon + ',' + end_lat)
                .then(response => {
                    let res = switchLonLat(response.data.features[0].geometry.coordinates);
                    console.log(res);   
                    io.emit('traceRoute', res, start_lon, start_lat);
                })
                .catch(error => {
                    console.log(error);
                });
        })
        // axios.get('https://api.geoapify.com/v1/geocode/search?text=' + start.split(' ').join('%20') + '&apiKey=decf2dfaae66445faf7b1b318e8b1180')
        //     .then(response => {
        //         start_lon = response.data.features[0].lon;
        //         start_lat = response.data.features[0].lat;
        //     })
        //     .catch(error => {
        //         console.log(error);
        //     });
        // axios.get('https://api.geoapify.com/v1/geocode/search?text=' + end.split(' ').join('%20') + '&apiKey=decf2dfaae66445faf7b1b318e8b1180')
        //     .then(response => {
        //         end_lon = response.data.features[0].lon;
        //         end_lat = response.data.features[0].lat;
                
        //     })
        //     .catch(error => {
        //         console.log(error);
        //     })
        //     .finally(() => {
        //         console.log(end_lon);
        //         axios.get('https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf624835290f82bf4643548cfbf31e939c3b43&start=8.681495,49.41461&end=8.687872,49.420318')
        //             .then(response => {
        //                 console.log(response.data.features[0].geometry.coordinates);
                        
        //                 io.emit('traceRoute', response.data.features[0].geometry.coordinates);
        //             })
        //             .catch(error => {
        //                 console.log(error);
        //             });
        //     });
        
    })
})


server.listen(process.env.PORT || 3000);

console.log('Running at Port 3000');