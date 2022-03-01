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

function switchLonLat(tab) {
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
        })).catch(errors => {
            console.log(errors);
        })
            .finally(() => {
                axios.get('https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf624835290f82bf4643548cfbf31e939c3b43&start=' + start_lon + ',' + start_lat + '&end=' + end_lon + ',' + end_lat)
                    .then(response => {
                        console.log(response.data.features[0].properties.summary.distance);
                        let res = switchLonLat(response.data.features[0].geometry.coordinates);
                        io.emit('traceRoute', res, start_lon, start_lat, response.data.features[0].properties.summary.distance / 1000);
                    })
                    .catch(error => {
                        console.log(error);
                    });
            })
    })

    socket.on('callTracePoints', async (coords) => {
        let bornes = [];
        let sep = '%2C+';
        let rayon = 5000;
        for (let i = 0; i < coords.length; i++) {
            const element = coords[i];
            let link = 'https://opendata.reseaux-energies.fr/api/records/1.0/search/?dataset=bornes-irve&q=&geofilter.distance=';
            link += element[0] + sep + element[1] + sep + rayon;

            await axios.get(link)
                .then(response => {
                    for (let i = 0; i < response.data.records.length; i++) {
                        const element = response.data.records[i];
                        bornes.push([element.fields.xlongitude, element.fields.ylatitude])
                    }
                    io.emit('traceBornes', bornes);
                })
                .catch(error => {
                    console.log(error);
                });
        }
    })

})

server.listen(process.env.PORT || 3000);

console.log('Running at Port 3000');