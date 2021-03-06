var HTTP = require('http');
var URL  = require('url');
var QS   = require('querystring');
var FS   = require('fs');
var MIME = require('mime');

HTTP.createServer(function(request, response) {

  var MODEL = {
    find: function (question, action) {
      FS.readFile('bbdd.txt', 'utf-8', function(err, bbdd) {
        action(err, bbdd.match(new RegExp('^'+question+': .*$','m')));
      });
    },

    all_questions: function (action) {
      FS.readFile('bbdd.txt', 'utf-8', function(err, bbdd) {
        action(err, bbdd.replace(/^(.*): .*$/mg, '<option>$1</option>'));
      });
    },

    create: function (question, action) {
      FS.appendFile('bbdd.txt', question+'\n', 'utf-8', function(err){
        action(err);
      });
    }
  }


  var VIEW = {
    render: function (file, r1) {
      FS.readFile(file, 'utf-8', function(err, data) {
        if (!err) {
          var data = data.replace(/<%r1%>/, r1);
          response.writeHead(200, {
            'Content-Type': 'text/html', 
            'Content-Length': data.length 
          }); 
          response.end(data);
        } else { VIEW.error(500, "Server operation Error_r"); };
      });
    },

    error: function(code,msg) { response.writeHead(code); response.end(msg);},

    file: function(file) {
      FS.readFile(file, function(err, data) {
        if (!err) {
          response.writeHead(200, { 
            'Content-Type': MIME.lookup(file), 
            'Content-Length': data.length 
          }); 
          response.end(data);
        } else { VIEW.error (500, file + " not found"); };
      });
    }
  }


  var CONTROLLER = {
    index: function () { 
      MODEL.all_questions (function(err, all_questions) {
        if (!err) VIEW.render('index.html', all_questions);
        else      VIEW.error(500, "Server bbdd Error_a");
      });
    },

    show: function () { 
      MODEL.find(question, function(err, resp) {
        if (!err) VIEW.render('show.html',(resp||["Sin respuesta"])[0]);
        else      VIEW.error(500, "Server bbdd Error_b");
      });
    },

    file: function() { VIEW.file(url.pathname.slice(1)); },

    new: function () { VIEW.render ('new.html', ""); },

    create: function () {
      MODEL.create(question, function(err) {
        if (!err) CONTROLLER.index();  // redirección a 'GET quiz/index'
        else      VIEW.error(500, "Server bbdd Error_c");
      });
    }
  }


  var url       = URL.parse(request.url, true);
  var post_data = "";
  request.on('data', function (chunk) { post_data += chunk; });
  request.on('end', function() {

    post_data = QS.parse(post_data);

    // "question" variable global -> visible en controlador
    question  = (post_data.preg || url.query.preg);
    var route = request.method + ' ' + url.pathname;

    switch (route) {
      case 'GET /quiz/index'     : CONTROLLER.index()   ; break;
      case 'GET /quiz/show'      : CONTROLLER.show()    ; break;
      case 'GET /quiz/new'       : CONTROLLER.new()     ; break;
      case 'POST /quiz/create'   : CONTROLLER.create()  ; break;
      default: {
        if (request.method == 'GET') CONTROLLER.file() ;
        else VIEW.error(400, "Unsupported request");
      }
    }
  });
}).listen(3000);