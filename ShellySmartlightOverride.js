// Copyright 2024 Michael Brown
//
// Licensed under the Creative Commons license
//
// Shelly Script example: Smart Bulb Failover
// This script is for light switches on circuits fitted with smart bulbs.
// 
// - Use momentry bell push or sprung mechanisms.
// - Set the Shelly device in the GUI set the input type to "Button" & "Detached"
//
// - Normal mode: Button press events are sent to Home Assistant. Suggested config
//   - Single press toggles light group on/off to their previous scene setting
//   - Double press calls a scene for the light group with maximum brightness
//   - Long press sets the a sceen for the light group in dim/night-light mode 
//
// - Auto Failover Mode: Button toggles the Shelly relay on/off if HA is not responding
//
// - Manual Failover Mode: Holding the button down for 10+ seconds forces the relay off
//
// Note: This script currently checks the base URL for HA which responds with no
// authorisation required. The ideal way to do this is to read the device MAC address
// and use that to query the switch entity, however this requires a long lived auth
// Token from HA, and there appears to be a bug in the Shelly firmware v1.4.2 which
// does not pass the bearer token in the HTTP header correctly. This will be udpated
// once Shelly resolve this issue.

var timer;
//var ha_url = "http://10.0.0.99:8123/"; // Replace with your HA base URL

var ha_url = "http://10.0.0.99:8123/api/states/switch.library_shelly_pm1_switch_0";
var ha_token = "<HA-long-lived-token";
//MAC Address: 7C87CE654538
//shellyplus1pm-7c87ce654538

Shelly.addEventHandler(function(e) {
  if (e.component === "input:0") {
    if (e.info.event === "btn_down") {
      handleButtonDown();
 //   } else if (e.info.event === "btn_up") {
 //     handleButtonUp();
    }
  }
});

function handleButtonDown() {
  Timer.clear(timer);
  Shelly.call("Switch.GetStatus", {"id":0}, function(switchStatus) {
    if (switchStatus.output) {
      // Output is on, turn it off if held for 10+ seconds
      checkHomeAssistantConnection(function(isConnected) {
        if (isConnected) {
            print("Home Assistant is connected");
            timer = Timer.set("10000", false, relayOff);
        } else {
          print("Home Assistant is NOT connected");
          relayOff();
        }
      });
    } else {
      // Output is off, turn it on immediately
      relayOn();
    }
  });
}

function relayOff() {
    print("Turning relay OFF");
    Shelly.call("Switch.set", {"id":0, "on":false});
}

function relayOn() {
    print("Turning relay ON");
    Shelly.call("Switch.set", {"id":0, "on":true});
}

// Function to check connection with Home Assistant

function checkHomeAssistantConnection() {
  print("Checking Home Assistant status...");  
  Shelly.call(
    "http.request",
    {
      method: "GET",
      url: ha_url,
      headers: {
        "Authorization": "Bearer " + ha_token,     // create long lived access token in HA and paste here
        "Content-Type": "application/json"          // Set content type header
      }
    },
    function (response, error_code, error_message) {
      if (response && response.code && response.code === 200) {
        if (response.code === 200) {
          print("Home Assistant is running! Status code: ", response.code);          
        } else {
          print("Home Assistant API error. Status code: ", response.code);
        }
      } else {
        print("Home Assistant is NOT responding. Error: ", error_message);
      }
    }
  );
}


/* ----- old code ----- */


function oldcheckHomeAssistantConnection(callback) {

  Shelly.call("http.get", {url: ha_url},
    function (result) {
      if (result.code === 200) {
       // If we get a 200 response, Home Assistant is connected
        //print("HA Connection TRUE");
        callback(true);
      } else {
        // Any other response means Home Assistant is not connected
        print("HA Connection FALSE " + result.code);
        callback(false);
      }
    }
  );
}

/*** Code below this line is experimental ***/

// function getEntityID(entity_id) {
//   Shelly.call("Sys.GetStatus", {}, 
//     function (result) {entity_id="shellyplus1pm-" + result.mac});
// }

// Function to check connection with Home Assistant entity (currently broken)
// function checkHomeAssistantConnection(callback) {
//   Shelly.call(
//     "http.get", {url: ha_url},
//    {
//      url: ha_url,
//     headers: {
//        Authorization: "Bearer " + ha_token
//      }
//    },
//     function (result) {
//       if (result.code === 200) {
//         // If we get a 200 response, Home Assistant is connected
//         print("HA Connection TRUE");
//         callback(true);
//       } else {
//         // Any other response means Home Assistant is not connected
//         print("HA Connection FALSE " + result.code);
//         callback(false);
//       }
//     }
//   );
// }
