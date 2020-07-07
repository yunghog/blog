var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var router = express.Router();
var nodemailer = require('nodemailer');

var urlencodedParser = bodyParser.urlencoded({ extended: false })
var transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: 'samarthahm@gmail.com',
    pass: 'wwe9481504454'
  }
});
var path = __dirname + '/views/';
app.use('/',router);
app.use(express.static(__dirname + '/views'));

router.get('/',function(req, res){
  res.sendFile(path + 'index.html');
});
router.get('/subscription',function(req, res){
  res.sendFile(path + 'subscription.html');
});
router.get('/about',function(req, res){
  res.sendFile(path + 'about.html');
});
app.post('/mailingList', urlencodedParser, function (req, res) {
   response = {
      email:req.body.email
   };
   mailOptions={
     from: 'Creed Thoughts',
     to: req.body.email,
  subject: 'Subscription to Creed Thoughts',
  text: 'You hace successfully subscribed to Creed Thoughts'
};
   transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});
   console.log(response);
   res.redirect('/subscription');
});
app.listen(3030, function () {
console.log('Example app listening on port 3030!');
});
