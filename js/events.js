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

// Menu music system
let menuMusicData = null;
let currentMenuMusic = null;
let recentlyPlayedMenuMusic = [];
const MAX_RECENT_TRACKS = 3;
const ENABLE_MUSIC_FADING = false; // Set to false to disable fading
const FADE_DURATION = 2000; // Fade duration in milliseconds

// Load menu music data
async function loadMenuMusic() {
  try {
    const response = await fetch("js/menu_music.json");
    menuMusicData = await response.json();
  } catch (error) {
    console.error("Error loading menu music:", error);
  }
}

function getRandomMenuTrack() {
  if (
    !menuMusicData ||
    !menuMusicData.music ||
    menuMusicData.music.length === 0
  ) {
    return null;
  }

  // Filter out recently played tracks
  const availableTracks = menuMusicData.music.filter(
    (track) => !recentlyPlayedMenuMusic.includes(track.source)
  );

  // If all tracks have been recently played, reset the history
  if (availableTracks.length === 0) {
    recentlyPlayedMenuMusic = [];
    return getRandomMenuTrack();
  }

  // Use cryptographic random to select a track
  const trackIndex = getSecureRandom(0, availableTracks.length - 1);
  const selectedTrack = availableTracks[trackIndex];

  // Add to recently played and maintain history length
  recentlyPlayedMenuMusic.push(selectedTrack.source);
  if (recentlyPlayedMenuMusic.length > MAX_RECENT_TRACKS) {
    recentlyPlayedMenuMusic.shift();
  }

  return selectedTrack;
}

export function startMenuMusic() {
  if (isMobileUser || !menuMusicData) return;

  const track = getRandomMenuTrack();
  if (!track) return;

  const newTrack = new Audio(track.source);
  const targetVolume = track.volume || 0.5;

  if (ENABLE_MUSIC_FADING) {
    // Start with zero volume for smooth fade in
    newTrack.volume = 0;

    // If there's a current track, fade it out but don't stop it
    if (currentMenuMusic) {
      const oldTrack = currentMenuMusic;
      const startTime = Date.now();

      const fadeOut = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / FADE_DURATION;

        if (progress >= 1) {
          clearInterval(fadeOut);
          // Don't pause the old track, let it play until it ends naturally
          if (ENABLE_MUSIC_FADING) {
            oldTrack.volume = 0;
          }
        } else {
          oldTrack.volume = Math.max(0, oldTrack.volume - 0.02);
        }
      }, 50);

      // Set up ended event handler for the old track
      oldTrack.addEventListener("ended", () => {
        oldTrack.remove(); // Clean up the audio element when it's done
      });
    }

    // Play new track and fade it in
    newTrack
      .play()
      .then(() => {
        const startTime = Date.now();

        const fadeIn = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = elapsed / FADE_DURATION;

          if (progress >= 1) {
            clearInterval(fadeIn);
            newTrack.volume = targetVolume;
          } else {
            newTrack.volume = progress * targetVolume;
          }
        }, 50);
      })
      .catch((error) => console.error("Error playing menu music:", error));
  } else {
    // No fading - play new track at full volume without stopping the current one
    newTrack.volume = targetVolume;
    newTrack
      .play()
      .catch((error) => console.error("Error playing menu music:", error));
  }

  currentMenuMusic = newTrack;

  // Set up ended event handler for the new track
  newTrack.addEventListener("ended", () => {
    newTrack.remove(); // Clean up the audio element when it's done
  });

  // Schedule next track
  setTimeout(() => {
    startMenuMusic();
  }, track.length - (ENABLE_MUSIC_FADING ? FADE_DURATION : 0)); // Start transition early only if fading is enabled
}

export function stopMenuMusic() {
  if (currentMenuMusic) {
    currentMenuMusic.pause();
    currentMenuMusic = null;
  }
}

// Event handling system
let eventsData = null;

// Cryptographically secure random number generator function
function getSecureRandom(min, max) {
  // Create a new array with a single 32-bit unsigned integer
  const randomBuffer = new Uint32Array(1);

  // Fill it with cryptographically secure random values
  window.crypto.getRandomValues(randomBuffer);

  // Convert to a number between 0 and 1
  const randomNumber = randomBuffer[0] / (0xffffffff + 1);

  // Scale to our desired range
  return Math.floor(randomNumber * (max - min + 1)) + min;
}

// Load events data
async function loadEvents() {
  try {
    const response = await fetch("js/events.json");
    eventsData = await response.json();
  } catch (error) {
    console.error("Error loading events:", error);
  }
}

// Initialize events system
async function initEvents() {
  await Promise.all([loadEvents(), loadMenuMusic()]);
}

let canVibrate;
let useVibration = localStorage.getItem("useVibration") !== "false";
try {
  canVibrate = window.navigator.vibrate;
} catch (error) {
  canVibrate = false;
}

// Play an event by name
export function playEvent(eventName) {
  if (!eventsData || !eventsData.events) {
    console.error("Events data not loaded");
    return;
  }

  const event = eventsData.events.find((e) => e.name === eventName);

  if (!event) {
    console.error("Event not found:", eventName);
    return;
  }
  console.log("Playing event:", event);

  // Play sound if specified
  if (!isMobileUser && event.sound) {
    const audio = new Audio(`assets/audio/events/${event.sound}`);
    if (event.soundDelay !== undefined && event.soundDelay > 0) {
      setTimeout(() => {
        audio
          .play()
          .catch((error) => console.error("Error playing sound:", error));
      }, event.soundDelay * 1000);
    } else {
      audio
        .play()
        .catch((error) => console.error("Error playing sound:", error));
    }
  }

  if (isMobileUser && event.remoteSound) {
    const audio = new Audio(`assets/audio/events/${event.remoteSound}`);
    if (event.remoteSoundDelay !== undefined && event.remoteSoundDelay > 0) {
      setTimeout(() => {
        audio
          .play()
          .catch((error) => console.error("Error playing sound:", error));
      }, event.remoteSoundDelay * 1000);
    } else {
      audio
        .play()
        .catch((error) => console.error("Error playing sound:", error));
    }
  }

  if (event.vibrationPattern && canVibrate && useVibration) {
    let delay =
      event.vibrationDelay && event.vibrationDelay > 0
        ? event.vibrationDelay * 1000
        : 0;

    if (Array.isArray(event.vibrationPattern)) {
      setTimeout(() => {
        window.navigator.vibrate(event.vibrationPattern);
      }, delay);
    } else if (typeof event.vibrationPattern === "number") {
      setTimeout(() => {
        window.navigator.vibrate(event.vibrationPattern);
      }, delay);
    } else if (typeof event.vibrationPattern === "object") {
      // Handle special pattern types
      const pattern = event.vibrationPattern;

      if (pattern.type === "random") {
        setTimeout(() => {
          const vibrationPattern = [];
          let currentTime = 0;

          while (currentTime < pattern.totalDuration) {
            // Add vibration
            vibrationPattern.push(pattern.length);
            currentTime += pattern.length / 1000;

            if (currentTime < pattern.totalDuration) {
              // Add random pause using cryptographically secure random numbers
              const minMs = pattern.interavalMin * 1000;
              const maxMs = pattern.interavalMax * 1000;
              const pauseTime = getSecureRandom(minMs, maxMs);
              vibrationPattern.push(pauseTime);
              currentTime += pauseTime / 1000;
            }
          }

          window.navigator.vibrate(vibrationPattern);
        }, delay);
      } else if (pattern.type === "regular") {
        setTimeout(() => {
          const vibrationPattern = [];
          let currentTime = 0;

          while (currentTime < pattern.totalDuration) {
            // Add vibration
            vibrationPattern.push(pattern.length);
            currentTime += pattern.length / 1000;

            if (currentTime < pattern.totalDuration) {
              // Add fixed interval pause
              vibrationPattern.push(pattern.interval);
              currentTime += pattern.interval / 1000;
            }
          }

          window.navigator.vibrate(vibrationPattern);
        }, delay);
      } else {
        console.warn("Unknown vibration pattern type:", pattern.type);
      }
    } else {
      console.warn("Invalid vibration pattern format:", event.vibrationPattern);
    }
  }

  // You can add more event effects here (visual effects, etc.)
  console.log("Playing event:", eventName);
}

// Initialize events when the script loads
initEvents();
