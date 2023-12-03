let liveswitchClient;
let liveswitchChannel;





const gatewayURL = "https://v1.liveswitch.fm:8443/sync";
const applicationId = "my-app-id";
const sharedSecret = "--replaceThisWithYourOwnSharedSecret--";
const channelId = "tic-tac-toe-check";



var gameActive = false;
var currentPlayer ="X";
let gameState = ["", "", "", "", "", "", "", "", ""];
var myJoinTime;
var notEngagedFrom;
var availableUser =[];
var winningPoints =0 ;
var currentOpponentId ;

const winningConditions = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];





const startButton = document.querySelector('.start');
const statusDisplay = document.querySelector('.status');
const turnStatus = document.querySelector('.turnstatus');
const winningMessage = () => `Player ${currentPlayer} has won!`;
const drawMessage = () => `Game ended in a draw!`;




//connect to liveswitch
let connectToLiveSwitchServer = function() {
  let promise = new fm.liveswitch.Promise();

  liveswitchClient = new fm.liveswitch.Client(gatewayURL, applicationId);
  let channelClaims = [new fm.liveswitch.ChannelClaim(channelId)];
  let token = fm.liveswitch.Token.generateClientRegisterToken(applicationId, liveswitchClient.getUserId(), liveswitchClient.getDeviceId(), liveswitchClient.getId(), null, channelClaims, sharedSecret);

  liveswitchClient.register(token).then((channels) => {
    liveswitchChannel = channels[0];
    promise.resolve(null);
  }).fail((ex) => {
    promise.reject(ex);
  });

  return promise;
}



//button click handling
let handleStartClick = function() {
    currentOpponentId = availableUser[0].myId;
    var timeFromNotPlayed = availableUser[0].notEngaged;
    var points = availableUser[0].winningPoints;
    var index =0;
    availableUser.forEach(element => {
        if(index>0 && timeFromNotPlayed==element.notEngaged){
            if(element.winningPoints>points){
                currentOpponentId = element.myId;
                timeFromNotPlayed = element.notEngaged;
                points = element.winningPoints;
            }
        }

        if(element.notEngaged<timeFromNotPlayed){
          currentOpponentId = element.myId;
          timeFromNotPlayed = element.notEngaged;
          points = element.winningPoints;
        }
        index++;
    });

    

    var count = 0;
    gameState.forEach(element => {
        var cellToFill = document.querySelector(`[data-cell-index="${count}"]`);
        cellToFill.innerHTML = element; 
        count++;
    });
    
    gameActive = true;
    startButton.style.display = "none";
    statusDisplay.innerHTML ="Game In Progress";
    
    liveswitchChannel.sendMessage(JSON.stringify({msg:`Started game with ${currentPlayer}`,opponentId:currentOpponentId}));
    liveswitchChannel.sendMessage("I am engaged");
    turnStatus.innerHTML = "Turn Status: Your turn";
    
}



//cell click handling
let handleCellClick = function(clickedCellEvent) {
  if(turnStatus.innerHTML == "Turn Status: Your turn"){
    var clickedCell = clickedCellEvent.target;
    console.log(1);
  var clickedCellIndex = parseInt(
    clickedCell.getAttribute('data-cell-index'));
  
  handleCellPlayed(clickedCell, clickedCellIndex);
  handleResultValidation();
}
}

let handleCellPlayed = function(clickedCell, clickedCellIndex) {
    gameState[clickedCellIndex] = currentPlayer;
    console.log(currentPlayer);
    clickedCell.innerHTML = currentPlayer;
    turnStatus.innerHTML = "Turn Status: Your opponent turn";
    liveswitchChannel.sendMessage(`${currentPlayer} played in cell ${clickedCellIndex}`);
}

let handleResultValidation = function() {
  let roundWon = false;
  for (let i = 0; i <= 7; i++) {
    const winCondition = winningConditions[i];
    let a = gameState[winCondition[0]];
    let b = gameState[winCondition[1]];
    let c = gameState[winCondition[2]];
    if (a === '' || b === '' || c === '') {
      continue;
    }
    if (a === b && b === c) {
      roundWon = true;
      break
    }
  }
  if (roundWon) {
    var messageWin = "You won!";
    statusDisplay.innerHTML = messageWin;
    gameActive = false;
    winningPoints +=1;
    notEngagedFrom = new Date().getTime();
    liveswitchChannel.sendMessage(winningMessage());
    startButton.style.display = "";
    
    liveswitchChannel.sendMessage("Are you available?");
    setTimeout(function() {
        if(availableUser.length>0){
            startButton.disabled = false;
            
        }
      }, 3000);
      gameState = ["", "", "", "", "", "", "", "", ""];
      liveswitchChannel.sendMessage(JSON.stringify({myId:liveswitchClient.getId(),myStatus:"available",joinTime:myJoinTime,notEngaged:notEngagedFrom,score:winningPoints}));
      liveswitchChannel.sendMessage("Game over");
    return;
  }

  let roundDraw = !gameState.includes("");
  if (roundDraw) {
    var messageDraw = drawMessage();
    statusDisplay.innerHTML = messageDraw;
    gameActive = false;
    notEngagedFrom = new Date().getTime();
    liveswitchChannel.sendMessage(messageDraw);
    startButton.style.display = "";
    
    liveswitchChannel.sendMessage("Are you available?");
    setTimeout(function() {
        if(availableUser.length>0){
            startButton.disabled = false;
            
        }
      }, 3000);
      gameState = ["", "", "", "", "", "", "", "", ""];
      liveswitchChannel.sendMessage(JSON.stringify({myId:liveswitchClient.getId(),myStatus:"available",joinTime:myJoinTime,notEngaged:notEngagedFrom,score:winningPoints}));
      liveswitchChannel.sendMessage("Game over");
      return;
  }

 
}



fm.liveswitch.Log.registerProvider(new fm.liveswitch.ConsoleLogProvider(fm.liveswitch.LogLevel.Debug));


//button click handling
startButton.addEventListener('click', handleStartClick);
document.querySelectorAll('.cell').forEach(cell => cell.addEventListener('click', handleCellClick));



connectToLiveSwitchServer().then(() => {
  fm.liveswitch.Log.debug("Connected to server");
  myJoinTime = new Date().getTime();
  notEngagedFrom = new Date().getTime();
   
  liveswitchChannel.addOnRemoteClientJoin((remoteClientInfo) => {
    console.log(remoteClientInfo.getId());
    liveswitchChannel.sendMessage("Are you available?");
    setTimeout(function() {
        if(!gameActive && availableUser.length>0){
            startButton.disabled = false;
            statusDisplay.innerHTML ="If you want to play start the game";
        }
      }, 3000);
  });

  liveswitchChannel.addOnRemoteClientLeave((remoteClientInfo) => {
    if (!gameActive) {
        let index = availableUser.findIndex(element=>element.myId==remoteClientInfo.getId());
          if(index!=null){availableUser.splice(index,1);}
          if(availableUser.length==0){
            startButton.disabled = true;
            statusDisplay.innerHTML ="No opponent available to play with you!";
        }
      }
      else if(gameActive){
       
        let index = availableUser.findIndex(element=>element.myId==remoteClientInfo.getId());
        if(index!=null){availableUser.splice(index,1);
        }
        
        if(currentOpponentId == remoteClientInfo.getId()){
          statusDisplay.innerHTML ="Your opponent leave in the middle of the game!";
          gameActive = false;
        notEngagedFrom = new Date().getTime();
        startButton.style.display = "";
        startButton.disabled = true;
        gameState = ["", "", "", "", "", "", "", "", ""];
        liveswitchChannel.sendMessage(JSON.stringify({myId:liveswitchClient.getId(),myStatus:"available",joinTime:myJoinTime,notEngaged:notEngagedFrom,score:winningPoints}));
      
      liveswitchChannel.sendMessage("Are you available?");
      setTimeout(function() {
          if(availableUser.length>0){
              startButton.disabled = false;
              
          }
        }, 3000);
        
        
        }
      }
  });

  liveswitchChannel.addOnMessage(function (sender, message) {
    if (sender.getId() == liveswitchClient.getId()) {
      // ignore self
      return;
    }

    if(message=="Are you available?"){
        if(!gameActive){
         var info = {myId:liveswitchClient.getId(),myStatus:"available",joinTime:myJoinTime,notEngaged:notEngagedFrom,score:winningPoints};
            liveswitchChannel.sendMessage(JSON.stringify(info));
        }
        
    }

    
    if(message.includes("myStatus") && message.includes("available")){
      var match = false;
      availableUser.forEach(element => {
        if(element.myId==sender.getId()){
          match = true;
        }
      });

        if(!match){
          availableUser.push(JSON.parse(message));
        }
    }

    if(message=="I am engaged"){
        let index = availableUser.findIndex(element=>element.myId==sender.getId());
        if(index!=null){availableUser.splice(index,1);}

        if(!gameActive){
            if(availableUser.length == 0){
                startButton.disabled = true;
            statusDisplay.innerHTML = "No opponent available to play with you!";

          }
        }
    }

    if(message.includes("Started game with")){
        if(JSON.parse(message).opponentId == liveswitchClient.getId()){
            currentOpponentId = sender.getId();
          gameActive = true;
          var count = 0;
    gameState.forEach(element => {
        var cellToFill = document.querySelector(`[data-cell-index="${count}"]`);
        cellToFill.innerHTML = element; 
        count++;
    });
        startButton.style.display = "none";
        statusDisplay.innerHTML ="Game In Progress";
        turnStatus.innerHTML ="Turn Status: Your opponent turn";
        
        currentPlayer = JSON.parse(message).msg[JSON.parse(message).msg.length-1]=="X"?"O":"X";
        liveswitchChannel.sendMessage("I am engaged");}
    }

    if(message.includes("played in cell")){
        if(currentOpponentId == sender.getId()){
        gameState[parseInt(message[message.length-1])] = message[0];
        var element = document.querySelector(`[data-cell-index="${message[message.length-1]}"]`);
        element.innerHTML = message[0];
        turnStatus.innerHTML = "Turn Status: Your turn";
    }
    }


    if(message.includes("has won!")){
        if(currentOpponentId == sender.getId()){
        var message = "You lost!";
        statusDisplay.innerHTML = message
        gameActive = false;
        winningPoints -=1;
        notEngagedFrom = new Date().getTime();
        startButton.style.display = "";
        liveswitchChannel.sendMessage("Are you available?");
        setTimeout(function() {
            if(availableUser.length>0){
                startButton.disabled = false;
                
            }
          }, 3000);
          gameState = ["", "", "", "", "", "", "", "", ""];
          liveswitchChannel.sendMessage(JSON.stringify({myId:liveswitchClient.getId(),myStatus:"available",joinTime:myJoinTime,notEngaged:notEngagedFrom,score:winningPoints}));
        }
        }

        if(message=="Game ended in a draw!"){
            if(currentOpponentId == sender.getId()){
            var message = drawMessage();
            statusDisplay.innerHTML = message;
            gameActive = false;
            notEngagedFrom = new Date().getTime();
            startButton.style.display = "";
         liveswitchChannel.sendMessage("Are you available?");
         setTimeout(function() {
            if(availableUser.length>0){
                startButton.disabled = false;
                
            }
          }, 3000);
          gameState = ["", "", "", "", "", "", "", "", ""];
          liveswitchChannel.sendMessage(JSON.stringify({myId:liveswitchClient.getId(),myStatus:"available",joinTime:myJoinTime,notEngaged:notEngagedFrom,score:winningPoints}));
        }
        }

        if(message=="Game over"){
            if(sender.getId()!=currentOpponentId){
            if(!gameActive){
                liveswitchChannel.sendMessage("Are you available?");
    setTimeout(function() {
        if(availableUser.length>0){
            startButton.disabled = false;
            statusDisplay.innerHTML ="If you want to play start the game";
        }
      }, 3000);
            }
        }
        }

    fm.liveswitch.Log.debug(`Message received: ${message} from: ${sender.getId()}`);
  });

  if (liveswitchChannel.getRemoteClientInfos().length > 0) {
    liveswitchChannel.sendMessage("Are you available?");
    try{setTimeout(function() {
        if(availableUser.length>0){
            startButton.disabled = false;
            statusDisplay.innerHTML ="If you want to play start the game";
        }
      }, 3000);
    }catch(error){
        console.log(error);
    }
    
    
  }
  if(liveswitchChannel.getRemoteClientInfos().length == 0){
    statusDisplay.innerHTML = "No opponent available to play with you!";
  }
})
.fail((ex) => {
  fm.liveswitch.Log.debug("Failed to connect to server");
});