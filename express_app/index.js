var express = require("express");
var config = require('./config');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');

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
    res.send('Hello World!')
});

//create token
apiRoutes.get('/authenticate', function (req, res) {
    var token = jwt.sign({user_id: 123}, jwtSecret, {
        expiresIn: '24h'
    });

    res.json({
        message: 'Authentication success.',
        token: token
    });
});

//Authentification Filter
apiRoutes.use(function (req, res, next) {
    // get token from body:token or query:token of Http Header:x-access-token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

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

//get user notify
apiRoutes.get('/notify', function(req,res){

});


