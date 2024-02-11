// Import packages
const express = require("express");
const { createServer } = require('http');
const axios = require('axios');

const { Server } = require('socket.io');
require('dotenv').config();

// Middlewares
const app = express();
app.use(express.json());

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Routes
app.get("/", (req, res) => {
    res.status(200).json({
        title: "Express Testing",
        message: "The app is working properly!",
    });
});

// Socket.IO Connection handling
let countUser = 0;
let players = [];
let lobbies = [];
let quests = [];
let round = 0;
io.on('connection', (socket) => {

    socket.on('find', (e) => {
        if (e.name != null) {
            players.push(e.name);
            if (players.length == 2) {

                let player1 = {
                    name: players[0],
                    score: 0
                }

                let player2 = {
                    name: players[1],
                    score: 0
                }

                let lobby = {
                    players: [player1, player2]
                }

                lobbies.push(lobby);

                axios.get('https://opentdb.com/api.php?amount=11&type=multiple')
                    .then(response => {
                        quests = response.data;
                        io.emit('find', { lobbies: lobbies, quests: quests, final: false });
                    })
                    .catch(error => {
                        console.error('Error fetching questions:', error);
                    });
            }
        }
    });
    // Cuando se termina cada round se envia el resultado de la ronda
    socket.on('round', (e) => {
        let index = -1;
        if (lobbies[0] && lobbies[0].players) {
            index = lobbies[0].players.findIndex(player => player.name === e.name);
        }
        // let index = lobbies[0]?.players.findIndex(player => player.name === e.name);
        // se suma el resultado al score del jugador
        if (index !== -1) {

            lobbies[0].players[index].score += e.result;
        }

        if (e.round >= 9) {
            io.emit('find', { lobbies: lobbies, quests: quests, final: true });

        } else {

            io.emit('find', { lobbies: lobbies, quests: quests, final: false });
        }


    });

    socket.on('disconnect', () => {
        // Cuando un jugador se desconecta se borra su lobby en el q
        players = [];
        lobbies = [];
        quests = [];



        io.emit('find', { lobbies: lobbies, quests: quests, final: false });

    });
});

// Connection
const port = process.env.PORT || 9001;
httpServer.listen(port, () => {
    console.log(`Express and Socket.IO server listening on port ${port}`);
});