var express = require('express');
var fortune = require('./lib/fortune.js');

var app = express();

var handlebars = require('express3-handlebars')
  .create({defaultLayout: 'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next){
  res.locals.showTests = app.get('env') !== 'production' &&
      req.query.test === 1;
  next();
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

var fortunes = [
  "Conquer your fears or they will conquer you.", "Rivers need springs.",
"Do not fear what you don't know.",
"You will have a pleasant surprise.", "Whenever possible, keep it simple.",
];
