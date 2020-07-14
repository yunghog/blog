var express = require('express');
var app = express();
const session = require('express-session');
var bodyParser = require('body-parser');
var router = express.Router();
var nodemailer = require('nodemailer');
app.set('view engine', 'ejs')
var MongoClient = require('mongodb').MongoClient;

var urlencodedParser = bodyParser.urlencoded({ extended: false })
var transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: 'creedthoughts66@gmail.com',
    pass: '#yungh0gbeat5'
  }
});
var path = __dirname + '/views/';
app.use('/',router);
app.use(express.static(__dirname + '/views'));
app.use(session({
  resave: true,
  saveUninitialized: true
}));
router.get('/',function(req, res){
  MongoClient.connect('mongodb://127.0.0.1:27017', {useUnifiedTopology: true}, (err, client) => {
    if (err) return console.error(err);
    const db = client.db('creedthoughts');
    const subsCollection = db.collection('subscribers');
    subsCollection.find().toArray()
    .then(results=>{
      res.render('index.ejs',{subs:results})
    })
  });
});
router.get('/subscription',function(req, res){
  res.sendFile(path + 'subscription.html');
});
router.get('/login',function(req, res){
  res.render('login.ejs',{alert:0,msg:''});
});
router.get('/about',function(req, res){
  res.sendFile(path + 'about.html');
});
router.get('/contact',function(req, res){
  res.sendFile(path + 'contact.html');
});
router.get('/admin',function(req, res){
  var username=req.session.var;
  res.render('admin.ejs',{user:username});
});
app.post('/mailingList', urlencodedParser,(req, res) => {
   response = {email:req.body.email};
   mailOptions={
     from: 'Creed Thoughts',
     to: req.body.email,
     subject: 'Subscription to Creed Thoughts',
     text: 'You hace successfully subscribed to Creed Thoughts'};
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
    MongoClient.connect('mongodb://127.0.0.1:27017', {useUnifiedTopology: true}, (err, client) => {
      if (err) return console.error(err);
      console.log('Connected to Database');
      const db = client.db('creedthoughts');
      const subsCollection = db.collection('subscribers');
      subsCollection.count({},(err,n)=>{
        n=n+1;
        subsCollection.insert({"_id":n ,"email":req.body.email});
      });
    });
   res.redirect('/subscription');
});
app.post('/auth', urlencodedParser,(req, res)=>{
  username=req.body.username;
  password=req.body.password;
  MongoClient.connect('mongodb://127.0.0.1:27017', {useUnifiedTopology: true}, (err, client)=>{
    if(err) return console.error(err);
    const db = client.db('creedthoughts');
    const admin = db.collection('admin');
    var query = { "username": username, "password": password };
    admin.find(query).count(function(err, result) {
    if (err) throw err;
    if(result==1){
      // window.alert('Login Success');
      req.session.var=username;
      res.redirect('/admin');
    }
    else {
      // window.alert('Invalid Credentials');
      res.render('login.ejs', {alert:1, msg:'Invalid Credentials'});
    }
  });
  })

});
app.listen(3030, function () {
console.log('Example app listening on port 3030!');
});
