var express = require('express');
var fortune = require('./lib/fortune.js');
var formidable = require('formidable');
var exphbs = require('express-handlebars');
var bodyParser = require('body-parser')
var jqupload = require('jquery-file-upload-middleware');
var credentials = require('./credentials.js');
var carValidation = require('./lib/cartValidation.js');
var nodemailer = require('nodemailer');
var http = require('http');
var dataDir = __dirname + '/data';
var vacationPhotoDir = dataDir + '/vacation-photo';
fs.exitsSync(dataDir) || fs.mkdirSync(dataDir);
fs.exitsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);


var app = express();

function saveContestEntry(contestName, email, year, month, photoPath){
    // TODO.. this will come later
}

var mailTransport = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: credentials.gmail.user,
      pass: credentials.gmail.password,
    },
    secure:false,
    tls: {rejectUnauthorized: false},
    debug:true
  });

var hbs = exphbs.create({
  defaultLayout: 'main',
  helpers: {
    section: function(name, options){
      if(!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    }
  }
});

app.use(function(req, res, next){
  // create a domain for this request
  var domain = require('domain').create();
  // handle errors on this domain
  domain.on('error', function(err){
    console.error('DOMAIN ERROR CAUGHT\n', err.stack);
    try {
      // failsafe shutdown in 5 seconds
      setTimeout(function(){
        console.error('Failsafe shutdown');
        process.exit(1);
      }, 5000);

      // disconnect from the CLUSTER
      var worker = require('cluster').worker;
      if(worker) worker.disconnect();

      // stop taking new requests
      server.close();

      try {
        //attemp to use Express error route
        next(err);
      } catch(err){
        //if express error route failed, try {
        //plain Node response
        console.error('Express error mechanism failed/n', err.stack);
        res.statusCode = 500;
        res.setHeader('content-type', 'text/plain');
        res.end('Server error.');

      }
    } catch(err){
      console.error('Unable to send 500 response.\n', err.stack);
    }
  });

  // add the request and response objects to the domain
  domain.add(req);
  domain.add(res);

  // execute the rest of the request chain in the domain
  domain.run(next);
});

// other middleware and routes go here

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Listen on port %d', app.get('port'));
});


app.engine('handlebars', hbs.engine);

app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next){
  res.locals.showTests = app.get('env') !== 'production' &&
      req.query.test === 1;
  next();
});

app.use(bodyParser.urlencoded());

app.use(bodyParser.json());

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')());

app.use(function(req, res, next){
  // if there's a flash message, transfer
  // it to the context, then clear it
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.use('/upload', function(req, res, next){
  var now = Date.now();
  jqupload.fileHandler({
    uploadDir: function(){
      return __dirname + '/public/uploads' + now;
    },
    uploadUrl: function(){
      return '/uploads' + now;
    },
  })(req,res,next);
});

// routes
app.get('/', function(req, res){
  res.render('home');
});
app.get('/about', function(req,res){
  res.render('about', {fortune: fortune.getFortune(),
                       pageTestScript: '/qa/tests-about.js'
                     } );
});

app.get('/newsletter', function(req, res){
  res.render('newsletter', {csrf: "CSRF toekn goes here"})
});

app.post('/process', function(req, res){
  if(req.xhr || req.accepts('json,html')==='json'){
    //if there were an error, we would send { error: 'error description' }
    res.send({success: true});
  } else {
    res.redirect(303, '/thank-you');
  }
});

app.get('/contest/vacation-photo', function(req,res){
  var now = new Date();
  res.render('contest/vacation-photo',{
    year: now.getFullYear(), month: now.getMonth()
  });
});

app.post('/contest/vacation-photo/:year/:month', function(req,res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files){
    if(err) return res.redirect(303, '/error');
    if(err) {
      res.session.flash = {
        type: 'danger',
        intro: 'Oops!',
        message: 'There was an error processing your submission. ' +
                  'Please try again'
      };
      return res.redirect(303, '/contest/vacation-photo');
    }
    var photo = files.photo;
    var dir = vacationPhotoDir + '/' + Date.now();
    var path = dir + '/' + photo.name;
    fs.mkdirSync(dir);
    fs.renameSync(photo.path, dir + '/' + photo.name);
    saveContestEntry('vacation-photo', fields.email,
                      req.params.year, req.params.month.path);
    req.session.flash = {
      type: 'success';
      intro: 'Good Luck!',
      message: 'You have been entered into the contest.',
    };
    return res.redirect(303, '/contest/vacation-photo/entries');
  });
});

app.post('/newsletter', function(req, res){
  var name = req.body.name || '', email = req.body.email || '';
  //input validation
  if(!email.match(VALID_EMAIL_REGEX)) {
    if(req.xhr) return res.json({ error: 'Invalid name email address.'});
    req.session.flash = {
      type: 'danger',
      intro: 'Validation error!',
      message: 'The email address you entered was not valid.',
    };
    return res.redirect(303, '/newsletter/archive');
  }

app.get('/fail', function(req,res){
  throw new Error('Nope!');
});

app.get('epic-fail', function(req,res){
  process.nextTick(function(){
    throw new Error('Kaboom');
  });
});

  new NewsletterSignup({name: name, email: email}).save(function(err){
    if(err) {
      if(req.xhr) return res.json({error: 'Database error.'});
      req.session.flash = {
        type: 'danger',
        intro: "Database error!",
        message: 'There was a database error; please try again later',
      }
      return res.redirect(303, '/newsletter/archive');
    }
    if(req.xhr) return res.json({ success: true});
    req.session.flash = {
      type: 'success',
      intro: 'Thank You!',
      message: 'You have now been signed up for the newsletter.',
    };
    return res.redirect(303, '/newsletter/archive');
  });
});

app.post('/cart/checkout', function(req, res){
    var cart = req.session.cart;
    if(!cart) next(new Error('Cart does not exist.'));
    var name = req.body.name || '', email = req.body.email || ''; // input validation
    if(!email.match(VALID_EMAIL_REGEX))
    return res.next(new Error('Invalid email address.'));
// assign a random cart ID; normally we would use a database ID here
    cart.number = Math.random().toString().replace(/^0\.0*/, '');
    cart.billing = {
                    name: name,
                    email: email,
            };
  res.render('email/cart-thank-you',
        { layout: null, cart: cart }, function(err,html){
        if( err ) console.log('error in email template'); mailTransport.sendMail({
                                from: '"Meadowlark Travel": info@meadowlarktravel.com',
                                to: cart.billing.email,
                                subject: 'Thank You for Book your Trip with Meadowlark',
                                html: html,
                                generateTextFromHtml: true
                              }, function(err){
        if(err) console.error('Unable to send confirmation: ' + err.stack);
        });
      }
    );
        res.render('cart-thank-you', { cart: cart });
  });

switch(app.get('env')){
  case 'development':
    //compact, colorful dev logging
    app.use(require('morgan')('dev'));
    break;
  case 'production':
     // module 'express-logger' supports daily log rotation
     app.use(require('express-logger')({
        path: __dirname + '/log/requests.log'
     }));
     break;
}

//custom 404 page
app.use(function(req, res){
  res.type('text/plain');
  res.status(404);
  res.render('404');
});

//custom 500 page
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

function startServer(){
  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express started in ' + app.get('env') + ' mode on http://localhost:' +
                app.get('port') + '; press ctrl-c to terminate');
  });
}
if(require.main === module){
  //application run directly; start app server
  startServer();
} else {
  // application imported as a module via "require": export function // to create server
  module.exports = startServer;
}
