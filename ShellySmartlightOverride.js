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
//   *TODO: This has a bit of a delay while it checks if HA is up each time. Requires fix.
//
// - Manual Failover Mode: Holding the button down for 10+ seconds forces the relay off
//
// Thanks to Grok for help coding and dugging

// Custom variables - update with your own settings
var ha_url = "http://10.0.0.99:8123/api/states/switch.library_shelly_pm1_switch_0";
var ha_token = "<HA-long-lived-token>";

// Initialize variables
let buttonDown = false;
let timer = null;

// Function to check HA status (Version 2: checks HTTP status and entity state)
function checkHomeAssistantUp(callback) {
  print("Checking Home Assistant status...");
  Shelly.call(
    "http.request",
    {
      method: "GET",
      url: ha_url,
      headers: {
        "Authorization": "Bearer " + ha_token,
        "Content-Type": "application/json"
      }
    },
    function (response, error_code, error_message) {
      if (response && response.code === 200) {
        try {
          let data = JSON.parse(response.body);
          print("Received entity state: " + data.state);
          if (data.state === "on" || data.state === "off") {
            print("Home Assistant is running! Entity state is valid.");
            callback(true);
          } else {
            print("Invalid entity state: " + data.state);
            callback(false);
          }
        } catch (e) {
          print("Error parsing response: " + e);
          callback(false);
        }
      } else {
        print("Home Assistant is NOT responding. Error: " + error_message);
        callback(false);
      }
    }
  );
}

// Button down handler
function btn_down() {
  print("Button pressed (btn_down)");
  buttonDown = true;
  Shelly.call("Switch.GetStatus", { id: 0 }, function(result) {
    if (!result.output) {
      print("Relay is OFF, turning ON immediately");
      Shelly.call("Switch.Set", { id: 0, on: true });
    } else {
      print("Relay is ON, checking HA status");
      checkHomeAssistantUp(function(haUp) {
        if (!haUp) {
          print("HA is NOT up, turning relay OFF immediately");
          Shelly.call("Switch.Set", { id: 0, on: false });
        } else {
          print("HA is up, setting 10-second timer for long press");
          if (timer === null) {
            timer = Timer.set(10000, false, function() {
              if (buttonDown) {
                print("Button held for 10 seconds, turning relay OFF");
                Shelly.call("Switch.Set", { id: 0, on: false });
              } else {
                print("Button released before 10 seconds, no action");
              }
              timer = null;
            });
          }
        }
      });
    }
  });
}

// Button up handler
function btn_up() {
  print("Button released (btn_up)");
  buttonDown = false;
  if (timer !== null) {
    print("Clearing timer");
    Timer.clear(timer);
    timer = null;
  }
}

// Register button handlers
Shelly.addEventHandler(function(event) {
  if (event.component === "input:0") {
    if (event.info.event === "btn_down") {
      print("Event: Button down detected");
      btn_down();
    } else if (event.info.event === "btn_up") {
      print("Event: Button up detected");
      btn_up();
    }
  }
});
