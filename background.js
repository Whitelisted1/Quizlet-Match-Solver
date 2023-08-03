async function getData(key){ return new Promise(resolve => { chrome.storage.local.get(key, function (data) { resolve(Object.values(data)[0]); }); }); }
async function storeData(key, value){ await chrome.storage.local.set({[key]: value}); }

async function getMultipleDataValues(keys){ return new Promise(resolve => { chrome.storage.local.get(keys, function (data) { resolve(data); }); }) }
async function storeMultipleDataValues(keys){ await chrome.storage.local.set(keys); }

const settingsKeys = [
    'defaultTargetTime',
    'accurateTime'
];

const settingsDefaultValues = [
    3000,
    false
];

// for debugging and identifying logs
LOGGING = console.log
console.log = (text) => {
    if (typeof text == "string") {
        LOGGING("[Quizlet Match Solver] " + text.toString());
    } else {
        LOGGING(text);
    }
}


console.log('Loading Quizlet match solver ...');

// Constants for testing purposes. Might be added into a settings menu at a later date
const autoStart = false;

// The path of the window. Used to identify if this is a match game
const path = window.location.pathname;
console.log(path);

// Force the user to go to /micromatch, which has clickable cards instead of draggable cards
if (path.endsWith("/match")) {
    window.location = path.replace("/match", "/micromatch");
}

// Only continue if the website ends with /micromatch.
// Wraps the rest of the script as actually ending execution of a javascript file involves raising an error
if (path.endsWith('/micromatch')) {

thisID = path.split("/")[1];

// Wait for a specific amount of ms
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Modified version of https://gist.github.com/Explosion-Scratch/154792ea7faf4254c9abdcd771e68868
// Get the matching word and definition for each card
async function getQuizletCards(id){
    // Fetch the cards from Quizlet, asking for the maximum number of possible cards in a set (1000)
    let res = await fetch(`https://quizlet.com/webapi/3.4/studiable-item-documents?filters%5BstudiableContainerId%5D=${id}&filters%5BstudiableContainerType%5D=1&perPage=1000&page=1`).then(res => res.json());

    return [...res.responses[0].models.studiableItem]; // Return the results
}

// Get local settings
async function getSettings() {
    settings = await getMultipleDataValues(settingsKeys);

    for (var i = 0; i < settingsKeys.length; i++) {
        thisKey = settingsKeys[i];
        thisValue = settings[thisKey];
        if (thisValue == undefined) {
            settings[thisKey] = settingsDefaultValues[i];
            await storeData(thisKey, thisValue);
        }
    }

    return settings;
}

// Main loop. Loops through tiles and finds their counterpart, then clicks them both.
async function matchGame(targetTime){
    targetUnix = Date.now() + targetTime;

    if (settings['accurateTime']) {
        await delay( targetTime );
    }

    // Just so we don't freeze the browser somehow
    iterations = 20;
    while (true) {
        iterations--;
        if (iterations == 0) return;

        gameboard = [];
        gameboardTilesList = [];
        
        // Get the current tiles
        gameboardTiles = document.getElementsByClassName('MatchModeQuestionGridBoard-tiles')[0].childNodes;
        if (gameboardTiles == undefined) {
            console.log("No child nodes ... ");
            break;
        }
        
        // Loop through the tiles and allow us to use the information from them
        for (var y = 0; y < gameboardTiles.length; y++) {
            if (gameboardTiles[y].innerHTML == "") {
                // console.log(gameboardTiles[y] + " tile is empty");
                continue; // If the element is empty (it already clicked this element), then skip it
            }

            if (gameboardTiles[y].firstChild.classList.contains('is-correct')) {
                // console.log(gameboardTiles[y] + " is correct");
                continue;
            }
            
            // Add the values to the tiles list and the current gameboard
            gameboardTilesList.push(gameboardTiles[y]);
            gameboard.push(gameboardTiles[y].firstElementChild.innerText);
        }
        
        // The gameboard is empty, so we don't have any more cards to click
        if (gameboard.length === 0) {
            console.log("Gameboard is empty ...");
            break;
        }

        console.log(gameboard);

        console.log("Working Tile: ", gameboard[0])
        // firstTile = getElementFromAriaLabel(gameboard[0], "div"); // Fetch the first card
        firstTile = gameboardTilesList[0].firstChild.firstChild.firstChild; // Get the first card using the first element in the gameboardTiles list
        
        matchingCardText = findMatchingCard(gameboard[0]); // Get the word/definition's text
        matchingTile = getElementFromAriaLabel(matchingCardText, "div"); // Get the card with the text
        
        // we can't find the matching card, perhaps the card has an image. Currently, we are unable to use this
        if (matchingTile == null || firstTile == null) {
            console.warn("Unabled to complete Quizlet Matching ... exiting ...");
            return; // welp, we tried
        }

        // Click both the first and second tile
        firstTile.parentElement.parentElement.dispatchEvent(new PointerEvent('pointerdown'));
        matchingTile.parentElement.parentElement.dispatchEvent(new PointerEvent('pointerdown'));

        // In order to get the target time
        if (!settings['accurateTime']) {
            await delay( (targetUnix - Date.now()) / ((gameboardTilesList.length-2)/2) );
        }
    }
}

// Given a text input, find the text of the matching word/definition
// Likely a better way to do this
function findMatchingCard(text){
    for (var i=0; i < definitions.length; i++){
        var thisDefinition = definitions[i];

        indexOfWord = thisDefinition.indexOf(text);

        if (indexOfWord != -1) {
            indexOfTargetWord = ((indexOfWord+1) % 2);
            return thisDefinition[indexOfTargetWord];
        }
    }
}

// Get elements with a specific aria-label (for getting card elements)
// Useful because querySelector doesn't allow newlines, and we don't have to filter the matching card's text
function getElementFromAriaLabel(text, elementType="div") {
    const divElements = Array.from(document.querySelectorAll(elementType));

    for (var i = 0; i < divElements.length; i++) {
        element = divElements[i];
        if (!element.hasAttribute("aria-label")) continue;

        if (element.getAttribute("aria-label") == text) {
            return element;
        }
    }

    console.warn(`Unable to find element with aria-label of "${text}"`);
    return null;
}

// Actually wait for the window to load and then continue
window.addEventListener('load', async() => {
    console.log("Window loaded");

    settings = await getSettings();

    let startButton = document.querySelector('button[aria-label="Start game"]');
    shouldStartGame = startButton != null;

    // Add the "Fetching cards ..." text under the "Start game" button
    if (shouldStartGame) {
        startButton.setAttribute("disabled", ""); // Don't allow the user to click the start button

        solverStatusText = document.createElement("span");
        solverStatusText.innerText = "Fetching cards";
    
        solverStatusText.classList.add("matchSolverText"); // "Fetching cards" text
        solverStatusText.classList.add("thinking"); // Blinking cursor animation

        targetTimeInput = document.createElement("input"); // Target time for solving the quizlet
        targetTimeInput.type = "number";
        targetTimeInput.min = "500";
        targetTimeInput.value = settings['defaultTargetTime'];
        targetTimeInput.placeholder = "2000";
        targetTimeInput.style.width = "64px";

        targetTimeInput.addEventListener("change", (e)=> {
            if (e.target.value == "") e.target.value = "2000";
            else if (parseInt(e.target.value) < 500) e.target.value = "500";
        });

        targetTimeInputLabel = document.createElement("span");
        targetTimeInputLabel.innerText = "Target Time: ";
        targetTimeInputLabel.title = "How long should the Quizlet take to solve?";

        targetTimeInputLabel2 = document.createElement("span");
        targetTimeInputLabel2.innerText = " ms";
        targetTimeInputLabel2.title = "Time in milliseconds (1 second = 1000 ms)";

        startButtonContainer = startButton.parentElement.parentElement;
        startButtonContainer.appendChild(solverStatusText); // Actually display the text
        startButtonContainer.appendChild(document.createElement("br"));
        startButtonContainer.appendChild(targetTimeInputLabel);
        startButtonContainer.appendChild(targetTimeInput);
        startButtonContainer.appendChild(targetTimeInputLabel2);
    }
    
    console.log("Fetching quizlet match answers ...");

    // Grab the Quizlet cards and add them to the definitions list. This makes it so the user doesn't have to do this manually
    quizletMatchInfo = await getQuizletCards(thisID);
    
    definitions = [];
    for (var i = 0; i < quizletMatchInfo.length; i++) {
        thisItem = quizletMatchInfo[i];

        if (thisItem.isDeleted) continue;
        
        definitions.push([ thisItem.cardSides[0].media[0].plainText, thisItem.cardSides[1].media[0].plainText ]);
    }
    console.log(definitions);
    
    // If the start button isn't there, that means the user might have already clicked it.
    // If the button hasn't been clicked, we wait for the button to be clicked and then continue with the program
    if (shouldStartGame) {
        solverStatusText.innerHTML = "Fetched cards &check;" // Let the user know we fetched the cards
        solverStatusText.classList.remove("thinking");

        startButton.removeAttribute("disabled"); // Allow the user to click the start button
        
        if (autoStart) {
            startButton.click(); // Start the game
        } else {
            // Wait for the button to be clicked, and then continue
            waitForButtonClick = async function (element) {
                return new Promise((resolve, reject) => {
                    element.addEventListener("click", () => {
                        resolve();
                    });
                });
            }
            
            await waitForButtonClick(startButton);
            
            console.log("Start button clicked");
        }
        

        await delay(1); // Allow time for the button to fade away before continuing 
    }

    // Start the main loop of clicking each tile
    await matchGame(parseInt(targetTimeInput.value));

    console.log("Finished with matching tiles");
});

}