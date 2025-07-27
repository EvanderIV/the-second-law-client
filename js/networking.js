import { playEvent } from "./events.js";
import { startMenuMusic, stopMenuMusic } from "./events.js";
import { musicVolume, ambienceVolume } from "./index.js";

window.mobileAndTabletCheck = function () {
  let check = false;
  (function (a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    )
      check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
};

let isMobileUser = window.mobileAndTabletCheck();

// WebSocket connection handling
let socket;
let pingInterval;
let lastPongReceived;
let onPlayerJoined;
let onPlayerLeft;
let onReadyStateUpdate;
let onPlayerInfoUpdate;
let onGameStarting;
let onRoomClosed;

let gameStarted = false;

// --- Audio Management ---
// Variables to track the current audio paths to prevent re-playing the same tracks.
let currentMusicPath = null;
let currentAmbiencePath = null;
// Arrays to manage all currently playing audio instances for each category.
window.currentMusicLoopGroup = [];
window.currentAmbienceLoopGroup = [];

export { gameStarted };

function setupSocketEventHandlers() {
  if (!socket) return;

  socket.on("pong", () => {
    lastPongReceived = Date.now();
  });

  // Add new event handler for game events
  socket.on("event", (eventName) => {
    if (typeof eventName === "string") {
      playEvent(eventName);
    }
  });

  socket.on("roomError", (data) => {
    showError(data.message);
  });

  socket.on("roomClosed", () => {
    document.getElementById("error-message").style.marginTop = "50vmin";
    document.getElementById("error-message").style.color = "#FF0000";
    showError("Host has disconnected");
    if (onRoomClosed) {
      onRoomClosed();
    }

    // Reset UI elements
    document.getElementById("game-code").style.display = "";
    document.getElementById("join-button").style.display = "";

    // Enable nickname and skin selection again
    const nicknameInput = document.getElementById("nickname");
    if (nicknameInput) nicknameInput.disabled = false;
    const skinBackArrow = document.getElementById("skin-back");
    const skinNextArrow = document.getElementById("skin-next");
    if (skinBackArrow) skinBackArrow.classList.remove("disabled");
    if (skinNextArrow) skinNextArrow.classList.remove("disabled");

    // Hide suit squares and reset them
    const suitSquares = document.getElementById("suit-squares");
    if (suitSquares) {
      suitSquares.classList.remove("show");
      // Return squares to grid
      document.querySelectorAll(".suit-square").forEach((square) => {
        if (square.classList.contains("placed")) {
          square.classList.remove("placed");
          square.style.position = "";
          square.style.left = "";
          square.style.top = "";
        }
      });
    }

    // Hide directional arrows by removing game-joined class
    const root = document.getElementById("root");
    if (root) {
      root.classList.remove("game-joined");
    }
  });

  // Add ready state update handler in a single location
  socket.on("ready-state-update", ({ name, ready }) => {
    if (onReadyStateUpdate) {
      onReadyStateUpdate(name, ready);
    }
  });

  // Add player info update handler
  socket.on("player-info-update", ({ oldName, newName, newSkin }) => {
    if (onPlayerInfoUpdate) {
      onPlayerInfoUpdate(oldName, newName, newSkin);
    }
  });
  // Add game starting handler
  socket.on("gameStarting", () => {
    console.log("Received gameStarting event");
    if (onGameStarting) {
      onGameStarting();
    }
  });

  // Helper function to fade out and stop an audio element.
  function fadeOutAudio(audio) {
    if (!audio || audio.paused) return;

    const FADE_DURATION = 3000; // 3 seconds
    const FADE_STEPS = 60;
    const stepDuration = FADE_DURATION / FADE_STEPS;
    const initialVolume = audio.volume;
    // Prevent division by zero if initialVolume is 0
    const volumeStep = initialVolume > 0 ? initialVolume / FADE_STEPS : 0;

    if (volumeStep === 0) {
      audio.pause();
      return;
    }

    let fadeInterval = setInterval(() => {
      const newVolume = audio.volume - volumeStep;
      if (newVolume <= 0) {
        audio.volume = 0;
        audio.pause();
        // Clean up the element after it's fully faded and stopped
        audio.src = "";
        clearInterval(fadeInterval);
      } else {
        audio.volume = newVolume;
      }
    }, stepDuration);
  }

  // Helper function to fade in an audio element that is ALREADY PLAYING.
  function fadeInAudio(audio, targetVolume, duration) {
    if (targetVolume <= 0) return; // No need to fade if target is 0 or less.

    const FADE_STEPS = 60;
    const stepDuration = duration / FADE_STEPS;
    const volumeStep = targetVolume / FADE_STEPS;

    if (volumeStep <= 0) return;

    let fadeInterval = setInterval(() => {
      const newVolume = audio.volume + volumeStep;
      if (newVolume >= targetVolume) {
        audio.volume = targetVolume;
        clearInterval(fadeInterval);
      } else {
        audio.volume = newVolume;
      }
    }, stepDuration);
  }

  // This 'gameState' handler now supports overlapping audio loops for music and ambience.
  socket.on("gameState", async (data) => {
    try {
      // Fade out menu music when the game starts
      if (!gameStarted && data.sector !== null) {
        gameStarted = true;
        document.body.style.backgroundColor = "#000"; // Set background color to black
        const settings = document.getElementById("settings-btn-desktop");
        if (settings) {
          settings.style.opacity = 0.5;
        }
        const roomCode = document.getElementById("room-code");
        if (roomCode) {
          roomCode.classList.add("minimized");
          roomCode.innerText = roomCode.innerText.split(": ")[1];
        }
        stopMenuMusic(true); // This smoothly fades out the menu music
      }

      // Fetch world and actions configuration
      const worldResponse = await fetch("./js/world.json");
      const worldConfig = await worldResponse.json();
      const actionsResponse = await fetch("./js/actions.json");
      const actionsConfig = await actionsResponse.json();

      const sectorName = data.sector || null;
      const locationName = data.location || null;

      const sectorConfig = sectorName
        ? worldConfig.sectors.find((s) => s.name === sectorName)
        : null;

      const locationConfig =
        locationName && sectorConfig?.locations
          ? sectorConfig.locations.find((l) => l.name === locationName)
          : null;

      // --- ART MANAGEMENT ---
      let artSource;
      if (locationConfig?.art) {
        artSource = locationConfig.art;
      } else if (sectorConfig?.art) {
        artSource = sectorConfig.art;
      }

      if (artSource) {
        let background = document.getElementById("background-art");
        background.classList.add("minimized");
        setTimeout(() => {
          background.src = `assets/art/game/${artSource}`;
        }, 1500);
        setTimeout(() => {
          background.classList.remove("minimized");
        }, 1800);
      }

      // --- AUDIO CONFIGURATION ---
      let musicConfig;
      let ambienceConfig;

      // 1. Get default audio from world.json
      if (locationConfig) {
        // If a location is defined, ONLY use its audio. If a property is undefined, that means silence.
        musicConfig = locationConfig.music;
        ambienceConfig = locationConfig.ambience;
      } else if (sectorConfig) {
        // If no location, fall back to the sector's audio.
        musicConfig = sectorConfig.music;
        ambienceConfig = sectorConfig.ambience;
      }

      // 2. Check for actor-specific overrides from actions.json
      if (data.actor && actionsConfig.music) {
        const actorName = data.actor;
        // The 'music' property in actions.json is an array of objects where the key is the actor name.
        const actorActionObject = actionsConfig.music.find(
          (action) => action[actorName]
        );

        if (actorActionObject) {
          // We found the actor. Now get their list of actions.
          const actorActions = actorActionObject[actorName];
          if (actorActions && actorActions.length > 0) {
            // For now, let's assume we use the first action defined.
            // A more complex system could use the 'trigger' property.
            const overrideAction = actorActions[0];

            // If the action specifies music or ambience, it overrides the world default.
            if (overrideAction.music) {
              console.log(`Overriding music for actor: ${actorName}`);
              musicConfig = overrideAction.music;
            }
            if (overrideAction.ambience) {
              console.log(`Overriding ambience for actor: ${actorName}`);
              ambienceConfig = overrideAction.ambience;
            }
          }
        }
      }

      // --- GENERIC AUDIO HANDLER ---
      const handleAudio = (type, config, volumeSetting, useFadeIn) => {
        if (isMobileUser) return;
        let currentPath, loopGroup;
        if (type === "music") {
          currentPath = currentMusicPath;
          loopGroup = window.currentMusicLoopGroup;
        } else {
          currentPath = currentAmbiencePath;
          loopGroup = window.currentAmbienceLoopGroup;
        }

        const newAudioPath = config?.source
          ? `assets/audio/${type}/game/${config.source}`
          : null;

        if (newAudioPath === currentPath) {
          return; // Audio hasn't changed, do nothing.
        }

        // Fade out all old instances of this audio type
        loopGroup.forEach((audio) => fadeOutAudio(audio));

        if (type === "music") {
          window.currentMusicLoopGroup = [];
          currentMusicPath = newAudioPath;
        } else {
          window.currentAmbienceLoopGroup = [];
          currentAmbiencePath = newAudioPath;
        }

        if (newAudioPath) {
          const baseVolume = config.volume || 1.0;
          const loopPoint = config.length; // in milliseconds
          const safeVolumeSetting =
            typeof volumeSetting === "number" && !isNaN(volumeSetting)
              ? volumeSetting
              : 1.0;
          const targetVolume = baseVolume * safeVolumeSetting;

          const playNewInstance = () => {
            let checkPath =
              type === "music" ? currentMusicPath : currentAmbiencePath;
            if (checkPath !== newAudioPath) return; // Stale call, audio has changed again

            const audio = new Audio(newAudioPath);
            // Store the base volume on the element itself so sliders can access it
            audio.dataset.baseVolume = baseVolume;

            const currentGroup =
              type === "music"
                ? window.currentMusicLoopGroup
                : window.currentAmbienceLoopGroup;
            currentGroup.push(audio);

            audio.addEventListener("ended", () => {
              const index = currentGroup.indexOf(audio);
              if (index > -1) currentGroup.splice(index, 1);
            });

            if (loopPoint) {
              let loopTriggered = false;
              audio.addEventListener("timeupdate", function () {
                if (!loopTriggered && this.currentTime >= loopPoint / 1000) {
                  loopTriggered = true;
                  playNewInstance();
                }
              });
            } else {
              audio.loop = true;
            }

            // **FIX:** Set initial volume, call play(), THEN fade if needed.
            // This is a more robust pattern for browsers.
            audio.volume = useFadeIn ? 0 : targetVolume;
            const playPromise = audio.play();

            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  // Playback started. If fade-in is required, do it now.
                  if (useFadeIn) {
                    fadeInAudio(audio, targetVolume, 1000);
                  }
                })
                .catch((e) =>
                  console.error(`Audio play failed for ${type}:`, e)
                );
            }
          };
          playNewInstance();
        }
      };

      // --- TRIGGER AUDIO FOR MUSIC AND AMBIENCE ---
      handleAudio("music", musicConfig, musicVolume, false);
      handleAudio("ambience", ambienceConfig, ambienceVolume, true);
    } catch (error) {
      console.error("Error handling gameState audio:", error);
    }
  });
}

function connectToServer() {
  if (socket && socket.connected) {
    return; // Already connected
  }
  socket = io("https://eminich.com:3002", {
    reconnectionAttempts: 5,
    timeout: 10000,
    transports: ["websocket", "polling"],
    forceNew: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    maxRetries: 3,
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  socket.on("connect", () => {
    console.log("Connected to server");
    lastPongReceived = Date.now();

    // Clear any existing ping interval
    if (pingInterval) {
      clearInterval(pingInterval);
    }

    // Start ping interval
    pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping");
        // Check if we haven't received a pong in 60 seconds
        if (Date.now() - lastPongReceived > 60000) {
          console.log("Connection lost, attempting to reconnect...");
          clearInterval(pingInterval);
          socket.disconnect();
          setTimeout(() => connectToServer(), 1000);
        }
      }
    }, 25000);

    // Set up event handlers after connection
    setupSocketEventHandlers();
  });
}

function joinRoom(roomCode, playerName, skinId) {
  if (!socket || !socket.connected) {
    connectToServer();

    // Wait for connection before joining
    socket.once("connect", () => {
      performJoin(roomCode, playerName, skinId);
    });
  } else {
    performJoin(roomCode, playerName, skinId);
  }
}

function performJoin(roomCode, playerName, skinId) {
  console.log("Attempting to join room:", roomCode);
  showError("Joining room...");

  // Setup updatePlayerInfo handler first
  socket.on("updatePlayerInfo", (data) => {
    console.log("Sending player info update:", data);
  });

  socket.emit("join-room", {
    roomCode: roomCode.toUpperCase(),
    name: playerName,
    skinId: skinId,
    clientId: socket.id,
  });

  // Set up handlers for room join process
  socket.once("joinSuccess", (data) => {
    startMenuMusic();
    console.log("Successfully joined room:", data);
    document.getElementById("error-message").style.marginTop = "90vmin";
    document.getElementById("error-message").style.color = "#AAFFAA";
    showError("Successfully joined room!");
    // Hide join UI elements
    document.getElementById("game-code").style.display = "none";
    document.getElementById("join-button").style.display = "none";
    document.getElementById("ready-button").style.display = "inline-flex";
    document.getElementById("ready-text").style.display = "flex";
    const suitSquares = document.getElementById("suit-squares");
    const root = document.getElementById("root");
    if (suitSquares) {
      suitSquares.classList.add("show");
    }
    if (root) {
      root.classList.add("game-joined");
    }
  });

  socket.once("roomError", (error) => {
    console.error("Room join error:", error);
    document.getElementById("error-message").style.marginTop = "50vmin";
    document.getElementById("error-message").style.color = "#FF0000";
    showError(error.message || "Failed to join room");
    // Re-enable join UI
    document.getElementById("game-code").style.display = "";
    document.getElementById("join-button").style.display = "";
    document.getElementById("ready-button").style.display = "none";
    document.getElementById("ready-text").style.display = "none";
  });
}

function setReadyState(ready) {
  if (socket && socket.connected) {
    socket.emit("ready-state-change", { ready });
  }
}

function showError(message) {
  const errorDiv = document.getElementById("error-message");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
    setTimeout(() => {
      errorDiv.style.opacity = "1";
    }, 10);
    setTimeout(() => {
      errorDiv.style.opacity = "0";
    }, 3000);
    setTimeout(() => {
      errorDiv.style.display = "none";
    }, 3500);
  }
}

// Export functions and event handlers
window.networkManager = {
  getSocket: () => socket,
  setOnPlayerJoined: (callback) => {
    onPlayerJoined = callback;
  },
  setOnPlayerLeft: (callback) => {
    onPlayerLeft = callback;
  },
  setOnReadyStateUpdate: (callback) => {
    onReadyStateUpdate = callback;
  },
  setOnPlayerInfoUpdate: (callback) => {
    onPlayerInfoUpdate = callback;
  },
  setOnGameStarting: (callback) => {
    onGameStarting = callback;
  },
  setOnRoomClosed: (callback) => {
    onRoomClosed = callback;
  },
  connectToServer,
  joinRoom,
  setReadyState,
  updatePlayerInfo: (data) => {
    console.log("NetworkManager: Sending player info update:", data);
    if (socket && socket.connected) {
      socket.emit("updatePlayerInfo", data);
    } else {
      console.error(
        "NetworkManager: Cannot send update - socket not connected"
      );
    }
  },
  setCallbacks: (callbacks) => {
    // Set all callbacks
    onPlayerJoined = callbacks.onPlayerJoined;
    onPlayerLeft = callbacks.onPlayerLeft;
    onReadyStateUpdate = callbacks.onReadyStateUpdate;
    onPlayerInfoUpdate = callbacks.onPlayerInfoUpdate;
    onGameStarting = callbacks.onGameStarting;
    onRoomClosed = callbacks.onRoomClosed;

    // After setting callbacks, re-setup event handlers to ensure they're using the new callbacks
    setupSocketEventHandlers();
  },
};
