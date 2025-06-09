// === script.js ===
const player = document.querySelector("#player");
const folderName = document.querySelector("#folderName");
const trackGrid = document.querySelector("#track-main .track-grid");
const compGrid = document.querySelector("#comp-main .track-grid")
const nowPlaying = document.querySelector("#nowPlaying");
const sidebar = document.querySelector(".sidebar");
const playBtn = document.querySelector("#playBtn");
const playProgBar = document.querySelector(".player-prog-bar");
const playTime = document.querySelector("#player-time");
const playDur = document.querySelector("#player-duration");
const sidebarCtrl = document.querySelector("#mobile-sidebar-controller");

const addToPlBtn = document.querySelector(".track-info-pl-add");
const plMenu = document.querySelector(".track-info-pl-menu");

const playlistGrid = document.querySelector("#playlists-main .track-grid");
const playlistInfoGrid = document.querySelector("#pl-info .track-grid");

const LS_PLAYLIST_ID = "playlists";
const LS_PLAYLIST_INIT_ID = "myplaylist-init-dev"; // Remove -dev before releasing

let prevScreen = null;

let playlistData = [];

let initPlaylistData = JSON.parse(localStorage.getItem(LS_PLAYLIST_INIT_ID)) || [];
function updateInitPlaylist(track, remove=false) {
  if (remove) {
    if (initPlaylistData.indexOf(track.id) !== -1) {
      initPlaylistData.splice(initPlaylistData.indexOf(track.id), 1);
    }
  } else {
    if (!initPlaylistData.includes(track.id)) {
      initPlaylistData.push(track.id);
    }
  }
  localStorage.setItem(LS_PLAYLIST_INIT_ID, JSON.stringify(initPlaylistData));
}

/* Main Divs */
const infoView = document.querySelector("#info-main");
const trackView = document.querySelector("#track-main");
const compView = document.querySelector("#comp-main");
const plView = document.querySelector("#playlists-main");
const plInfoView = document.querySelector("#pl-info");
const views = [infoView, trackView, compView, plView, plInfoView];
const showView = (view) => {
  for (v of views) {
    v?.classList.remove("active");
  }
  view?.classList.add("active");
};

const trackToArtist = (track, category=null) => {
  let artistText = (track.mainArtist?.join(", ") || category?.mainArtist?.join(", ") || "Unknown Artist");
  let featText = (track.featArtist?.join(", ") || category?.featArtist?.join(", ") || "");
  if (featText) {
    featText = ` (ft. ${featText})`;
  }
  return `${artistText}${featText}`;
}

let objUrl = ""; // ObjectURL of the Blob audio

let trackIsLoading = false; // prevent double-loads

let infoPlayListener = null; // Info-screen Play Button

let infoPlAddInitBtnListener = null; // Infoscreen Add to Playlist [init] button

/* Play Track Func */
const playTrack = (track) => {
  if (track.notReady) {
    alert("❌ This track isn't downloaded yet.");
    return;
  }

  if (trackIsLoading) {
    alert("Sorry, track is still loading. Please wait for the track to load.");
    return;
  }

  trackIsLoading = true;

  const srcLink = `./tracks/Tk${track.id}.${track.file.split(".").findLast(()=>true)}`;
  
  playBtn.classList.add("loading-btn");
  const audioIsPaused = player.paused;
  pauseAudio();
  fetch(srcLink)
    .catch((reject) => {
      alert("Sorry, network error. Audio cannot be fetched.");
      throw new Error("Fetch error");
    })
    .then((result) => {
      console.log(result);
      if (!result.ok) {
        alert(`Sorry, file cannot be found, HTTP ${result.status} ${result.statusText}. Audio cannot be fetched.`);
        throw new Error("HTTP error");
      }
      console.log("Received fetch result, running blob() (this may take a while)...");
      return result.blob();
    })
    .catch((reject) => {
      if (reject.message === "Fetch error" || reject.message === "HTTP error") {
        throw reject;
      }
      alert("Sorry, file error. Audio cannot be fetched.");
      throw new Error("Audio file error");
    })
    .then((result) => {
      console.log(result);
      console.log("Received blob...");
      if (result.size === 0) {
        alert("Sorry, blob error. Audio cannot be fetched.")
        throw new Error("Blob error");
      }
      nowPlaying.textContent = "🎶 " + track.name;
      nowPlaying.classList.remove("not-playing");
      // if (objUrl) URL.revokeObjectURL(objUrl);
      if (!blobLinks[track.id]) {
        objUrl = URL.createObjectURL(result);
        console.log(objUrl);
        blobLinks[track.id] = objUrl;
      } else {
        objUrl = blobLinks[track.id];
      }
      player.src = objUrl;
      player.pause();
      
      player.currentTime = 0;
      playProgBar.style.backgroundImage = "linear-gradient(to right, var(--accent-color) 0% 0%, #999999 0% 100%)";
      
      
      playAudio();
      return true;
    })
    .catch((reject) => {
      console.error(reject);
      return false;
    })
    .finally(() => {
      playBtn.classList.remove("loading-btn");
      trackIsLoading = false;
      if (!audioIsPaused) {
        playAudio();
      }
    });
}

/* Load Playlists Func */
const loadPlaylists = () => {
  playlistGrid.innerHTML = "";
  for (let pl of playlistData) {
    const plEntry = document.createElement("div");
    plEntry.classList.add("track");
    const plTitle = document.createElement("div");
    plTitle.classList.add("track-title");
    plTitle.textContent = pl.title || " ";
    plEntry.append(plTitle);
    playlistGrid.append(plEntry);
  }
}
const newPlaylist = (plTitle) => {
  const plObj = {
    title: plTitle,
    tracks: []
  };
  const plData = JSON.parse(localStorage.getItem(LS_PLAYLIST_ID)) || [];
  console.log(plData);
  plData.unshift(plObj);
  localStorage.setItem(LS_PLAYLIST_ID, JSON.stringify(plData));
  playlistData = plData;
  loadPlaylists(plData);
}

function updatePlAddMenu(track) {
  playlistData = JSON.parse(localStorage.getItem(LS_PLAYLIST_ID)) || [];
  if (!track) {
    track = { id: Symbol() }; // Ensure it will not match
  }  
  plMenu.innerHTML = "";
  for (let playlist of playlistData) {
    const option = document.createElement("div");
    option.classList.add("pl-menu-option");
    const optText = document.createElement("div");
    optText.classList.add("pl-menu-opt-name");
    optText.textContent = playlist.title;
    const optTick = document.createElement("div");
    optTick.classList.add("pl-menu-opt-tick");
    if (playlist.tracks.includes(track.id)) {
      optTick.classList.add("selected");
    }
    option.append(optText, optTick);
    plMenu.append(option);

    option.addEventListener("click", () => {
      let thisPlaylist = playlistData.find(x=>x.title===playlist.title);
      if (thisPlaylist.tracks.includes(track.id)) {
        // add a tick (TODO)
      }
    })
  }
}

function initPlAddBtnSwap(track) {
  document.querySelector(".track-info-pl-add-text").textContent = initPlaylistData.includes(track.id) ? "Remove from Playlist" : "Add to Playlist";
  document.querySelector(".track-info-pl-add-btn").classList.toggle("remove", initPlaylistData.includes(track.id));
}

/* Gen Tracks Func */
const generateTracks = (trackGrid, track, category, removeFunc) => {
  const card = document.createElement("div");
  card.classList.add("track");

  const title = document.createElement("div");
  title.classList.add("track-title");
  title.innerHTML = "&nbsp;";
  title.append(track.name); // prevent XSS

  const artist = document.createElement("div");
  artist.classList.add("track-artist");
  artist.innerHTML = "&nbsp";
  artist.append(trackToArtist(track, category));

  const menuBtn = document.createElement("div");
  menuBtn.textContent = "⋮";
  menuBtn.textContent = "i";
  menuBtn.classList.add("track-menu-btn");

  menuBtn.addEventListener("click", () => {
    trackInfo(track, category);
  });

  card.append(title, artist, menuBtn);

  const noClickBtns = [menuBtn];

  if (removeFunc) {
    const remBtn = document.createElement("div");
    remBtn.textContent = "X";
    remBtn.classList.add("pl-remove-track-btn");
    remBtn.addEventListener("click", (ev) => { removeFunc(ev); });
    card.append(remBtn);
    noClickBtns.push(remBtn);
  }

  // card.append(menuBtn);

  card.addEventListener("click", (ev) => {
    if (!noClickBtns.includes(ev.target)) playTrack(track);
  });

  trackGrid.append(card);
}

const secToFull = function(secs) {
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs - (hrs * 60)) / 60);
  secs = Math.floor(secs - (mins * 60) - (hrs * 3600));
  if (hrs) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  } else {
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
};

const playAudio = function() {
  player.play();
  playBtn.classList.add("display-pause");
}
const pauseAudio = function() {
  player.pause();
  playBtn.classList.remove("display-pause");
}

let myPlaylist = [];

let jsonLibrary = null;
let fetchConcluded = false;
let fetchError = null;
let blobLinks = {};


fetch("./library.json")
  .catch((reject) => {
    alert("Sorry, network error. Library cannot be fetched.");
    throw new Error("Fetch error");
  })
  .then((result) => {
    return result.json();
  })
  .catch((reject) => {
    if (reject.message === "Fetch error") {
      throw reject;
    }
    alert("Sorry, file error. Library cannot be fetched.");
    throw new Error("JSON file error");
  })
  .then((result) => {
    jsonLibrary = result;
    fetchConcluded = true;

    // Add stuff to sidebar
    console.log(jsonLibrary);
    for (let [catId, catDetail] of Object.entries(jsonLibrary.categories)) {
      if (!catDetail.defaultHidden || ((new URL(location.href).searchParams.get("forceshow") !== null) && !catDetail.forcedHidden)) {
        /* Create tracks for comp grid */
        let sidebarItem = document.createElement("div");
        sidebarItem.classList.add("comp-tile");
        let sidebarItemLabel = document.createElement("div");
        sidebarItemLabel.classList.add("track-title");
        sidebarItemLabel.append(catDetail.name);
        sidebarItem.append(sidebarItemLabel);
        sidebarItem.addEventListener("click", function() {
          loadFolder(catId);
        });

        let logoBox = document.createElement("div");
        logoBox.classList.add("cover-image");
        console.log(catDetail.logo);
        if (catDetail.logo?.url) {
          let logoImg = document.createElement("div");
          logoImg.classList.add("cover-img-pic");
          logoImg.style.backgroundImage = `url(${catDetail.logo.url})`;
          logoBox.append(logoImg);
        } else if (catDetail.logo?.char) {
          let logoChar = document.createElement("div");
          logoChar.classList.add("cover-char");
          logoChar.append(catDetail.logo?.char ?? "🎶");
          logoBox.append(logoChar);
        } else {
          logoBox.innerHTML = "&nbsp;";
        }

        sidebarItem.prepend(logoBox);

        compGrid.append(sidebarItem);
      }
    }

    for (let {id} of jsonLibrary.tracks) {
      blobLinks[id] = null;
    }

  })
  .catch((reject) => {
    fetchError = reject;
    fetchConcluded = true;
  });

function loadFolder(folderID) {
  console.log(folderID);
  showView(trackView);

  folderID = folderID.toString();
  trackGrid.innerHTML = "";

  let category = jsonLibrary.categories[folderID];
  if (!category) {
    alert("Category not found")
    return false;
  }
  let catName = category.name || `Category <${folderID}>`;
  folderName.textContent = catName;

  let catTracks = jsonLibrary.tracks.filter((track) => track.cat.some((id) => id.toString() === folderID));

  catTracks.forEach(track => {
    const card = document.createElement("div");
    card.classList.add("track");

    const title = document.createElement("div");
    title.classList.add("track-title");
    title.innerHTML = "&nbsp;";
    title.append(track.name); // prevent XSS

    const artist = document.createElement("div");
    artist.classList.add("track-artist");
    artist.innerHTML = "&nbsp";
    artist.append(trackToArtist(track, category));

    const menuBtn = document.createElement("div");
    menuBtn.textContent = "⋮";
    menuBtn.textContent = "i";
    //menuBtn.textContent = "More info >";
    menuBtn.classList.add("track-menu-btn");

    /* const menu = document.createElement("div");
    menu.style.cssText = "display: none; position: absolute; background: #222; color: #fff; padding: 6px; border: 1px solid #555; border-radius: 5px; z-index: 999;";

    if (folderID !== "🎿 My Playlist") {
      menu.innerHTML = "<div class='menu-add' style='cursor:pointer;'>Add to My Playlist</div>";
      menu.querySelector(".menu-add").onclick = () => {
        myPlaylist.push(track);
        alert(`✅ Added \"${track.name}\" to your playlist!`);
        menu.style.display = "none";
      };
    }

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll('.menu').forEach(m => m.style.display = "none");
      menu.style.display = "block";

      const rect = menuBtn.getBoundingClientRect();
      menu.style.position = "absolute";
      menu.style.left = rect.left + "px";
      menu.style.top = rect.bottom + "px";
    }); */

    menuBtn.addEventListener("click", () => {prevScreen = trackView; trackInfo(track, category);});

    card.append(title, artist, menuBtn)

    card.addEventListener("click", (ev) => {
      /* if (track.notReady) {
        alert("❌ This track isn't downloaded yet.");
        return;
      }

      if (trackIsLoading) {
        alert("Sorry, track is still loading. Please wait for the track to load.");
        return;
      }

      trackIsLoading = true;

      const srcLink = `./tracks/Tk${track.id}.${track.file.split(".").findLast(()=>true)}`;
      
      playBtn.classList.add("loading-btn");
      const audioIsPaused = player.paused;
      pauseAudio();
      fetch(srcLink)
        .catch((reject) => {
          alert("Sorry, network error. Audio cannot be fetched.");
          throw new Error("Fetch error");
        })
        .then((result) => {
          console.log(result);
          if (!result.ok) {
            alert(`Sorry, file cannot be found, HTTP ${result.status} ${result.statusText}. Audio cannot be fetched.`);
            throw new Error("HTTP error");
          }
          console.log("Received fetch result, running blob() (this may take a while)...");
          return result.blob();
        })
        .catch((reject) => {
          if (reject.message === "Fetch error" || reject.message === "HTTP error") {
            throw reject;
          }
          alert("Sorry, file error. Audio cannot be fetched.");
          throw new Error("Audio file error");
        })
        .then((result) => {
          console.log(result);
          console.log("Received blob...");
          if (result.size === 0) {
            alert("Sorry, blob error. Audio cannot be fetched.")
            throw new Error("Blob error");
          }
          nowPlaying.textContent = "🎶 " + track.name;
          nowPlaying.classList.remove("not-playing");
          // if (objUrl) URL.revokeObjectURL(objUrl);
          if (!blobLinks[track.id]) {
            objUrl = URL.createObjectURL(result);
            console.log(objUrl);
            blobLinks[track.id] = objUrl;
          } else {
            objUrl = blobLinks[track.id];
          }
          player.src = objUrl;
          player.pause();
          
          player.currentTime = 0;
          playProgBar.style.backgroundImage = "linear-gradient(to right, var(--accent-color) 0% 0%, #999999 0% 100%)";
          
          
          playAudio();
          return true;
        })
        .catch((reject) => {
          console.error(reject);
          return false;
        })
        .finally(() => {
          playBtn.classList.remove("loading-btn");
          trackIsLoading = false;
          if (!audioIsPaused) {
            playAudio();
          }
        });
    });

    card.appendChild(title);
    card.appendChild(artist);
    card.appendChild(menuBtn);
    card.appendChild(menu);
    menu.classList.add("menu");
    trackGrid.appendChild(card);

    sidebar.classList.remove("mobile-visible"); */
      if (ev.target !== menuBtn) playTrack(track);
    });

    trackGrid.append(card);
  });
    
}

function trackInfo(track, category=null) {
  showView(infoView);
  document.querySelector(".track-name-info").textContent = track.name;
  document.querySelector(".track-artist-info").textContent = trackToArtist(track, category);
  if (track.coverImg) {
    document.querySelector(".track-cover").style.backgroundImage = `url(${track.coverImg.url})`;
    document.querySelector(".track-cover").classList.add("has-img");
  } else {
    document.querySelector(".track-cover").classList.remove("has-img");
  }
  const playBtn = document.querySelector(".track-info-play");
  if (infoPlayListener) {
    playBtn.removeEventListener("click", infoPlayListener);
  }
  infoPlayListener = () => {
    playTrack(track);
  }
  playBtn.addEventListener("click", infoPlayListener);

  updatePlAddMenu(track);
  initPlAddBtnSwap(track);

  if (infoPlAddInitBtnListener) {
    addToPlBtn.removeEventListener("click", infoPlAddInitBtnListener);
  }
  infoPlAddInitBtnListener = () => {
    if (initPlaylistData.includes(track.id)) {
      updateInitPlaylist(track, true);
    } else {
      updateInitPlaylist(track, false);
    }
    initPlAddBtnSwap(track);
  };
  addToPlBtn.addEventListener("click", infoPlAddInitBtnListener);
}

/* document.addEventListener("click", () => {
  document.querySelectorAll('.menu').forEach(m => m.style.display = "none");
}); */

sidebarCtrl.addEventListener("click", function() {
  sidebar.classList.toggle("mobile-visible");
});

playBtn.addEventListener("click", function() {
  if (!player.src) return false;

  if (player.paused) playAudio();
  else pauseAudio();
});

playProgBar.addEventListener("click", function(ev) {
  if (player.src) {
    const ratioMoved = ev.offsetX / playProgBar.clientWidth;
    player.currentTime = ratioMoved * player.duration;
  }
})

setInterval(function() {
  if (!player.src) return;
  const currTime = player.currentTime;
  const durTime = player.duration;
  playTime.textContent = secToFull(currTime);
  playDur.textContent = secToFull(durTime);
  const timePercent = currTime / durTime * 100;
  playProgBar.style.backgroundImage = `linear-gradient(to right, var(--accent-color) 0% ${timePercent}%, #999999 ${timePercent}% 100%)`;
  if (player.paused) {
    playBtn.classList.remove("display-pause");
  } else {
    playBtn.classList.add("display-pause");
  }
}, 500);

document.querySelector("#info-main .go-back-button").addEventListener("click", () => {
  showView(prevScreen || trackView);
  initShowPlaylist();
})

document.querySelector("#track-main .go-back-button").addEventListener("click", () => {
  showView(compView);
})

/* Playlists */
playlistData = JSON.parse(localStorage.getItem(LS_PLAYLIST_ID));
if (!playlistData) {
  playlistData = [];
  localStorage.setItem(LS_PLAYLIST_ID, JSON.stringify(playlistData));
}
loadPlaylists(playlistData);

document.querySelector("#new-pl-btn").addEventListener("click", () => {
  newPlaylist(`Playlist ${playlistData.length + 1}`);
});

function initShowPlaylist() {
  playlistInfoGrid.innerHTML = "";
  for (let trk of initPlaylistData) {
    jsonTrk = jsonLibrary.tracks.find(x=>x.id===trk);
    generateTracks(playlistInfoGrid, jsonTrk, null, ()=>{
      updateInitPlaylist(jsonTrk,true);
      initShowPlaylist();
    });
  }
  prevScreen = plInfoView;
}