'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;

//////////TTTT///////////
var videoEl = null;
var canvas;
var canvas1;
var context;
var context1;
var vendorUrl;

window.onload = function (){

  canvas = document.getElementById('canvas');
  console.log(canvas);
  context = canvas.getContext('2d'),

  canvas1 = document.getElementById('canvas1');
  console.log(canvas1);
  context1 = canvas1.getContext('2d'),
  
  //video = document.getElementById('video'),
  vendorUrl = window.URL || window.webkitURL;

  canvas.style.display="none";
  canvas1.style.display="none";
}
////////////////////////////

var pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

var room = 'foo';
// Could prompt for room name:
room = prompt('Enter room name:');

var socket = io.connect();

if (room !== '') {
  socket.emit('create or join', room);
  console.log('Attempted to create or  join room', room);
}

socket.on('created', function(room) {
  console.log('Created room ' + room);
  isInitiator = true;
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('joined', function(room) {
  console.log('joined: ' + room);
  isChannelReady = true;
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

// This client receives a message
socket.on('message', function(message) {
  console.log('Client received message:', message);
  if (message === 'got user media') {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

navigator.mediaDevices.getUserMedia({
  audio: false,
  video: true
})
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});

function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  localVideo.play();
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}

localVideo.addEventListener('play', function(){	
  console.log('play');				
  draw(this, context, 400,300);
}, false);


function draw (video, context, width, height){
				
  var image, data, i, r, g, b, brightness;

  context.drawImage(video, 0, 0, width, height);
  
  image = context.getImageData(0,0, width, height);
  data = image.data;
  
  /*let size  = data.length-16000;
  for(i = 0; i < data.length; i = i+4){
    r = data[i];
    g = data[i + 1];
    b = data[i + 2];
    brightness  = (r+g+b)/3;
    //if (i < size)
      data[i] = data[i+1] = data[i+2] = brightness;
    //else
    //{
    //	data[i] = 255 ; data[i+1] = 0 ; data[i+2] = 0;
    //}
  }
        */    
  /************************ Created new image for contex1(canvas1)**************************/
  
  var imgData = context1.createImageData(width, height + 100);

  for (i = 0; i < data.length; i += 4) {
    imgData.data[i] = data[i];
    imgData.data[i+1] = data[i+1];
    imgData.data[i+2] = data[i+2];
    imgData.data[i+3] = data[i+3];
  }
  
  for (i = data.length; i < data.length + 160000; i += 4) {
    imgData.data[i] = 255;
    imgData.data[i+1] = 0;
    imgData.data[i+2] = 0;
    imgData.data[i+3] = 255;
  }
  
  //image.data = imgData.data;
  
  context1.putImageData(imgData, 0,0);
  
  /************************************************************************/
  
  //context.putImageData(image, 0, 0, width / 2, 00, width, height+100);
  //context.putImageData(image, width, height+100);
  
  setTimeout(draw, 0, video, context, width, height);
}


var constraints = {
  video: true
};

console.log('Getting user media with constraints', constraints);

if (location.hostname !== 'localhost') {
  requestTurn(
    'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
  );
}

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(/*localStream*/canvas1.captureStream(50));
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function requestTurn(turnURL) {
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added...');
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
  videoEl = event.stream;
  videoEl.addEventListener('play', initCanvas, false);
  videoEl.addEventListener('loadeddata', drawFrame, false);
  videoEl.addEventListener('ended', onEnd, false);
}

function initCanvas(e){
    console.log('**** init Canvas ****');
}

function drawFrame(e){
  console.log('**** drawFrame Canvas ****');
}

function onEnd(e){
  console.log('**** drawFrame Canvas ****');
}


function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}
