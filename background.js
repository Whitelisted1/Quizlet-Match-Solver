function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

    console.error(`Unable to find elemnt with aria-label of "${text}"`);
    return null;
}

console.log('Loading Quizlet match solver ...');

const path = window.location.pathname;
console.log(path);

// Only continue if the website ends with /match.
// Wraps the rest of the script as actually ending execution of a javascript file involves raising an error
if (path.endsWith('/match')) {

thisID = path.split("/")[1];

// https://www.thiscodeworks.com/get-quizlet-flashcards-via-api/61bbc4382e046e00150bd05b
async function getQuizletCards(id){
    let res = await fetch(`https://quizlet.com/webapi/3.4/studiable-item-documents?filters%5BstudiableContainerId%5D=${id}&filters%5BstudiableContainerType%5D=1&perPage=5&page=1`).then(res => res.json())

    let currentLength = 5;
    let token = res.responses[0].paging.token
    let terms = res.responses[0].models.studiableItem;
    let page = 2;

    while (currentLength >= 5){
        let res = await fetch(`https://quizlet.com/webapi/3.4/studiable-item-documents?filters%5BstudiableContainerId%5D=${id}&filters%5BstudiableContainerType%5D=1&perPage=5&page=${page++}&pagingToken=${token}`).then(res => res.json());
        terms.push(...res.responses[0].models.studiableItem);
        currentLength = res.responses[0].models.studiableItem.length;
        token = res.responses[0].paging.token;
    }

    return terms;
}

let running = true;
window.addEventListener('load', async() => {
    console.log("Window loaded");

    let startButton = document.querySelector('button[aria-label="Start game"]')
    shouldStartGame = startButton != null;

    if (shouldStartGame) {
        solverStatusText = document.createElement("span");
        solverStatusText.innerText = "Fetching cards";
    
        solverStatusText.classList.add("matchSolverText");
        solverStatusText.classList.add("thinking");
    
        startButton.parentElement.parentElement.appendChild(solverStatusText);
        startButton.setAttribute("disabled", "");
    
        console.log("Fetching quizlet match answers ...");
    }


    // Grab the Quizlet cards and add them to the definitions list. This makes it so the user doesn't have to do this manually
    quizletMatchInfo = await getQuizletCards(thisID);
    
    definitions = [];

    for (var i = 0; i < quizletMatchInfo.length; i++) {
        thisItem = quizletMatchInfo[i];

        if (thisItem.isDeleted) continue;
        
        definitions.push([ thisItem.cardSides[0].media[0].plainText, thisItem.cardSides[1].media[0].plainText ])
    }

    console.log(definitions);
    
    if (shouldStartGame) {
        solverStatusText.innerHTML = "Fetched cards &check;"
        solverStatusText.classList.remove("thinking");

        startButton.removeAttribute("disabled");
        
        waitForButtonClick = async function (element) {
            return new Promise((resolve, reject) => {
                element.addEventListener("click", () => {
                    resolve();
                });
            });
        }
        
        await waitForButtonClick(startButton);
        
        console.log("Start button clicked");

        await delay(1); // Allow time for the button to fade away before continuing 
    }


    // Main loop. Loops through tiles and finds their counterpart, then clicks them both.
    while (running) {
        console.log('updating ...');
        
        gameboard = [];
        gameboardTilesList = [];
        
        // Get the tiles
        gameboardTiles = document.getElementsByClassName('MatchModeQuestionGridBoard-tiles')[0].childNodes;
        if (gameboardTiles == undefined) {
            console.log("No child nodes ... ");
            break;
        }
        
        for (var y = 0; y < gameboardTiles.length; y++) {
            if (gameboardTiles[y].innerHTML == "") {
                console.log(gameboardTiles[y] + " tile is empty");
                continue; // If the element is empty (it already clicked this element), then skip it
            }
            
            gameboardTilesList.push(gameboardTiles[y]);
            gameboard.push(gameboardTiles[y].firstElementChild.innerText);
        }
        
        if (gameboard.length === 0) {
            console.log("Gameboard is empty ...");
            running = false;
            continue;
        }

        console.log(gameboard);

        console.log("Working Tile: ", gameboard[0])
        firstTile = getElementFromAriaLabel(gameboard[0], "div");
        firstTile.parentElement.parentElement.dispatchEvent(new PointerEvent('pointerdown')); // Essentially click the element
        
        matchingCardText = findMatchingCard(gameboard[0])
        matchingTile = getElementFromAriaLabel(matchingCardText, "div");

        // we can't find the matching card, perhaps the card has an image
        if (matchingTile == null) {
            return; // welp, we tried
        }

        matchingTile.parentElement.parentElement.dispatchEvent(new PointerEvent('pointerdown'));
        
        await waitUntilNoHTML(gameboardTilesList[0]);
        // await delay(5);
    }

    console.log("No longer running loop");
});


function matchGame(){
    
}

// watch an element until it is blank. Used for waiting for cards to disappear.
async function waitUntilNoHTML(element) {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver((mutationsList) => {
            const hasInnerHTMLChanged = mutationsList.some(
                (mutation) => mutation.type === 'childList' && mutation.target === element
            );

            if (hasInnerHTMLChanged) {
                if (element.innerHTML == "") {
                    console.log("innerHTML is now blank");
                    observer.disconnect();
                    resolve();
                }
            }
        });

        // Configure and start observing the target element
        observer.observe(element, { childList: true, subtree: true });

        // Check initial state
        if (element.innerHTML === "") {
            observer.disconnect();
            resolve();
        }
    });
}

// Given a text input, find the text of the matching word/definition
function findMatchingCard(text){
    for (var i=0; i < definitions.length; i++){
        var thisDefinition = definitions[i];

        indexOfWord = thisDefinition.indexOf(text);

        if (indexOfWord != -1) {
            indexOfTargetWord = ((indexOfWord+1) % 2);
            // console.log(indexOfWord, indexOfTargetWord, thisDefinition[indexOfTargetWord]);
            return thisDefinition[indexOfTargetWord];
        }
    }
}

}   