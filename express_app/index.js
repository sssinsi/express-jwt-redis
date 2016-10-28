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



//var ioe = require('socket.io-emitter')({host:process.env.DB_PORT_6379_TCP_ADDR, port:process.env.DB_PORT_6379_TCP_PORT});
//io.adapter(ioRedis({host:redisHost, port:redisPort}));
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

var chatNsp = io.of('/chat');
var notifyNsp = io.of('/notify');

chatNsp
    .on('connection', ioJwt.authorize({
        secret: jwtSecret,
        timeout: 15000 //15 seconds to send the authentication message
    }))
    .on('authenticated', function (socket) {
        var id = socket.id;//投稿者(接続者)のid
        var myName = socket.decoded_token.user_name;
        var personalMessage = "あなたは、"+myName+"さんとして入室しました。";
        chatNsp.to(id).emit('server_to_client', {value : personalMessage});

        var roomName = 'some_room';
        socket.join(roomName);

        var channelName = chatNsp.name +':'+ roomName + ':user_' + socket.decoded_token.user_id;
        sub.subscribe(channelName);

        socket.on('disconnect',function(){
            socket.to(roomName).broadcast.emit('receive', myName+'さんがログアウトしました。');
        });

        //send message except self
        socket.to(roomName).broadcast.emit('broadcast_message',myName+'さんがログインしました!!!!');

        //send message to all (include self)
        //socket.emit('greeting', {message: 'Hi!'}, function (data) {
        //});

        //sub.on("subscribe",function(channel,count){
        //    console.log("Subscribed to " + channel + ". Now subscribed to " + count + " channel(s).");
        //});

        sub.on('message',function(channel, message){
            if (channel == channelName) {
                var text = String.fromCharCode.apply("", new Uint16Array(message));
                //socket.emit('my_notify', text);//createClientを別にしたら無限ループにならなかった...?
                chatNsp.to(id).emit('my_notify',true);
            }

        });

        socket.on('msg', function (data) {
            pub.publish(channelName,data);
            //chatNsp.to(roomName).emit('receive', data);
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


