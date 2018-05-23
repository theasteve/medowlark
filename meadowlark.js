var express = require('express');
var fortune = require('./lib/fortune.js');
var formidable = require('formidable');
var exphbs = require('express-handlebars');
var bodyParser = require('body-parser')

var app = express();

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
    if(err) return res.redirect(303, '/error')
    console.log('received fields:');
    console.log(fields);
    console.log("received files:");
    console.log(files);
    res.redirect(303, '/thank-you')
  });
});

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

app.listen(app.get('port'), function(){
  console.log('Express started on http://localhost' +
    app.get('port') + '; press ctrl-C to terminate');
});
