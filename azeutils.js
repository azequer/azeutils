// ==UserScript==
// @name         Aze's Utils
// @namespace    http://tampermonkey.net/
// @version      2024-06-29_01
// @description  Aze's Utils
// @author       azequerobu
// @match        https://www.roblox.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=roblox.com
// @grant        GM_addElement
// @sandbox      JavaScript
// ==/UserScript==

var sep = "!%";
var websocketProtocol = "ws";
var websocketAddr = "localhost:8847";

var notificationInviteInfo = {
    "userName": "Roblox",
    "placeId": 1,
    "userId": 1,
    "serverId": "Test"
};

var azeServerOnline = {};

var gamePlaceId = 0;
var isGames = false;

function promptJoin() {
    attemptShowNotification(notificationInviteInfo.userName+" wants to play with you! Press this notification to join.", function(yep) {
        if(yep == true) {
            promptDialog("Join "+notificationInviteInfo.userName+"'s Game", "Join place id "+notificationInviteInfo.placeId+"?", "", "OK", "Cancel", true, true, function(){
                Roblox.GameLauncher.joinGameInstance(notificationInviteInfo.placeId, notificationInviteInfo.serverId, true, notificationInviteInfo.serverId, "Player");
            });
        }
    });
}

function azeServerDataHandler(datah) {
    switch(datah[0]) { //1019416749
        case 'INVITE':
           if(Number(datah[5]) == currentUser.userId) { 
                notificationInviteInfo.userName = datah[1];
                notificationInviteInfo.placeId = Number(datah[2]);
                notificationInviteInfo.userId = Number(datah[3]);
                notificationInviteInfo.serverId = Number(datah[4]);
                promptJoin();
            }
            break;
        case 'CHAT':
            break;
        case 'JOIN':
            azeServerOnline[Number(datah[1])] = true;
            break;
        case 'LEAVE':
            azeServerOnline[Number(datah[1])] = false;
            break;
        default:
            break;
    }
}

var azeServerStatus = "Connecting";
var azeServerWebsocket = null;

function initializateConnection() {
    if(!currentUser.isAuthenticated) {
        console.log("Cannot connect to invite server while logged off!");
        azeServerStatus = "Disconnected";
        return;
    }
    azeServerStatus = "Connecting";
    azeServerWebsocket = new WebSocket(websocketProtocol+"://"+websocketAddr);
    azeServerWebsocket.binaryType = "text";

    azeServerWebsocket.onclose = (e) => {
        azeServerOnline = {};
        azeServerStatus = "Disconnected";
        console.log("WebSocket closing: ");
        console.log(e);
        if(Notification.permission == "granted") {
            notify("Lost connection to invite server.", function(){});
        }
    }

    azeServerWebsocket.onerror = (e) => {
        azeServerStatus = "Disconnected";
        console.log("WebSocket error: ");
        console.log(e);
        if(Notification.permission == "granted") {
            notify("Lost connection to invite server due to error, Make sure CSP Unblock is enabled.", function(){});
        }
    }

    azeServerWebsocket.onopen = (e) => {
        azeServerStatus = "Connected";
        console.log("WebSocket connected: ");
        console.log(e);
        var logonMsg = ["JOIN", currentUser.userId];
        azeServerWebsocket.send(logonMsg.join(sep));
    }

    azeServerWebsocket.onmessage = (e) => {
        console.log("WebSocket message: ");
        console.log(e);
        var datah = e.data.split(sep);
        azeServerDataHandler(datah);
    };
}

function invitePlayerToGame(playerId, placeId, instanceId) {
    var msg = ["INVITE", currentUser.name, placeId, currentUser.userId, instanceId, playerId];
    azeServerWebsocket.send(msg.join(sep));
}

var menuItemExample = '<li><a class="rbx-menu-item" id="aze-menu" href="#">REPLACEME</a></li>';
var styleString = '<style> .azmen { width: 700px; height: 400px; background-color: #ffffff; list-style-type: none; padding: 0; margin: 0; margin-left: 10%; padding-left: 5%; padding-top: 5%; } .azbg {} .azli { padding: 5px; } </style>';
var azmenuString = '<div class="azbg" id="aze-menu-menu"><ul class="azmen" style=""></ul></div>';
var azBtnString = '<li class="azli"><button>REPLACEME</button></li>';
var menuBtn = null;
var azmenu = null;

var hiddenStyle = "display: none;";

window.getCookie = function(name) {
  var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
}

function notify(name, callback) {
    var notif = new Notification(name);
    notif.onclick = callback(true);
    notif.onclose = callback(false);
    notif.onerror = callback(false);
}

var currentUser = null;

function defaultAccept() {}

function defaultDecline() {}

function promptDialog(title, content, footer = "", acceptText = "Yes", declineText = "No", showAccept = true, showDecline = false, onAccept = defaultAccept, onDecline = defaultDecline) {
    Roblox.Dialog.open({"titleText": title, "bodyContent": content, "footerText": footer, "acceptText": acceptText, "declineText": declineText, "showAccept": showAccept, "showDecline": showDecline, "onAccept": onAccept, "onDecline": defaultDecline});
}

function showOKDialog(title, content, onAccept = defaultAccept) {
    promptDialog(title, content, "", "OK", "", true, false, onAccept);
}

function attemptShowNotification(name, callback) {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
    } else if (Notification.permission === "granted") {
        notify(name, callback);
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          notify(name, callback);
        } else {
          showOKDialog("Someone tried to invite you to a game!", "Failed to show notification.");
        }
      });
    }
}

function getThumbnail(id, type, size, callback) {
    RobloxThumbnails.thumbnailService.getThumbnailImage(type, size, RobloxThumbnails.ThumbnailFormat.png, id).then(callback);
}

function queryUserById(id, callback) {
    return RobloxUserProfiles.userProfilesService().queryUserProfiles([id], [RobloxUserProfiles.UserProfileField.Names.Username, RobloxUserProfiles.UserProfileField.Names.DisplayName, RobloxUserProfiles.UserProfileField.Names.PlatformName]).then(callback);
}

var tempCallback = null;

function defaultGroupCallback(resp) {
    if(resp.status == 200) {
        resp.json().then(tempCallback);
    } else {
        tempCallback({"data": []});
    }
}

function getUsersInGroup(group, callback, cursor = "") {
    tempCallback = callback;
    if(cursor == "") {
        fetch("https://groups.roblox.com/v1/groups/"+group+"/users?limit=100&sortOrder=Asc").then(defaultGroupCallback);
    } else {
        fetch("https://groups.roblox.com/v1/groups/"+group+"/users?limit=100&sortOrder=Asc&cursor="+cursor).then(defaultGroupCallback);
    }
}

function defaultFriendCallback(resp) {
    if(resp.status == 200) {
        resp.json().then(tempCallback);
    } else {
        tempCallback({"data": []});
    }
}

function queryFriendsById(id, callback) {
    tempCallback = callback;
    if(currentUser.isAuthenticated && id == currentUser.userId) {
        fetch("https://friends.roblox.com/v1/users/"+id+"/friends?userSort=StatusFrequents", { credentials: "include" }).then(defaultFriendCallback);
    } else {
        fetch("https://friends.roblox.com/v1/users/"+id+"/friends").then(defaultFriendCallback);
    }
}

function defaultProductCallback(resp) {
    if(resp.status == 200) {
        resp.json().then(tempCallback);
    } else {
        tempCallback({"TargetId": 0});
    }
}

function queryProductInfoById(id, callback) {
    tempCallback = callback;
    fetch("https://economy.roblox.com/v2/assets/"+id+"/details").then(defaultProductCallback);
}

function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

function createElementFromHTML(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();

  // Change this to div.childNodes to support multiple top-level nodes.
  return div.firstChild;
}

var popoverOpen = false;

function azeButtonClicked() {
    popoverOpen = false;
    azmenu.style = "";
}

function addNewButton(text, callback) {
    var exBtn = createElementFromHTML(azBtnString.replace(/REPLACEME/g, text));
    exBtn.onclick = callback;
    document.getElementsByClassName("azmen")[0].appendChild(exBtn);
}

function onLoad(e) {
    initializateConnection() //attempt to connect on page load
    var styel = createElementFromHTML(styleString);
    document.body.appendChild(styel);
    azmenu = createElementFromHTML(azmenuString);
    azmenu.style = hiddenStyle;
    document.head.parentNode.insertBefore(azmenu, document.head);
    addNewButton("Close", function(e) {
        azmenu.style = hiddenStyle;
    });
    addNewButton("Version", function(e) {
        showOKDialog("Version", "Version is "+GM_info.script.version);
    });
    addNewButton("Test join prompt", function(e) {
        notificationInviteInfo.placeId = 1818;
        notificationInviteInfo.serverId = "";
        notificationInviteInfo.userId = 1;
        notificationInviteInfo.userName = "Roblox";
        promptJoin();
    });
    addNewButton("Fix inviting not working (CSP Unblock extension)", function(e) {
        window.open("https://chromewebstore.google.com/detail/csp-unblock/lkbelpgpclajeekijigjffllhigbhobd");
        showOKDialog("Info", "After you install CSP Unblock, go into Extensions button next to your profile or download list and click on CSP Unblock once then refresh. You can click it again to disable it after the page loads");
    });
    addNewButton("Invite player by user id", function(e) {
        if(azeServerStatus == "Disconnected") {
            showOKDialog("Error", "Has to be connected to invite server in order to invite someone!");
            return;
        }
        var AuserId = prompt("Enter user id to invite (has to be connected to invite server)");
        if(AuserId != null) {
            console.log(currentUser);
            fetch("https://presence.roblox.com/v1/presence/users", { method: 'POST', credentials: "include", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ "userIds": [currentUser.userId] }) }).then((resp) => {
                resp.json().then((aeee) => {
                    var usrPresence = aeee.userPresences[0];
                    console.log(usrPresence);
                    if(usrPresence != null) {
                        var gameInstanceId = usrPresence.gameId;
                        if(gameInstanceId != null) {
                            invitePlayerToGame(Number(AuserId), Number(gamePlaceId), gameInstanceId);
                        } else {
                            showOKDialog("Error", "Failed to get game id. Make sure your joins are enabled and that you're ingame!");
                        }
                    } else {
                        console.log(aeee);
                        showOKDialog("Error", "Failed to get user presence. Check your internet connection");
                    }
                });
            });
        }
    });
    addNewButton("Check connection to invite server", function(e) {
        if(azeServerStatus == "Disconnected") {
            promptDialog("Disconnected", "You are currently disconnected from invite server. Reconnect?", "", "Yes", "No", true, true, function(){
                initializateConnection();
            });
        } else if(azeServerStatus == "Connected") {
            showOKDialog("Connected", "You are currently connected to invite server.");
        } else if(azeServerStatus == "Connecting") {
            showOKDialog("Connecting", "You are currently connecting to the invite server. This might take a while.");
        }
    });
    var btrbx = window.BTRoblox;
    currentUser = Roblox.CurrentUser;

    if (btrbx == undefined) {
        console.warn("window.BTRoblox is undefined.");
        showOKDialog("Error", "You need to install BTRoblox in order for this userscript to work properly.");
        return;
    }

    //showOKDialog("This shit is EXPERIMENTAL.", "Continue?");

    waitForElm(".btn-navigation-nav-settings-md").then((elm) => {
    var settingsBtn = elm;
    settingsBtn.onclick = function() {
    if(!popoverOpen) {
    popoverOpen = true;
    waitForElm(".btr-settings-toggle").then((elm2) => {
    var menuNode = createElementFromHTML(menuItemExample.replace(/REPLACEME/g, "AzeSets"));
    menuNode.onclick = azeButtonClicked;
    document.getElementById("settings-popover-menu").appendChild(menuNode);
    });
    } else {
    popoverOpen = false;
    }
    }
    });

    isGames = /games\/(.*)\/.*/.test(window.location.href);
    gamePlaceId = Number(/games\/(.*)\//g.exec(window.location.href)[1].split("/")[0]);
    console.log("Is games: "+isGames);
    if(isGames == true) {
        showOKDialog("Hi", "The place id that you are viewing is: "+gamePlaceId);
    }
}

(function() {
    'use strict';
    
    onLoad(null);
})();