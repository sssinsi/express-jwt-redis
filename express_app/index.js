var express = require("express");
var config = require('./config');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
//var client = require('redis').createClient(process.env.DB_PORT_6379_TCP_PORT,process.env.DB_PORT_6379_TCP_ADDR);
var io = require('socket.io')(8000);
var redis = require('socket.io-redis');
var ioJwt = require('socketio-jwt');

//var ioe = require('socket.io-emitter')({host:process.env.DB_PORT_6379_TCP_ADDR, port:process.env.DB_PORT_6379_TCP_PORT});
io.adapter(redis({host:process.env.DB_PORT_6379_TCP_ADDR, port:process.env.DB_PORT_6379_TCP_PORT}));

var app = express();
app.set('port', 8888);
app.set('jwtSecret', config.secret);

var port = app.get('port');
var jwtSecret = app.get('jwtSecret')
var apiRoutes = express.Router();

app.listen(port, function () {
    console.log("Node app is running at localhost:" + app.get('port'))
});

// apply the routes to our application(prefix /api)
app.use('/api', apiRoutes);

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//non secure api
app.get('/', function (req, res) {
    res.send('Hello World!');
});

//create token
apiRoutes.get('/authenticate', function (req, res) {
    //sample user
    var token = jwt.sign({user_id: 123}, jwtSecret, {
        expiresIn: '24h'
    });

    res.json({
        message: 'Authentication success.',
        token: token
    });
});

io.sockets
    .on('connection', ioJwt.authorize({
        secret: jwtSecret,
        timeout: 15000 //15 seconds to send the authentication message
    }))
    .on('authenticated', function (socket) {
        console.log('hello!', socket.decoded_token);

        socket.emit('greeting', {message: 'Hi!'}, function (data) {
            console.log('result: ' + data);
        });

        socket.on('msg', function (data) {
            io.sockets.emit('receive', data);
            console.log('receive:' + data);
        });
        //ioe.emit('broadcast','this is broadcasting');
        //
        //socket.on('msg', function(msg){
        //    console.log('message : ' + msg);
        //});
        //socket.on('message', function(data){
        //    socket.broadcast.emit('message', data);
        //});
});

//Authentification Filter
apiRoutes.use(function (req, res, next) {
    // get token from body:token or query:token of Http Header:x-access-token
    var token = req.headers['x-access-token'];

    //validate token
    if (!token) {
        return res.status(403).send({
            message: 'No token provided.'
        });
    }

    jwt.verify(token, jwtSecret, function (err, decoded) {
        if (err) {
            return res.json({
                message: 'Invalid token.'
            });
        }

        //if token valid p ->save token to request for use in other routes
        req.decoded = decoded;

        next();
    });
});



//secure api
apiRoutes.get('/check', function (req, res) {
    res.send(req.decoded);
});

////get user notify
//apiRoutes.get('/notify', function(req,res){
//    var key = 'user.' + req.decoded.user_id;
//    var value = 'test message';
//    client.set(key,value);
//
//    client.get(key,function(err, val){
//        if(err){
//            return res.json({
//                message: 'Invalid token.'
//            });
//        }
//
//        return res.send(val);
//    });
//});


