var express = require('express');
var app = express();
const session = require('express-session');
var bodyParser = require('body-parser');
var multer  = require('multer');
var router = express.Router();
var nodemailer = require('nodemailer');
var dateFormat = require('dateformat');
var now = new Date();
app.set('view engine', 'ejs')
var MongoClient = require('mongodb').MongoClient;
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload an image.', 400), false);
  }
};
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './views/images/posts')
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split('/')[1];
    const uniqueSuffix = Date.now() +'.'+  ext;
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
})

var upload = multer({ storage: storage, fileFilter: multerFilter})

var urlencodedParser = bodyParser.urlencoded({ extended: true })
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
app.set('views', [__dirname+'/views/admin/',__dirname+'/views'])
app.use(session({
  secret: 'login form',
  resave: true,
  saveUninitialized: true
}));
router.get('/',function(req, res){
  MongoClient.connect('mongodb://127.0.0.1:27017', {useUnifiedTopology: true}, (err, client) => {
    if (err) return console.error(err);
    const db = client.db('creedthoughts');
    const blogs = db.collection('blog');
    var mysort={_id:-1};
    blogs.find().sort(mysort).toArray()
    .then(results=>{
      console.log(results);
      res.render('index.ejs',{articles:results})
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
      admin.find(query).toArray(function(err, user){
        // console.log(user[0].username);
        user_json={username:user[0].username, name:user[0].name}
        req.session.user=user_json;
        req.session.loggedin=true;
        res.redirect('/admin');
      });

    }
    else {
      // window.alert('Invalid Credentials');
      res.redirect('/login');
    }
  });
  })
});
app.get('/admin', function(req, res) {
	if (req.session.loggedin) {
		res.render('admin/admin.ejs', {loggedin: true, user: req.session.user});
	} else {
    res.render('admin/admin.ejs', {loggedin: false});
	}
});
app.get('/admin/create_post', function(req, res) {
	if (req.session.loggedin) {
    MongoClient.connect('mongodb://127.0.0.1:27017', {useUnifiedTopology: true}, (err, client)=>{
      if(err) return console.error(err);
      const db = client.db('creedthoughts');
      const topic = db.collection('topic');
      topic.find().toArray(function(err, topic_result) {
      if (err) throw err;
        vars_json={
          topics: topic_result
        };
        res.render('create_post.ejs', {loggedin: true, user: req.session.user, vars:vars_json});
    });
    })
	} else {
    res.render('create_post.ejs', {loggedin: false});
	}
});
app.post('/insert_post',upload.single('blog_image'),(req,res)=>{
    // console.log(req.file, req.body);
    date=dateFormat(now, "mmmm,dS");
     data = {
       heading:req.body.heading,
       body: req.body.body,
       topic: req.body.topic,
       date: date,
       image: req.file.filename,
       link: req.body.link,
       author: req.session.user.name
     };
     console.log(data);
      MongoClient.connect('mongodb://127.0.0.1:27017', {useUnifiedTopology: true}, (err, client) => {
        if (err) return console.error(err);
        console.log('Connected to Database');
        const db = client.db('creedthoughts');
        const blogs = db.collection('blog');
        blogs.insertOne(data);
      });
     res.redirect('/admin/create_post');
});
app.get('/blog',function(req, res){
    MongoClient.connect('mongodb://127.0.0.1:27017', {useUnifiedTopology: true}, (err, client) => {
      if (err) return console.error(err);
      const db = client.db('creedthoughts');
      const blogs = db.collection('blog');
      var mysort={_id:-1};
      var query ={};
      if(req.query.topic!=null){
        query={topic:req.query.topic};
      }
      blogs.find(query).sort(mysort).toArray()
      .then(results=>{
        console.log(results);
        res.render('blog.ejs',{articles:results})
      })
    });
});
app.get('/blog/:heading',function(req, res){
      MongoClient.connect('mongodb://127.0.0.1:27017', {useUnifiedTopology: true}, (err, client) => {
      if (err) return console.error(err);
      const db = client.db('creedthoughts');
      const blogs = db.collection('blog');
      var mysort={_id:-1};
      var query ={heading: req.params.heading};
      blogs.find(query).sort(mysort).toArray()
      .then(results=>{
        var recent_topic = results[0].topic;
        blogs.find({topic:recent_topic,heading: {$ne: req.params.heading}}).sort(mysort).toArray().then(recents=>{
          res.render('blog-single.ejs',{articles:results, recents:recents});
        })
      });
    });
});
app.post('/logout',function(req,res){
  req.session.loggedin=false;
  res.redirect('/login');
});
app.listen(3030, function () {
console.log('Example app listening on port 3030!');
});
