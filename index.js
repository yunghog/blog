var express = require('express');
var app = express();
const session = require('express-session');
var bodyParser = require('body-parser');
var multer  = require('multer');
var router = express.Router();
var nodemailer = require('nodemailer');
var dateFormat = require('dateformat');
var now = new Date();
var sensitive=require('./sensitive');
var dbURL = sensitive.password.mongo;
// var dbURL = "mongodb://127.0.0.1:27017";
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
    user: sensitive.mailid.gmail,
    pass: sensitive.password.gmail
  }
});
var path = __dirname + '/views/';
app.use(express.static(__dirname + '/views'));
app.set('views', [__dirname+'/views/admin/',__dirname+'/views'])
app.use(session({
  secret: 'login form',
  resave: true,
  saveUninitialized: true
}));
router.get('/',function(req, res){
  MongoClient.connect(dbURL, {useUnifiedTopology: true}, (err, client) => {
    if (err) return console.error(err);
    const db = client.db('creedthoughts');
    const blogs = db.collection('blogs');
    var mysort={_id:-1};
    blogs.find({active: 1}).sort(mysort).toArray()
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
    MongoClient.connect(dbURL, {useUnifiedTopology: true}, (err, client) => {
      if (err) return console.error(err);
      console.log('Connected to Database');
      const db = client.db('creedthoughts');
      const subsCollection = db.collection('subscribers');
      subsCollection.insert({"email":req.body.email});
    });
   res.redirect('/subscription');
});
app.post('/auth', urlencodedParser,(req, res)=>{
  username=req.body.username;
  password=req.body.password;
  MongoClient.connect(dbURL, {useUnifiedTopology: true}, (err, client)=>{
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
    MongoClient.connect(dbURL, {useUnifiedTopology: true}, (err, client)=>{
      if(err) return console.error(err);
      const db = client.db('creedthoughts');
      const topic = db.collection('topics');
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
       author: req.session.user.name,
       active: 1,
       video: req.body.video
     };
     console.log(data);
      MongoClient.connect(dbURL, {useUnifiedTopology: true}, (err, client) => {
        if (err) return console.error(err);
        console.log('Connected to Database');
        const db = client.db('creedthoughts');
        const blogs = db.collection('blogs');
        blogs.insertOne(data);
      });
     res.redirect('/admin/create_post');
});
app.get('/admin/view_posts', function(req, res) {
	if (req.session.loggedin) {
    MongoClient.connect(dbURL, {useUnifiedTopology: true}, (err, client)=>{
      if(err) return console.error(err);
      const db = client.db('creedthoughts');
      const blogs = db.collection('blogs');
      blogs.find({active:1}).toArray(function(err, blogs_result) {
      if (err) throw err;
        db.collection('topics').find().toArray(function(err, topic_result){
          vars_json={
            blog: blogs_result,
            topic: topic_result
          };
          console.log(vars_json);
          res.render('view_posts.ejs', {loggedin: true, user: req.session.user, vars:vars_json});
        })
    });
    })
	} else {
    res.render('view_posts.ejs', {loggedin: false});
	}
});
app.get('/blog',function(req, res){
    MongoClient.connect(dbURL, {useUnifiedTopology: true}, (err, client) => {
      if (err) return console.error(err);
      const db = client.db('creedthoughts');
      const blogs = db.collection('blogs');
      var mysort={_id:-1};
      var query ={active: 1};
      if(req.query.topic!=null){
        query={topic:req.query.topic,
        active: 1};
      }
      blogs.find(query).sort(mysort).toArray()
      .then(results=>{
        console.log(results);
        res.render('blog.ejs',{articles:results, query: req.query})
      })
    });
});
app.get('/blog/:heading',function(req, res){
      MongoClient.connect(dbURL, {useUnifiedTopology: true}, (err, client) => {
      if (err) return console.error(err);
      const db = client.db('creedthoughts');
      const blogs = db.collection('blogs');
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
app.post('/sendMail', urlencodedParser, function(req,res){
     response = {name:req.body.name,
                 email:req.body.email,
                 subject:req.body.subject,
                 email_body:req.body.query};
     var mail = "Hello Samartha you have a mail from " + response.name +" (" + response.email + ") regarding Creed Thoughts\n\nSubject : "+response.subject+"\nQuery : "+response.email_body+"\n\nHave a good day" ;
     mailOptions={
       from: 'Creed Thoughts',
       to: 'samarthahm@gmail.com',
       subject: 'Query from Creed Thoughts',
       text: mail};
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
     res.redirect('/contact');
});
app.post('/admin/edit_post',urlencodedParser, function(req, res) {
	if (req.session.loggedin) {
    MongoClient.connect(dbURL, {useUnifiedTopology: true}, (err, client)=>{
      if(err) return console.error(err);
      const db = client.db('creedthoughts');
      const topic = db.collection('topics');
      topic.find().toArray(function(err, topic_result) {
      if (err) throw err;
      const blogs = db.collection('blogs');
      var query = {heading: req.body.edit_heading};
      blogs.find(query).toArray(function(err, blog_result){
        vars_json={
          topics: topic_result,
          blog_post: blog_result
        };
        res.render('edit_post.ejs', {loggedin: true, user: req.session.user, vars:vars_json});
      })
    });
    })
	} else {
    res.render('edit_post.ejs', {loggedin: false});
	}
});
app.post('/update_post',upload.single('edit_blog_image'), function(req, res) {
	if (req.session.loggedin) {
    var query = {heading: req.body.edit_heading};
    if(req.file){
      if(req.body.link){
      var new_values = {$set:{
        heading: req.body.edit_heading,
        body: req.body.edit_body,
        topic: req.body.edit_topic,
        image: req.file.filename,
        link: req.body.link
      }};
    }
    else{
      var new_values = {$set:{
        heading: req.body.edit_heading,
        body: req.body.edit_body,
        topic: req.body.edit_topic,
        image: req.file.filename,
      }};
    }
    }
    else{
        if(req.body.link){
        var new_values = {$set:{
          heading: req.body.edit_heading,
          body: req.body.edit_body,
          topic: req.body.edit_topic,
          link: req.body.link
        }};
      }
      else{
        var new_values = {$set:{
          heading: req.body.edit_heading,
          body: req.body.edit_body,
          topic: req.body.edit_topic,
        }};
      }
    }
    console.log(new_values);
    MongoClient.connect(dbURL, {useUnifiedTopology: true}, (err, client)=>{
      if(err) return console.error(err);
      const db = client.db('creedthoughts');
      const blogs = db.collection('blogs');
      blogs.updateOne(query, new_values, function(err,res){
        if (err) throw err;
        console.log("1 document updated");
      });
    });
    res.redirect('/admin/view_posts');
  }
});
app.post('/delete_post', urlencodedParser, function(req, res) {
	if (req.session.loggedin) {
    var query = {heading: req.body.delete_heading};
      var new_values = {$set:{
        active: 0
      }};
    console.log(new_values);
    MongoClient.connect(dbURL, {useUnifiedTopology: true}, (err, client)=>{
      if(err) return console.error(err);
      const db = client.db('creedthoughts');
      const blogs = db.collection('blogs');
      blogs.updateOne(query, new_values, function(err,res){
        if (err) throw err;
        console.log("1 document deleted");
      });
    });
    res.redirect('/admin/view_posts');
  }
});
app.listen(process.env.PORT || 3030,
	() => console.log("Server is running..."));
