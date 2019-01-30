'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const jsonfile = require('jsonfile');
const app = express();
const fs = require('fs');
const https = require('https');

Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const es6_promise_1 = require("es6-promise");
class OCR {
    constructor(apiKey, baseUrl = "https://sandbox.api.sap.com") {
        assert(apiKey, "apiKey is required");
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    ocr(files, options = null, asJobs = false) {
        return new es6_promise_1.Promise((resolve, reject) => {
            
            const request_ = request.defaults({ encoding: null });
            const this_ = this;

            request_.get(files, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    let formData;

                    formData = {
                        files: { value: body, options: 'dummy.jpg' }
                    };

                    const headers = {
                        APIKey: this_.apiKey,
                        Accept: "application/json",
                    };
                    const url = this_.baseUrl + "/ml/ocr/ocr" + (asJobs ? "/jobs" : "");
                    
                    request.post({ url, formData, headers }, (err, response, body) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(JSON.parse(body));
                    });

                }
            });
            

        });
    }
    jobs(files, options = null) {
        return this.ocr(files, options, true);
    }
    jobsId(id) {
        return new es6_promise_1.Promise((resolve, reject) => {
            const headers = {
                APIKey: this.apiKey,
                Accept: "application/json",
            };
            const url = this.baseUrl + "/ml/ocr/ocr/jobs/" + id;
            request.get({ url, headers }, (err, response, body) => {
                if (err) {
                    return reject(err);
                }
                resolve(JSON.parse(body));
            });
        });
    }
}
exports.OCR = OCR;

// set the SAP Leonardo OCR API Key
const ocr = new OCR("SAP_LEONARDO_TOKEN");
// set the Facebook Messenger Token
const token = "FACEBOOK_TOKEN"
// Set the Cloud Foundry OCR App URL with base authentication type
const ocrhost = "appnode-demo-xxxxtrial.cfapps.eu10.hana.ondemand.com";
const uid = "SAP_CLOUDFOUNDRY_ID";
const pwd = "SAP_CLOUDFOUNDRY_PASSWORD";

app.set('port', (process.env.PORT || 5000))
// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))
// Process application/json
app.use(bodyParser.json())
// Index route
app.get('/', function (req, res) {
	res.send('Hello world, I am a Facebook Messenger Receipt Scan Bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

function sendImageText(sender, element) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
         json: {
			recipient: { id: sender },
			message:{
				attachment: {
				  type: 'template',
				  payload: {
					  template_type: 'generic',
					  elements: element
				  }
				}
			}
		}
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function getProfile(id, cb){
	request({
      method: 'GET',
       uri: `https://graph.facebook.com/v2.6/${id}`,
      qs: _getQs({fields: 'first_name,last_name,profile_pic,locale,timezone,gender'}),
      json: true
    }, function(error, response, body) {
      if (error) return cb(error)
      if (body.error) return cb(body.error)

      cb(body)
    })
}

function _getQs (qs) {
    if (typeof qs === 'undefined') {
      qs = {}
    }
    qs['access_token'] = token

	return qs
}

function sendTextMessage(sender, text, cb) {
    let messageData = { text:text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
		cb();
    })
}

function sendImage(sender, imageURL, cb) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message:{
				attachment: {
					type: 'image',
					payload: {
						url: imageURL
					}
				}
			}
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
		cb();
    })
}

function senderAction (sender, payload) {
    request({
      method: 'POST',
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token: token},
      json: {
        recipient: { id: sender },
        sender_action: payload
      }
    }, function(error, response, body) {
      if (error) {
		console.log('Error sending messages: ', error)
      } else if (response.body.error) {
        console.log('Error: ', response.body.error)
      }
    })
}

function sendQuickReply (sender, text, title, payload) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: {
				text: text,
				quick_replies: [{
					content_type: 'text',
					title: title,
					payload: payload
			}]
		 }
		}
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var z = 0; z < 1e7; z++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function sendTextMessages(sender, text, i) {
    if (i < text.length) {
        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: token},
            method: 'POST',
            json: {
                recipient: {id:sender},
                message: {text:text[i]},
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else if (response.body.error) {
                console.log('Error: ', response.body.error)
            }
            sendTextMessages(sender, text, i+1)
			sleep(1000);
        })
    } else return
}

let SAPOCR = false;

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
		//console.log(event);

		if (event.postback) {
			let text = JSON.parse(JSON.stringify(event.postback));
			
			if(text.payload == 'USER_DEFINED_PAYLOAD') {

				let ArrayData = [];
				ArrayData.push({
					'title': 'Hi! My name is OCRBot 🐻. I can OCR your receipt image.',
					'subtitle': 'Choose one of the OCR option, using SAP Leonardo or Tesseract.',
					'buttons':[{
						'type':'postback',
						'title':'🧾 SAP Leonardo',
						'payload': 'SAP'
					},{
						'type':'postback',
						'title':'🧾 Tesseract',
						'payload': 'TSR'
					}]              
				});

				sendImageText(sender, ArrayData, (err) => {
					if (err) {console.log(err);	}
				})
				senderAction(sender, 'typing_off');
			}

			if(text.payload == 'SAP') {
				senderAction(sender, 'typing_on');
				sendTextMessage(sender, 'OCR using SAP Leonardo. Please send me your receipt image', function(returnValue) {
				});
				senderAction(sender, 'typing_off');
				SAPOCR = true;
			}

			if(text.payload == 'TSR') {
				senderAction(sender, 'typing_on');
				sendTextMessage(sender, 'OCR using Tesseract. Please send me your receipt', function(returnValue) {
				});
				senderAction(sender, 'typing_off');
				SAPOCR = false;
			}
		}


		if (event.message && event.message.hasOwnProperty('quick_reply')) {
			if(event.message.quick_reply.payload == 'SAP') {
				senderAction(sender, 'typing_on');
				sendTextMessage(sender, 'OCR using SAP Leonardo. Please send me your receipt image', function(returnValue) {
				});
				senderAction(sender, 'typing_off');
				SAPOCR = true; 
			}

			if(event.message.quick_reply.payload == 'TSR') {
				senderAction(sender, 'typing_on');
				sendTextMessage(sender, 'OCR using Tesseract. Please send me your receipt', function(returnValue) {
				});
				senderAction(sender, 'typing_off');
				SAPOCR = false; 
			}
		}

		//Sticker
		let sticker = false;
		if (event.message && event.message.sticker_id == '369239383222810') {
			sendTextMessage(sender, '👍', function(returnValue) {
			});
			sticker = true;
		}
		if (event.message && event.message.sticker_id == '369239343222814') {
			sendTextMessage(sender, '👍', function(returnValue) {
			});
			sticker = true;
		}
		if (event.message && event.message.sticker_id == '369239263222822' ) {
			sendTextMessage(sender, '👍', function(returnValue) {
			});
			sticker = true;
		}


		//Processing
		if (event.message && event.message.attachments) {
			if(event.message.attachments[0].type === "image"){
				let imageURL = event.message.attachments[0].payload.url;
				console.log(imageURL);

				/*
				//For local testing
				request('http://localhost:3000?url=' + imageURL, { json: true }, (err, res, body) => {
				  if (err) { return console.log(err); }
				  console.log(body);
				  sendTextMessage(sender, body.result.ocr, function(returnValue) {
				  })
				});
				*/

				if(SAPOCR) {
					//Using SAP Leonardo

					sendTextMessage(sender, "Processing OCR with SAP Leonardo. Please wait...", function(returnValue) {
					})

					ocr.ocr(imageURL)
					.then((body) => {
						    console.log(body);
						    sendTextMessage(sender, body.predictions[0], function(returnValue) {
					  		})
					})
					.catch((err) => { 
						console.error(err); 
					});

				} else {
					//Using Tesseract

					sendTextMessage(sender, "Processing OCR with Tesseract. Please wait...", function(returnValue) {
					})

					let options = {
					    host: ocrhost,
					    path: '/scan?url=' + imageURL,
					    headers: {
					        'Authorization': 'Basic ' + new Buffer(uid + ':' + pwd).toString('base64')
					    }
					};

					https.get(options, function(res) {
					    let body = "";
					    res.on('data', function(data) {
					        body += data;
					    });
					    res.on('end', function() {
					        //here we have the full response, html or json object				        
					        let ocrresult = JSON.parse(body);
					        console.log(ocrresult);

					        sendTextMessage(sender, ocrresult.result.ocr, function(returnValue) {
					  		})
					    })
					    res.on('error', function(e) {
					        console.log("Got error: " + e.message);
					    });
					});		
				}

			}
		}

    }
    res.sendStatus(200)
})

// Spin up the bot
app.listen(app.get('port'), function() {
    console.log('FB Messenger Bot is running on port', app.get('port'))
})
