var express = require("express");
var config = require('./config');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
var io = require('socket.io')(8000);
var ioRedis = require('socket.io-redis');
var ioJwt = require('socketio-jwt');

var redisHost = process.env.DB_PORT_6379_TCP_ADDR;
var redisPort = process.env.DB_PORT_6379_TCP_PORT;

var redis = require('redis');
//redis.createClient({host:redisHost,port:redisPort});
var pub = redis.createClient( redisPort,redisHost);//master
var sub = redis.createClient( redisPort,redisHost,{return_buffers:true});//slave

io.adapter(ioRedis({pubClient:pub,subClient:sub}));

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
    var now = new Date();
    var user_name = "user123" + now.getFullYear() + "/" + (now.getMonth() + 1) +
        "/" + now.getDate() + " " + now.getHours() + ":" +
        now.getMinutes() + ":" + now.getSeconds();

    var token = jwt.sign({user_id: 123,user_name: user_name}, jwtSecret, {
        expiresIn: '24h'
    });

    res.json({
        message: 'Authentication success.',
        token: token
    });
});

//var chatNsp = io.of('/chat');
var notifyNsp = io.of('/notify');

notifyNsp
    .on('connection', ioJwt.authorize({
        secret: jwtSecret,
        timeout: 15000 //15 seconds to send the authentication message
    }))
    .on('authenticated', function (socket) {
        var id = socket.id;//接続者のid
        var roomName = 'personal';
        socket.join(roomName);

        var channelName = notifyNsp.name + ':' + roomName + ':user:' + socket.decoded_token.user_id;// /notify:personal:user:123
        var unseenCountKey = 'user:' + socket.decoded_token.user_id + ':notify:unseen-count';//user:123:notify:unseen-count
        sub.subscribe(channelName);

        sub.on('message', function (channel, message) {
            if (channel == channelName) {
                pub.get(unseenCountKey, function (err, count) {
                    notifyNsp.to(id).emit('unseen_count', count);
                });
            }
        });
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


